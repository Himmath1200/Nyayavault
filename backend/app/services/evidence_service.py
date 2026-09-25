from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.audit.service import record_event
from app.custody.service import add_custody_event
from app.models.enums import CustodyStatus
from app.models.evidence import EvidenceItem
from app.models.user import User


def transfer_evidence(db: Session, evidence: EvidenceItem, user: User, to_status: CustodyStatus, location: str, reason: str, client_meta: dict):
    evidence.custody_status = to_status
    db.commit()
    add_custody_event(db, evidence, user, f"TRANSFERRED_TO_{to_status.value}", location=location, reason=reason)
    record_event(
        db,
        "EVIDENCE_TRANSFER",
        actor=user,
        case_id=evidence.case_id,
        document_id=evidence.document_id,
        metadata={"evidence_number": evidence.evidence_number, "to_status": to_status.value, "location": location, "reason": reason},
        **client_meta,
    )
    return evidence


def verify_evidence(db: Session, evidence: EvidenceItem, user: User, match: bool, client_meta: dict):
    from app.models.enums import IntegrityStatus

    evidence.integrity_status = IntegrityStatus.VERIFIED if match else IntegrityStatus.FAILED
    evidence.last_verified_at = datetime.now(timezone.utc)
    evidence.last_verified_by = user.id
    db.commit()
    add_custody_event(db, evidence, user, "VERIFIED" if match else "VERIFICATION_FAILED", reason="Integrity check")
    return evidence
