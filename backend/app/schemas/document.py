import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import Classification, CustodyStatus, DocumentStatus, DocumentType, IntegrityStatus
from app.schemas.common import ORMModel


class DocumentOut(ORMModel):
    id: uuid.UUID
    document_number: str
    case_id: uuid.UUID
    name: str
    document_type: DocumentType
    classification: Classification
    status: DocumentStatus
    current_version: int
    uploaded_by: uuid.UUID
    mime_type: str
    file_size: int
    sha256_hash: str
    integrity_status: IntegrityStatus
    digital_signature_valid: bool
    custody_status: CustodyStatus
    is_sealed: bool
    ai_summary: str
    created_at: datetime
    updated_at: datetime


class DocumentVersionOut(ORMModel):
    id: uuid.UUID
    version_number: int
    sha256_hash: str
    uploaded_by: uuid.UUID
    change_note: str
    created_at: datetime


class IntegrityVerifyResult(BaseModel):
    integrity_status: str
    original_hash: str
    current_hash: str
    match: bool
    verified_at: datetime
    verified_by: str
    requires_investigation: bool = False


class UploadProgressStep(BaseModel):
    step: str
    status: str
    detail: str = ""


class EmailVerificationRequestOut(BaseModel):
    sent: bool
    masked_email: str
    expires_in_minutes: int
    # Disclosed because no real SMTP delivery is configured in this prototype — see
    # app/security/email_verification.py. None once real email delivery is wired in.
    demo_code: str | None = None


class EmailVerificationConfirmIn(BaseModel):
    code: str


class EmailVerificationConfirmOut(BaseModel):
    verified: bool
    unlocked_until: datetime
