import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import CustodyStatus, IntegrityStatus
from app.schemas.common import ORMModel


class EvidenceOut(ORMModel):
    id: uuid.UUID
    evidence_number: str
    case_id: uuid.UUID
    document_id: uuid.UUID
    sha256_hash: str
    file_size: int
    mime_type: str
    document_version: int
    uploaded_by: uuid.UUID
    digital_signature: str
    integrity_status: IntegrityStatus
    custody_status: CustodyStatus
    last_verified_at: datetime | None
    last_verified_by: uuid.UUID | None
    created_at: datetime


class CustodyEventOut(ORMModel):
    id: uuid.UUID
    evidence_id: uuid.UUID
    actor_id: uuid.UUID
    actor_role: str
    action: str
    location: str
    reason: str
    document_hash: str
    previous_event_hash: str
    current_event_hash: str
    created_at: datetime


class EvidenceTransferRequest(BaseModel):
    to_custody_status: CustodyStatus
    location: str = ""
    reason: str = ""
