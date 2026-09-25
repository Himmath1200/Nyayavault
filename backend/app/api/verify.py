import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.audit.service import record_event
from app.database.session import get_db
from app.models.document import Document
from app.models.evidence import EvidenceItem
from app.models.user import User
from app.models.verification import VerificationCertificate
from app.schemas.verification import CertificateCreate, CertificateOut, PublicVerificationOut
from app.security.deps import get_client_meta, get_current_user, require_permission
from app.security.rbac import Permission
from app.services.verification_service import issue_certificate

router = APIRouter(tags=["verification"])


@router.get("/api/verify/search")
def search_verification(
    query: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.COURT_VERIFY)),
):
    evidence = db.execute(
        select(EvidenceItem).where(or_(EvidenceItem.evidence_number == query, EvidenceItem.sha256_hash == query))
    ).scalar_one_or_none()
    if not evidence:
        document = db.execute(select(Document).where(Document.document_number == query)).scalar_one_or_none()
        if document:
            evidence = db.execute(select(EvidenceItem).where(EvidenceItem.document_id == document.id)).scalar_one_or_none()
    if not evidence:
        cert = db.execute(select(VerificationCertificate).where(VerificationCertificate.verification_id == query)).scalar_one_or_none()
        if cert:
            evidence = db.get(EvidenceItem, cert.evidence_id)
    if not evidence:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No evidence found matching that identifier")

    document = db.get(Document, evidence.document_id)
    from app.audit.service import verify_chain
    from app.custody.service import get_custody_chain

    chain = get_custody_chain(db, evidence.id)
    audit_status = verify_chain(db)

    return {
        "evidence_id": evidence.evidence_number,
        "document_id": document.document_number,
        "case_id": str(document.case_id),
        "document_type": document.document_type.value,
        "sha256_hash": evidence.sha256_hash,
        "integrity_status": evidence.integrity_status.value,
        "digital_signature": evidence.digital_signature,
        "custody_verified": len(chain) > 0,
        "custody_events": len(chain),
        "audit_trail_complete": audit_status["intact"],
        "submission_status": evidence.custody_status.value,
    }


@router.get("/api/verify/{verification_id}", response_model=PublicVerificationOut)
def public_verify(verification_id: str, db: Session = Depends(get_db)):
    """Public endpoint — reached via the QR code on a printed certificate. Returns only
    safe verification metadata, never confidential document contents."""
    cert = db.execute(select(VerificationCertificate).where(VerificationCertificate.verification_id == verification_id)).scalar_one_or_none()
    if not cert:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Verification record not found")
    evidence = db.get(EvidenceItem, cert.evidence_id)
    document = db.get(Document, cert.document_id)
    return PublicVerificationOut(
        evidence_id=evidence.evidence_number,
        document_type=document.document_type.value,
        case_number=cert.snapshot.get("case_number", str(cert.case_id)),
        integrity_status=evidence.integrity_status.value,
        sha256_hash=evidence.sha256_hash,
        verification_timestamp=cert.issued_at,
        certificate_id=cert.certificate_number,
        hash_verified=cert.hash_verified,
        custody_verified=cert.custody_verified,
        signature_verified=cert.signature_verified,
        audit_complete=cert.audit_complete,
    )


@router.get("/api/verify/{verification_id}/resolve")
def resolve_verification(
    verification_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Reached only after a viewer signs in from the public QR page. Resolves the printed
    verification ID to real object identifiers so the frontend can open the document through
    the normal, permission-checked document endpoints — this endpoint itself only requires an
    authenticated session, not any particular role, and never returns document content or the
    zero-trust access decision (that still happens downstream via the standard document APIs)."""
    cert = db.execute(select(VerificationCertificate).where(VerificationCertificate.verification_id == verification_id)).scalar_one_or_none()
    if not cert:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Verification record not found")
    record_event(
        db, "QR_VERIFICATION_RESOLVED", actor=user, case_id=cert.case_id, document_id=cert.document_id,
        metadata={"verification_id": verification_id, "certificate_number": cert.certificate_number}, **get_client_meta(request),
    )
    return {"document_id": str(cert.document_id), "case_id": str(cert.case_id), "evidence_id": str(cert.evidence_id)}


@router.post("/api/certificates", response_model=CertificateOut, status_code=status.HTTP_201_CREATED)
def create_certificate(
    payload: CertificateCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.CERTIFICATE_GENERATE)),
):
    evidence = db.get(EvidenceItem, payload.evidence_id)
    if not evidence:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evidence not found")
    document = db.get(Document, evidence.document_id)
    return issue_certificate(db, evidence, document, user, get_client_meta(request))


@router.get("/api/certificates/{certificate_id}", response_model=CertificateOut)
def get_certificate(certificate_id: str, db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.COURT_VERIFY))):
    conditions = [
        VerificationCertificate.certificate_number == certificate_id,
        VerificationCertificate.verification_id == certificate_id,
    ]
    if _is_uuid(certificate_id):
        # The Uuid column's bind processor requires an actual uuid.UUID instance —
        # comparing it against the raw path-parameter string raises AttributeError.
        conditions.append(VerificationCertificate.id == uuid.UUID(certificate_id))
    cert = db.execute(select(VerificationCertificate).where(or_(*conditions))).scalar_one_or_none()
    if not cert:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Certificate not found")
    return cert


def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False
