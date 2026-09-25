import random
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.audit.service import record_event
from app.models.document import Document
from app.models.evidence import EvidenceItem
from app.models.user import User
from app.models.verification import VerificationCertificate


def generate_certificate_number() -> str:
    return f"CERT-{datetime.now(timezone.utc).year}-{random.randint(100000, 999999)}"


def generate_verification_id() -> str:
    return uuid.uuid4().hex[:16].upper()


def issue_certificate(db: Session, evidence: EvidenceItem, document: Document, user: User, client_meta: dict) -> VerificationCertificate:
    from app.audit.service import verify_chain
    from app.models.case import Case

    chain_result = verify_chain(db)
    case = db.get(Case, document.case_id)
    cert = VerificationCertificate(
        certificate_number=generate_certificate_number(),
        verification_id=generate_verification_id(),
        evidence_id=evidence.id,
        document_id=document.id,
        case_id=document.case_id,
        issued_by=user.id,
        issued_at=datetime.now(timezone.utc),
        hash_verified=evidence.integrity_status.value == "VERIFIED",
        custody_verified=True,
        signature_verified=bool(evidence.digital_signature),
        audit_complete=chain_result["intact"],
        snapshot={
            "document_number": document.document_number,
            "evidence_number": evidence.evidence_number,
            "sha256_hash": evidence.sha256_hash,
            "document_type": document.document_type.value,
            "classification": document.classification.value,
            "case_number": case.case_number if case else str(document.case_id),
        },
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)
    record_event(
        db,
        "CERTIFICATE_GENERATED",
        actor=user,
        case_id=document.case_id,
        document_id=document.id,
        metadata={"certificate_number": cert.certificate_number, "verification_id": cert.verification_id},
        **client_meta,
    )
    return cert
