import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.service import record_event
from app.database.session import get_db
from app.models.access import AccessRequest
from app.models.enums import AccessRequestStatus, NotificationSeverity
from app.models.user import User
from app.schemas.access import AccessRequestCreate, AccessRequestDecision, AccessRequestOut
from app.security.deps import get_client_meta, require_permission
from app.security.rbac import Permission
from app.services.notification_service import notify

router = APIRouter(prefix="/api/access-requests", tags=["access"])


@router.get("", response_model=list[AccessRequestOut])
def list_access_requests(
    mine_only: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.ACCESS_REQUEST_CREATE)),
):
    stmt = select(AccessRequest)
    if mine_only:
        stmt = stmt.where(AccessRequest.requested_by == user.id)
    return db.execute(stmt.order_by(AccessRequest.created_at.desc())).scalars().all()


@router.post("", response_model=AccessRequestOut, status_code=status.HTTP_201_CREATED)
def create_access_request(
    payload: AccessRequestCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.ACCESS_REQUEST_CREATE)),
):
    req = AccessRequest(
        document_id=payload.document_id, requested_by=user.id, purpose=payload.purpose,
        action=payload.action, justification=payload.justification,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    record_event(db, "ACCESS_REQUESTED", actor=user, document_id=payload.document_id, metadata={"purpose": payload.purpose.value, "action": payload.action.value}, **get_client_meta(request))
    return req


@router.post("/{request_id}/decision", response_model=AccessRequestOut)
def decide_access_request(
    request_id: uuid.UUID,
    payload: AccessRequestDecision,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.ACCESS_REQUEST_APPROVE)),
):
    req = db.get(AccessRequest, request_id)
    if not req:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Access request not found")
    req.status = AccessRequestStatus.APPROVED if payload.approve else AccessRequestStatus.DENIED
    req.decided_by = user.id
    req.decided_at = datetime.now(timezone.utc)
    req.decision_note = payload.note
    db.commit()
    db.refresh(req)
    record_event(db, "ACCESS_GRANTED" if payload.approve else "ACCESS_DENIED", actor=user, document_id=req.document_id, metadata={"request_id": str(req.id)}, **get_client_meta(request))
    notify(
        db, req.requested_by,
        NotificationSeverity.SUCCESS if payload.approve else NotificationSeverity.WARNING,
        f"Access request {'approved' if payload.approve else 'denied'}",
        payload.note,
    )
    return req
