import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.common import ORMModel


class CertificateCreate(BaseModel):
    evidence_id: uuid.UUID


class CertificateOut(ORMModel):
    id: uuid.UUID
    certificate_number: str
    verification_id: str
    evidence_id: uuid.UUID
    document_id: uuid.UUID
    case_id: uuid.UUID
    issued_by: uuid.UUID
    issued_at: datetime
    hash_verified: bool
    custody_verified: bool
    signature_verified: bool
    audit_complete: bool
    snapshot: dict


class PublicVerificationOut(BaseModel):
    evidence_id: str
    document_type: str
    case_number: str
    integrity_status: str
    sha256_hash: str
    verification_timestamp: datetime
    certificate_id: str
    hash_verified: bool
    custody_verified: bool
    signature_verified: bool
    audit_complete: bool
    disclaimer: str = (
        "This certificate provides a technical verification record and does not constitute a "
        "legal determination regarding the underlying evidence."
    )
