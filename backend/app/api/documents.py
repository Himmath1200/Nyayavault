import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.service import record_event
from app.database.session import get_db
from app.documents.storage import storage
from app.documents.validation import FileValidationError
from app.models.access import AccessLog
from app.models.case import Case
from app.models.document import Document, DocumentVersion
from app.models.enums import AccessAction, AccessPurpose, Classification, DocumentType, NotificationSeverity
from app.models.user import User
from app.schemas.access import AccessDecisionOut
from app.schemas.document import (
    DocumentOut,
    DocumentVersionOut,
    EmailVerificationConfirmIn,
    EmailVerificationConfirmOut,
    EmailVerificationRequestOut,
    IntegrityVerifyResult,
)
from app.security import email_verification
from app.security.access_control import evaluate_access
from app.security.deps import get_client_meta, require_permission
from app.security.rbac import Permission
from app.services import notification_service, security_service
from app.services.document_service import process_upload, verify_integrity

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("", response_model=list[DocumentOut])
def list_documents(
    case_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.DOCUMENT_VIEW)),
):
    stmt = select(Document)
    if case_id:
        stmt = stmt.where(Document.case_id == case_id)
    stmt = stmt.order_by(Document.created_at.desc())
    return db.execute(stmt).scalars().all()


@router.post("/upload", response_model=dict, status_code=status.HTTP_201_CREATED)
def upload_document(
    request: Request,
    case_id: uuid.UUID = Form(...),
    document_type: DocumentType = Form(...),
    classification: Classification = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.DOCUMENT_UPLOAD)),
):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Case not found")
    content = file.file.read()
    try:
        result = process_upload(
            db, case, user, file.filename or "unnamed", file.content_type or "application/octet-stream",
            content, document_type, classification, get_client_meta(request),
        )
    except FileValidationError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e))
    return {
        "document": DocumentOut.model_validate(result.document).model_dump(mode="json"),
        "evidence_id": str(result.evidence.id),
        "evidence_number": result.evidence.evidence_number,
        "steps": result.steps,
    }


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(document_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.DOCUMENT_VIEW))):
    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    return document


@router.get("/{document_id}/versions", response_model=list[DocumentVersionOut])
def get_versions(document_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.DOCUMENT_VIEW))):
    return db.execute(
        select(DocumentVersion).where(DocumentVersion.document_id == document_id).order_by(DocumentVersion.version_number.asc())
    ).scalars().all()


@router.get("/{document_id}/access-check", response_model=AccessDecisionOut)
def access_check(
    document_id: uuid.UUID,
    purpose: AccessPurpose,
    action: AccessAction,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.DOCUMENT_VIEW)),
):
    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    case = db.get(Case, document.case_id)
    decision = evaluate_access(db, user, case, document, purpose, action)
    return AccessDecisionOut(**decision.to_dict())


@router.post("/{document_id}/email-verification/request", response_model=EmailVerificationRequestOut)
def request_email_verification(
    document_id: uuid.UUID,
    request: Request,
    purpose: AccessPurpose = Query(AccessPurpose.INVESTIGATION),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.DOCUMENT_VIEW)),
):
    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    if document.classification != Classification.HIGHLY_CONFIDENTIAL:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email verification only applies to HIGHLY_CONFIDENTIAL documents")
    case = db.get(Case, document.case_id)
    client_meta = get_client_meta(request)
    # Only issue a code if the normal zero-trust decision would already grant access —
    # step-up verification narrows an approved access further, it never substitutes for it.
    decision = evaluate_access(db, user, case, document, purpose, AccessAction.VIEW)
    if not decision.granted:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"message": "Access denied", "reasons": decision.reasons})

    code, expires_at = email_verification.generate_code(db, str(user.id), str(document.id))
    record_event(
        db, "EMAIL_VERIFICATION_REQUESTED", actor=user, case_id=case.id, document_id=document.id,
        metadata={"document_number": document.document_number}, **client_meta,
    )
    notification_service.notify(
        db, user.id, NotificationSeverity.INFO, "Document verification code",
        f"Your verification code for {document.document_number} ({document.name}) is {code}. It expires in "
        f"{email_verification.CODE_TTL_MINUTES} minutes. No real email is sent in this prototype — this notification "
        "is the delivery channel.",
    )
    return EmailVerificationRequestOut(
        sent=True,
        masked_email=email_verification.mask_email(user.email),
        expires_in_minutes=email_verification.CODE_TTL_MINUTES,
        demo_code=code,
    )


