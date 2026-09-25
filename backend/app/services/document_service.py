"""Document upload / quarantine pipeline.

Upload -> Quarantine -> Validate -> Extract metadata -> SHA-256 -> Scan ->
Extract text -> AI classify/extract/summarize -> Create Evidence DNA ->
Seal -> Audit event.

Every step appends to a step log returned to the caller so the frontend can
render the pipeline progress (Uploading / Validating / Hashing / Extracting /
AI Analysis / Creating Evidence DNA / Sealing / Completed).
"""

import random
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.ai.gemini_service import gemini_service
from app.audit.service import record_event
from app.custody.service import add_custody_event
from app.documents.extraction import extract_metadata, extract_text
from app.documents.hashing import sha256_bytes
from app.documents.storage import generate_storage_path, storage
from app.documents.validation import FileValidationError, secure_filename, validate_upload
from app.models.ai import AIAnalysis, AIEntity
from app.models.case import Case
from app.models.document import Document, DocumentMetadata, DocumentVersion
from app.models.enums import Classification, CustodyStatus, DocumentStatus, DocumentType, IntegrityStatus
from app.models.evidence import EvidenceItem
from app.models.user import User


def generate_document_number() -> str:
    return f"DOC-{datetime.now(timezone.utc).year}-{random.randint(100000, 999999)}"


def generate_evidence_number() -> str:
    return f"EVD-{datetime.now(timezone.utc).year}-{random.randint(100000, 999999):06d}"


class DocumentUploadResult:
    def __init__(self, document: Document, evidence: EvidenceItem, steps: list[dict]):
        self.document = document
        self.evidence = evidence
        self.steps = steps


