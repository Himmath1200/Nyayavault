"""Simulated behavioural anomaly detection engine.

Tracks login time, download volume and failed login attempts and raises
SecurityAlert records when behaviour deviates from expected patterns. This is
a rule-based simulation appropriate for a prototype demo, not a production
UEBA system.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.audit.service import record_event
from app.models.access import AccessLog
from app.models.enums import AlertSeverity, AlertStatus
from app.models.security import SecurityAlert
from app.models.user import User
from app.models.verification import FailedLoginAttempt

DOWNLOAD_BURST_THRESHOLD = 15
DOWNLOAD_BURST_WINDOW_MINUTES = 10
FAILED_LOGIN_THRESHOLD = 3
FAILED_LOGIN_WINDOW_MINUTES = 10
UNUSUAL_HOUR_START = 23
UNUSUAL_HOUR_END = 5


def record_failed_login(db: Session, email: str) -> int:
    """Persisted (not in-memory) so the brute-force counter is correct even when requests
    for the same email are served by different serverless instances."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=FAILED_LOGIN_WINDOW_MINUTES)
    db.add(FailedLoginAttempt(email=email, attempted_at=now))
    db.commit()
    return db.execute(
        select(func.count()).select_from(FailedLoginAttempt).where(
            FailedLoginAttempt.email == email, FailedLoginAttempt.attempted_at >= window_start
        )
    ).scalar_one()


def clear_failed_logins(db: Session, email: str) -> None:
    db.execute(delete(FailedLoginAttempt).where(FailedLoginAttempt.email == email))
    db.commit()


def _create_alert(db: Session, user: User | None, risk_score: int, severity: AlertSeverity, event_summary: str, reasons: list[str], client_meta: dict) -> SecurityAlert:
    alert = SecurityAlert(
        user_id=user.id if user else None,
        risk_score=risk_score,
        severity=severity,
        event_summary=event_summary,
        reasons=reasons,
        detected_at=datetime.now(timezone.utc),
        status=AlertStatus.OPEN,
        ip_address=client_meta.get("ip_address", ""),
        device=client_meta.get("device", ""),
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    record_event(
        db,
        "SECURITY_ALERT",
        actor=user,
        metadata={"summary": event_summary, "risk_score": risk_score, "severity": severity.value},
        **client_meta,
    )
    return alert


def check_failed_login_anomaly(db: Session, email: str, user: User | None, client_meta: dict) -> SecurityAlert | None:
    count = record_failed_login(db, email)
    if count >= FAILED_LOGIN_THRESHOLD:
        return _create_alert(
            db,
            user,
            risk_score=min(60 + count * 8, 99),
            severity=AlertSeverity.HIGH,
            event_summary=f"{count} failed login attempts for {email}",
            reasons=["Repeated failed access", f"{count} attempts within {FAILED_LOGIN_WINDOW_MINUTES} minutes"],
            client_meta=client_meta,
        )
    return None


def check_login_time_anomaly(db: Session, user: User, client_meta: dict) -> SecurityAlert | None:
    hour = datetime.now(timezone.utc).hour
    if hour >= UNUSUAL_HOUR_START or hour < UNUSUAL_HOUR_END:
        return _create_alert(
            db,
            user,
            risk_score=55,
            severity=AlertSeverity.MEDIUM,
            event_summary=f"Login at unusual hour ({hour:02d}:00 UTC) by {user.full_name}",
            reasons=["Unusual access time", "Deviation from normal working-hours pattern"],
            client_meta=client_meta,
        )
    return None


def check_download_burst_anomaly(db: Session, user: User, client_meta: dict) -> SecurityAlert | None:
    window_start = datetime.now(timezone.utc) - timedelta(minutes=DOWNLOAD_BURST_WINDOW_MINUTES)
    count = db.execute(
        select(func.count()).select_from(AccessLog).where(
            AccessLog.user_id == user.id,
            AccessLog.action == "DOWNLOAD",
            AccessLog.granted.is_(True),
            AccessLog.created_at >= window_start,
        )
    ).scalar_one()
    if count >= DOWNLOAD_BURST_THRESHOLD:
        return _create_alert(
            db,
            user,
            risk_score=min(70 + count, 99),
            severity=AlertSeverity.CRITICAL,
            event_summary=f"{count} document downloads by {user.full_name} in {DOWNLOAD_BURST_WINDOW_MINUTES} minutes",
            reasons=["Mass download", "Sensitive documents", "Deviation from normal behaviour"],
            client_meta=client_meta,
        )
    return None


def resolve_alert(db: Session, alert: SecurityAlert, user: User, action: str, note: str, client_meta: dict) -> SecurityAlert:
    alert.status = AlertStatus.DISMISSED if action == "DISMISS" else AlertStatus.RESOLVED
    alert.resolved_by = user.id
    alert.resolution_note = note or action
    db.commit()
    db.refresh(alert)
    record_event(db, "SECURITY_ALERT_RESOLVED", actor=user, metadata={"alert_id": str(alert.id), "action": action}, **client_meta)
    return alert