@router.post("/{document_id}/email-verification/confirm", response_model=EmailVerificationConfirmOut)
def confirm_email_verification(
    document_id: uuid.UUID,
    payload: EmailVerificationConfirmIn,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.DOCUMENT_VIEW)),
):
    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    client_meta = get_client_meta(request)
    unlocked_until = email_verification.confirm_code(db, str(user.id), str(document.id), payload.code)
    if not unlocked_until:
        record_event(
            db, "EMAIL_VERIFICATION_FAILED", actor=user, case_id=document.case_id, document_id=document.id,
            metadata={}, **client_meta,
        )
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired verification code")
    record_event(
        db, "EMAIL_VERIFICATION_CONFIRMED", actor=user, case_id=document.case_id, document_id=document.id,
        metadata={"unlocked_until": unlocked_until.isoformat()}, **client_meta,
    )
    return EmailVerificationConfirmOut(verified=True, unlocked_until=unlocked_until)


def _serve_document_content(
    document_id: uuid.UUID,
    request: Request,
    purpose: AccessPurpose,
    action: AccessAction,
    db: Session,
    user: User,
) -> Response:
    """Shared by /view (read-only, in-browser) and /download (save-as). They evaluate
    different AccessActions on purpose — a role can hold DOCUMENT_VIEW without
    DOCUMENT_DOWNLOAD (e.g. System Admin, Auditor, Read-Only Reviewer), and such a role
    must still be able to *see* a document its access grant covers, just not save a local
    copy of it. Both paths still enforce the same classification/case/purpose/risk decision
    and the HIGHLY_CONFIDENTIAL email-verification step-up."""
    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    case = db.get(Case, document.case_id)
    client_meta = get_client_meta(request)
    decision = evaluate_access(db, user, case, document, purpose, action)

    db.add(AccessLog(
        user_id=user.id, document_id=document.id, case_id=case.id, purpose=purpose.value,
        action=action.value, granted=decision.granted, reasons="; ".join(decision.reasons),
        ip_address=client_meta["ip_address"], device=client_meta["device"],
    ))
    db.commit()
    record_event(
        db, "ACCESS_GRANTED" if decision.granted else "ACCESS_DENIED", actor=user, case_id=case.id,
        document_id=document.id, metadata={"action": action.value, "purpose": purpose.value, "reasons": decision.reasons}, **client_meta,
    )

    if not decision.granted:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"message": "Access denied", "reasons": decision.reasons})

    if document.classification == Classification.HIGHLY_CONFIDENTIAL and not email_verification.is_unlocked(db, str(user.id), str(document.id)):
        record_event(
            db, "EMAIL_VERIFICATION_REQUIRED", actor=user, case_id=case.id, document_id=document.id,
            metadata={"document_number": document.document_number, "action": action.value}, **client_meta,
        )
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail={
                "message": "This HIGHLY_CONFIDENTIAL document requires email verification before it can be opened",
                "requires_email_verification": True,
                "reasons": ["HIGHLY_CONFIDENTIAL classification requires a verified one-time email code"],
            },
        )

    if action == AccessAction.DOWNLOAD:
        security_service.check_download_burst_anomaly(db, user, client_meta)

    content = storage.read(document.file_path)
    record_event(
        db, "DOCUMENT_DOWNLOAD" if action == AccessAction.DOWNLOAD else "DOCUMENT_VIEW",
        actor=user, case_id=case.id, document_id=document.id, metadata={}, **client_meta,
    )
    disposition = "attachment" if action == AccessAction.DOWNLOAD else "inline"
    return Response(content=content, media_type=document.mime_type, headers={"Content-Disposition": f'{disposition}; filename="{document.name}"'})


@router.get("/{document_id}/view")
def view_document(
    document_id: uuid.UUID,
    request: Request,
    purpose: AccessPurpose = Query(AccessPurpose.INVESTIGATION),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.DOCUMENT_VIEW)),
):
    return _serve_document_content(document_id, request, purpose, AccessAction.VIEW, db, user)


@router.get("/{document_id}/download")
def download_document(
    document_id: uuid.UUID,
    request: Request,
    purpose: AccessPurpose = Query(AccessPurpose.INVESTIGATION),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.DOCUMENT_VIEW)),
):
    return _serve_document_content(document_id, request, purpose, AccessAction.DOWNLOAD, db, user)


@router.post("/{document_id}/verify", response_model=IntegrityVerifyResult)
def verify_document_integrity(
    document_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.DOCUMENT_VIEW)),
):
    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    result = verify_integrity(db, document, user, get_client_meta(request))
    return result
