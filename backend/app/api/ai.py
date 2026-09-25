import uuid
from datetime import datetime, timezone
from itertools import combinations

from dateutil import parser as date_parser
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.gemini_service import gemini_service
from app.audit.service import record_event
from app.database.session import get_db
from app.models.ai import AIContradiction, AIEntity, AITimelineEvent
from app.models.case import Case
from app.models.document import Document
from app.models.user import User
from app.schemas.ai import AskRequest
from app.security.deps import require_permission
from app.security.rbac import Permission

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _case_documents(db: Session, case_id: uuid.UUID) -> list[Document]:
    return db.execute(select(Document).where(Document.case_id == case_id)).scalars().all()


@router.post("/analyze-document/{document_id}")
def analyze_document(document_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.AI_USE))):
    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    if not document.extracted_text:
        return {"available": False, "message": "AI analysis temporarily unavailable — no extractable text for this document."}
    classification, is_live = gemini_service.classify_document(document.extracted_text, document.name)
    entities, _ = gemini_service.extract_entities(document.extracted_text)
    return {"available": True, "is_live_ai": is_live, "classification": classification.model_dump(), "entities": entities.model_dump()}


@router.get("/timeline/{case_id}")
def get_timeline(case_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.AI_USE))):
    existing = db.execute(
        select(AITimelineEvent).where(AITimelineEvent.case_id == case_id).order_by(AITimelineEvent.event_date.asc())
    ).scalars().all()
    if existing:
        return [
            {"id": str(e.id), "date": e.event_date.isoformat(), "event": e.event_text, "confidence": e.confidence, "document_id": str(e.document_id) if e.document_id else None}
            for e in existing
        ]

    documents = [d for d in _case_documents(db, case_id) if d.extracted_text]
    if not documents:
        return []
    created = []
    for doc in documents:
        extraction, _ = gemini_service.extract_timeline(doc.extracted_text, doc.name)
        for ev in extraction.events:
            try:
                parsed_date = date_parser.parse(f"{ev.date} {ev.time}".strip(), fuzzy=True, default=datetime.now(timezone.utc))
            except Exception:
                continue
            event = AITimelineEvent(
                case_id=case_id, document_id=doc.id, event_date=parsed_date, event_text=ev.event,
                confidence=ev.confidence, related_evidence=[],
            )
            db.add(event)
            created.append(event)
    db.commit()
    created.sort(key=lambda e: e.event_date)
    return [
        {"id": str(e.id), "date": e.event_date.isoformat(), "event": e.event_text, "confidence": e.confidence, "document_id": str(e.document_id)}
        for e in created
    ]


@router.get("/contradictions/{case_id}")
def get_contradictions(case_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.AI_USE))):
    existing = db.execute(select(AIContradiction).where(AIContradiction.case_id == case_id)).scalars().all()
    if existing:
        return [
            {
                "id": str(c.id), "category": c.category, "severity": c.severity, "description": c.description,
                "document_a_id": str(c.document_a_id) if c.document_a_id else None,
                "document_b_id": str(c.document_b_id) if c.document_b_id else None,
                "requires_human_review": c.requires_human_review, "status": c.status,
            }
            for c in existing
        ]

    documents = [d for d in _case_documents(db, case_id) if d.extracted_text]
    created = []
    for doc_a, doc_b in combinations(documents, 2):
        report, _ = gemini_service.detect_contradictions(doc_a.name, doc_a.extracted_text, doc_b.name, doc_b.extracted_text)
        for c in report.contradictions:
            if not c.detected:
                continue
            record = AIContradiction(
                case_id=case_id, category=c.category, severity=c.severity, description=c.description,
                document_a_id=doc_a.id, document_b_id=doc_b.id, requires_human_review=c.requires_human_review, status="OPEN",
            )
            db.add(record)
            created.append(record)
    db.commit()
    return [
        {
            "id": str(c.id), "category": c.category, "severity": c.severity, "description": c.description,
            "document_a_id": str(c.document_a_id), "document_b_id": str(c.document_b_id),
            "requires_human_review": c.requires_human_review, "status": c.status,
        }
        for c in created
    ]


@router.get("/case-insights/{case_id}")
def case_insights(case_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.AI_USE))):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Case not found")
    documents = _case_documents(db, case_id)
    summaries = [(d.name, d.extracted_text) for d in documents if d.extracted_text]
    if not summaries:
        return {"available": False, "message": "AI analysis temporarily unavailable. Existing case records remain accessible."}
    insights, is_live = gemini_service.generate_case_insights(case.title, summaries)

    entities = db.execute(select(AIEntity).where(AIEntity.case_id == case_id)).scalars().all()
    people = sorted({e.value for e in entities if e.entity_type == "PERSON"})
    locations = sorted({e.value for e in entities if e.entity_type == "LOCATION"})

    return {
        "available": True,
        "is_live_ai": is_live,
        "summary": insights.summary,
        "key_people": people or insights.key_people,
        "key_locations": locations or insights.key_locations,
        "risk_signals": insights.risk_signals,
        "disclaimer": insights.disclaimer,
        "document_count": len(documents),
    }


@router.post("/ask")
def ask_case(payload: AskRequest, db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.AI_USE))):
    documents = [d for d in _case_documents(db, payload.case_id) if d.extracted_text]
    keywords = [w.lower() for w in payload.question.split() if len(w) > 3]
    relevant = []
    for d in documents:
        text_lower = d.extracted_text.lower()
        if any(kw in text_lower for kw in keywords) or not keywords:
            relevant.append((d.name, d.extracted_text))
    if not relevant:
        relevant = [(d.name, d.extracted_text) for d in documents[:5]]

    answer, is_live = gemini_service.answer_case_question(payload.question, relevant)
    record_event(db, "AI_ANALYSIS", actor=user, case_id=payload.case_id, metadata={"question": payload.question}, ip_address="", device="")
    return {"answer": answer.answer, "source_documents": answer.source_documents, "confidence": answer.confidence, "is_live_ai": is_live}
