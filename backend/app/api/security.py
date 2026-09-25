import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.access import AccessLog
from app.models.enums import AlertStatus
from app.models.security import SecurityAlert
from app.models.user import User
from app.schemas.security import AlertResolveRequest, SecurityAlertOut
from app.security.deps import get_client_meta, require_permission
from app.security.rbac import Permission
from app.services.security_service import resolve_alert

router = APIRouter(prefix="/api/security", tags=["security"])


@router.get("/alerts", response_model=list[SecurityAlertOut])
def list_alerts(
    status_filter: AlertStatus | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.SECURITY_VIEW)),
):
    stmt = select(SecurityAlert)
    if status_filter:
        stmt = stmt.where(SecurityAlert.status == status_filter)
    return db.execute(stmt.order_by(SecurityAlert.detected_at.desc())).scalars().all()


@router.post("/alerts/{alert_id}/resolve", response_model=SecurityAlertOut)
def resolve(
    alert_id: uuid.UUID,
    payload: AlertResolveRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.SECURITY_RESOLVE)),
):
    alert = db.get(SecurityAlert, alert_id)
    if not alert:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Alert not found")
    return resolve_alert(db, alert, user, payload.action, payload.note, get_client_meta(request))


@router.get("/activity")
def recent_activity(db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.SECURITY_VIEW))):
    logs = db.execute(select(AccessLog).order_by(AccessLog.created_at.desc()).limit(100)).scalars().all()
    return [
        {
            "id": str(log.id), "user_id": str(log.user_id), "action": log.action, "granted": log.granted,
            "reasons": log.reasons, "ip_address": log.ip_address, "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]
