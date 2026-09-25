from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.audit import AuditEvent
from app.models.case import Case
from app.models.document import Document
from app.models.enums import AlertStatus, CaseStatus, IntegrityStatus
from app.models.evidence import EvidenceItem
from app.models.security import SecurityAlert
from app.models.user import User
from app.security.deps import require_permission
from app.security.rbac import Permission

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
def summary(db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.CASE_VIEW))):
    active_cases = db.execute(select(func.count()).select_from(Case).where(Case.status == CaseStatus.ACTIVE)).scalar_one()
    total_evidence = db.execute(select(func.count()).select_from(EvidenceItem)).scalar_one()
    verified_evidence = db.execute(select(func.count()).select_from(EvidenceItem).where(EvidenceItem.integrity_status == IntegrityStatus.VERIFIED)).scalar_one()
    integrity_pct = round((verified_evidence / total_evidence) * 100, 2) if total_evidence else 100.0
    open_alerts = db.execute(select(func.count()).select_from(SecurityAlert).where(SecurityAlert.status == AlertStatus.OPEN)).scalar_one()

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    documents_today = db.execute(select(func.count()).select_from(Document).where(Document.created_at >= today_start)).scalar_one()
    pending_verification = db.execute(select(func.count()).select_from(EvidenceItem).where(EvidenceItem.integrity_status == IntegrityStatus.UNVERIFIED)).scalar_one()

    custody_breakdown = db.execute(
        select(EvidenceItem.custody_status, func.count()).group_by(EvidenceItem.custody_status)
    ).all()

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    activity_by_day = db.execute(
        select(func.date(AuditEvent.timestamp), func.count()).where(AuditEvent.timestamp >= week_ago).group_by(func.date(AuditEvent.timestamp)).order_by(func.date(AuditEvent.timestamp))
    ).all()

    recent_events = db.execute(select(AuditEvent).order_by(AuditEvent.timestamp.desc()).limit(10)).scalars().all()

    return {
        "kpis": {
            "active_cases": active_cases,
            "evidence_items": total_evidence,
            "integrity_verified_pct": integrity_pct,
            "security_alerts": open_alerts,
            "documents_today": documents_today,
            "pending_verification": pending_verification,
        },
        "evidence_chain_status": [{"status": status.value, "count": count} for status, count in custody_breakdown],
        "case_activity": [{"date": str(d), "count": c} for d, c in activity_by_day],
        "recent_events": [
            {
                "id": str(e.id), "action": e.action, "actor_role": e.actor_role,
                "timestamp": e.timestamp.isoformat(), "metadata": e.metadata_json,
            }
            for e in recent_events
        ],
    }
