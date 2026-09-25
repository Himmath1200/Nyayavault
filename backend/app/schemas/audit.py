import uuid
from datetime import datetime

from app.schemas.common import ORMModel


class AuditEventOut(ORMModel):
    id: uuid.UUID
    timestamp: datetime
    actor_id: uuid.UUID | None
    actor_role: str
    action: str
    case_id: uuid.UUID | None
    document_id: uuid.UUID | None
    metadata_json: dict
    ip_address: str
    device: str
    previous_event_hash: str
    current_event_hash: str


class ChainIntegrityResult(ORMModel):
    intact: bool
    broken_at_event_id: str | None
    events_checked: int
