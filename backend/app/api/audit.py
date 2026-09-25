import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.service import verify_chain
from app.database.session import get_db
from app.models.audit import AuditEvent
from app.models.user import User
from app.schemas.audit import AuditEventOut, ChainIntegrityResult
from app.security.deps import require_permission
from app.security.rbac import Permission

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("", response_model=list[AuditEventOut])
def list_audit_events(
    case_id: uuid.UUID | None = None,
    action: str | None = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.AUDIT_VIEW)),
):
    stmt = select(AuditEvent)
    if case_id:
        stmt = stmt.where(AuditEvent.case_id == case_id)
    if action:
        stmt = stmt.where(AuditEvent.action == action)
    stmt = stmt.order_by(AuditEvent.timestamp.desc()).limit(min(limit, 1000))
    return db.execute(stmt).scalars().all()


@router.get("/chain-integrity", response_model=ChainIntegrityResult)
def chain_integrity(db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.AUDIT_VIEW))):
    return verify_chain(db)


@router.get("/{event_id}", response_model=AuditEventOut)
def get_audit_event(event_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.AUDIT_VIEW))):
    event = db.get(AuditEvent, event_id)
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Audit event not found")
    return event