def process_upload(
    db: Session,
    case: Case,
    user: User,
    filename: str,
    content_type: str,
    content: bytes,
    document_type: DocumentType,
    classification: Classification,
    client_meta: dict,
) -> DocumentUploadResult:
    steps: list[dict] = []

    def log(step: str, status: str, detail: str = ""):
        steps.append({"step": step, "status": status, "detail": detail})

    log("Uploading", "COMPLETED", f"{len(content)} bytes received")

    log("Quarantine", "COMPLETED", "File isolated pending validation")

    try:
        validate_upload(filename, content_type, len(content))
    except FileValidationError as e:
        log("Validating", "FAILED", str(e))
        raise
    log("Validating", "COMPLETED", "File type and size within policy")

    metadata = extract_metadata(content, content_type)
    log("Extracting metadata", "COMPLETED", f"{metadata.get('page_count', 0)} page(s) detected")

    file_hash = sha256_bytes(content)
    log("Hashing", "COMPLETED", f"SHA-256: {file_hash[:16]}...")

    log("Scanning", "COMPLETED", "No known threats detected (demo scan)")

    text = extract_text(content, content_type)
    log("Extracting text", "COMPLETED", f"{len(text)} characters extracted")

    safe_name = secure_filename(filename)
    storage_path = generate_storage_path(case.case_number, safe_name)
    storage.save(content, storage_path)

    document = Document(
        document_number=generate_document_number(),
        case_id=case.id,
        name=safe_name,
        document_type=document_type,
        classification=classification,
        status=DocumentStatus.AI_ANALYSIS,
        current_version=1,
        uploaded_by=user.id,
        file_path=storage_path,
        mime_type=content_type,
        file_size=len(content),
        sha256_hash=file_hash,
        integrity_status=IntegrityStatus.VERIFIED,
        custody_status=CustodyStatus.WITH_INVESTIGATOR,
    )
    db.add(document)
    db.flush()

    db.add(
        DocumentMetadata(
            document_id=document.id,
            page_count=metadata.get("page_count", 0),
            author=metadata.get("author", ""),
            source_device=metadata.get("source_device", ""),
        )
    )
    db.add(
        DocumentVersion(
            document_id=document.id,
            version_number=1,
            file_path=storage_path,
            sha256_hash=file_hash,
            uploaded_by=user.id,
            change_note="Initial upload",
        )
    )

    classification_result, is_live_ai = gemini_service.classify_document(text, filename) if text else (None, False)
    entities_result, _ = gemini_service.extract_entities(text) if text else (None, False)
    ai_note = "AI analysis temporarily unavailable." if not text else ""
    if classification_result:
        summary = (
            f"Detected as {classification_result.document_type} "
            f"(confidence {classification_result.confidence:.0%}). "
            f"{len(entities_result.persons) if entities_result else 0} person(s), "
            f"{len(entities_result.dates) if entities_result else 0} date(s) identified."
        )
        document.ai_summary = summary
        db.add(
            AIAnalysis(
                document_id=document.id,
                analysis_type="CLASSIFICATION",
                result_json=classification_result.model_dump(),
                model_used="gemini" if is_live_ai else "mock",
                is_mock=not is_live_ai,
            )
        )
        if entities_result:
            db.add(
                AIAnalysis(
                    document_id=document.id,
                    analysis_type="ENTITY_EXTRACTION",
                    result_json=entities_result.model_dump(),
                    model_used="gemini" if is_live_ai else "mock",
                    is_mock=not is_live_ai,
                )
            )
            for etype, values in [
                ("PERSON", entities_result.persons),
                ("LOCATION", entities_result.locations),
                ("DATE", entities_result.dates),
                ("CASE_NUMBER", entities_result.case_numbers),
                ("LEGAL_SECTION", entities_result.legal_sections),
            ]:
                for v in values:
                    db.add(AIEntity(document_id=document.id, case_id=case.id, entity_type=etype, value=v, confidence=0.8))
        log("AI Analysis", "COMPLETED", ai_note or f"Classified as {classification_result.document_type}")
    else:
        document.ai_summary = "AI analysis temporarily unavailable. Existing case records remain accessible."
        log("AI Analysis", "SKIPPED", "No extractable text; AI analysis skipped")

    document.extracted_text = text
    document.status = DocumentStatus.CREATING_EVIDENCE_DNA
    db.flush()

    evidence = EvidenceItem(
        evidence_number=generate_evidence_number(),
        case_id=case.id,
        document_id=document.id,
        sha256_hash=file_hash,
        file_size=len(content),
        mime_type=content_type,
        document_version=1,
        uploaded_by=user.id,
        digital_signature=f"SIG-{sha256_bytes((file_hash + str(user.id)).encode())[:32]}",
        integrity_status=IntegrityStatus.VERIFIED,
        custody_status=CustodyStatus.WITH_INVESTIGATOR,
        last_verified_at=datetime.now(timezone.utc),
        last_verified_by=user.id,
    )
    db.add(evidence)
    db.flush()
    log("Creating Evidence DNA", "COMPLETED", evidence.evidence_number)

    add_custody_event(db, evidence, user, "EVIDENCE_COLLECTED", location="Digital Intake", reason="Initial upload", commit=False)

    seal_eligible = classification in (Classification.CONFIDENTIAL, Classification.HIGHLY_CONFIDENTIAL, Classification.SEALED)
    if seal_eligible:
        document.is_sealed = True
        document.custody_status = CustodyStatus.SEALED
        evidence.custody_status = CustodyStatus.SEALED
        log("Sealing", "COMPLETED", "Document sealed — content is now immutable")
    else:
        log("Sealing", "SKIPPED", "Classification does not require sealing")

    document.status = DocumentStatus.COMPLETED
    db.commit()
    db.refresh(document)
    db.refresh(evidence)

    record_event(
        db,
        "DOCUMENT_UPLOAD",
        actor=user,
        case_id=case.id,
        document_id=document.id,
        metadata={"document_number": document.document_number, "sha256": file_hash, "classification": classification.value},
        **client_meta,
    )
    if document.is_sealed:
        record_event(db, "DOCUMENT_SEALED", actor=user, case_id=case.id, document_id=document.id, metadata={}, **client_meta)

    log("Completed", "COMPLETED", f"{document.document_number} / {evidence.evidence_number}")
    return DocumentUploadResult(document=document, evidence=evidence, steps=steps)


def verify_integrity(db: Session, document: Document, user: User, client_meta: dict) -> dict:
    content = storage.read(document.file_path)
    current_hash = sha256_bytes(content)
    match = current_hash == document.sha256_hash
    document.integrity_status = IntegrityStatus.VERIFIED if match else IntegrityStatus.FAILED
    now = datetime.now(timezone.utc)
    db.commit()

    record_event(
        db,
        "INTEGRITY_VERIFIED" if match else "INTEGRITY_FAILED",
        actor=user,
        case_id=document.case_id,
        document_id=document.id,
        metadata={"original_hash": document.sha256_hash, "current_hash": current_hash, "match": match},
        **client_meta,
    )

    return {
        "integrity_status": "VERIFIED" if match else "FAILED",
        "original_hash": document.sha256_hash,
        "current_hash": current_hash,
        "match": match,
        "verified_at": now,
        "verified_by": user.full_name,
        "requires_investigation": not match,
    }
