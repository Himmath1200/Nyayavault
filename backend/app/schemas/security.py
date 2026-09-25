import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import AlertSeverity, AlertStatus
from app.schemas.common import ORMModel


class SecurityAlertOut(ORMModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    risk_score: int
    severity: AlertSeverity
    event_summary: str
    reasons: list[str]
    detected_at: datetime
    status: AlertStatus
    resolution_note: str
    ip_address: str
    device: str


class AlertResolveRequest(BaseModel):
    action: str  # LOCK_SESSION | REQUIRE_MFA | DISMISS | RESOLVE
    note: str = ""
