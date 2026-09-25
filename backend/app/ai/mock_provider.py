"""Deterministic mock AI provider. Used when GEMINI_ENABLED=false or as a
fallback if the Gemini API call fails, so the application never crashes and
always returns a valid, schema-conformant response."""

import re

from app.ai.schemas import (
    CaseAnswer,
    CaseInsights,
    ContradictionOut,
    ContradictionReport,
    DocumentClassification,
    EntityExtraction,
    TimelineEventOut,
    TimelineExtraction,
)

DOC_TYPE_KEYWORDS = {
    "FIR": ["first information report", "fir no"],
    "WITNESS_STATEMENT": ["witness statement", "deposition", "i state that"],
    "FORENSIC_REPORT": ["forensic", "laboratory analysis", "dna profile"],
    "CHARGE_SHEET": ["charge sheet", "chargesheet"],
    "COURT_FILING": ["in the court of", "petition", "hon'ble"],
    "JUDGMENT": ["judgment", "verdict", "order of the court"],
    "INVESTIGATION_REPORT": ["investigation report", "case diary"],
    "LEGAL_NOTICE": ["legal notice", "notice under"],
}

DATE_RE = re.compile(r"\b(\d{1,2}[/-][A-Za-z0-9]{2,9}[/-]\d{2,4})\b")
TIME_RE = re.compile(r"\b(\d{1,2}:\d{2}\s?(?:AM|PM|hrs)?)\b", re.IGNORECASE)
PERSON_RE = re.compile(r"\b(?:Mr\.|Ms\.|Mrs\.|Dr\.|Inspector|Officer)\s+[A-Z][a-z]+(?:\s[A-Z][a-z]+)?")
LOCATION_HINTS = ["street", "road", "colony", "sector", "district", "nagar", "police station"]
CASE_NUM_RE = re.compile(r"\bCASE-\d{4}-\d{3,6}\b|\bFIR[\s-]?No\.?\s*\d+\b", re.IGNORECASE)
LEGAL_SECTION_RE = re.compile(r"\bSection\s+\d+[A-Za-z]?\b(?:\s+of\s+the\s+[A-Za-z, ]+)?", re.IGNORECASE)


def mock_classify_document(text: str, filename: str = "") -> DocumentClassification:
    lowered = (text + " " + filename).lower()
    best_type, best_score = "OTHER", 0
    for doc_type, keywords in DOC_TYPE_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in lowered)
        if score > best_score:
            best_type, best_score = doc_type, score
    confidence = 0.94 if best_score > 0 else 0.55
    classification = "CONFIDENTIAL"
    if best_type in ("FORENSIC_REPORT", "WITNESS_STATEMENT"):
        classification = "HIGHLY_CONFIDENTIAL"
    elif best_type == "JUDGMENT":
        classification = "PUBLIC"
    return DocumentClassification(document_type=best_type, confidence=confidence, classification=classification)


def mock_extract_entities(text: str) -> EntityExtraction:
    persons = list(dict.fromkeys(PERSON_RE.findall(text)))[:10]
    dates = list(dict.fromkeys(DATE_RE.findall(text)))[:10]
    case_numbers = list(dict.fromkeys(CASE_NUM_RE.findall(text)))[:5]
    legal_sections = list(dict.fromkeys(LEGAL_SECTION_RE.findall(text)))[:10]
    locations = []
    for line in text.split("\n"):
        low = line.lower()
        if any(hint in low for hint in LOCATION_HINTS):
            locations.append(line.strip()[:80])
    locations = list(dict.fromkeys(locations))[:8]
    return EntityExtraction(
        persons=persons,
        locations=locations,
        organizations=[],
        dates=dates,
        evidence_items=[],
        case_numbers=case_numbers,
        legal_sections=legal_sections,
    )


def mock_extract_timeline(text: str, source_document: str = "") -> TimelineExtraction:
    events = []
    for line in text.split("\n"):
        date_match = DATE_RE.search(line)
        if not date_match:
            continue
        time_match = TIME_RE.search(line)
        events.append(
            TimelineEventOut(
                date=date_match.group(1),
                time=time_match.group(1) if time_match else "",
                event=line.strip()[:200],
                source_document=source_document,
                confidence=0.8 if time_match else 0.65,
            )
        )
    return TimelineExtraction(events=events[:15])


def mock_detect_contradictions(doc_a_name: str, doc_a_text: str, doc_b_name: str, doc_b_text: str) -> ContradictionReport:
    times_a = TIME_RE.findall(doc_a_text)
    times_b = TIME_RE.findall(doc_b_text)
    if times_a and times_b and times_a[0].lower() != times_b[0].lower():
        return ContradictionReport(
            contradictions=[
                ContradictionOut(
                    detected=True,
                    category="timeline",
                    description=(
                        f"Potential inconsistency detected — human review required. "
                        f"{doc_a_name} reports a time of {times_a[0]} while {doc_b_name} reports {times_b[0]} "
                        "for what may be the same event."
                    ),
                    documents=[doc_a_name, doc_b_name],
                    severity="MEDIUM",
                    requires_human_review=True,
                )
            ]
        )
    return ContradictionReport(contradictions=[])


def mock_case_summary(case_title: str, document_names: list[str]) -> CaseInsights:
    return CaseInsights(
        summary=(
            f"Case '{case_title}' includes {len(document_names)} analyzed document(s). "
            "This is an automatically generated overview intended to support human "
            "investigators and does not represent a legal conclusion."
        ),
        key_people=[],
        key_locations=[],
        risk_signals=["Automated summary — verify against source documents before relying on it."],
    )


def mock_answer_question(question: str, context_snippets: list[tuple[str, str]]) -> CaseAnswer:
    if not context_snippets:
        return CaseAnswer(
            answer="No relevant source material was found in this case to answer that question.",
            source_documents=[],
            confidence=0.1,
        )
    doc_names = [name for name, _ in context_snippets[:3]]
    return CaseAnswer(
        answer=(
            f"Based on {len(doc_names)} related document(s) in this case, information relevant to "
            f'"{question}" was located. Review the linked source documents for full context — this '
            "is a supporting summary, not a legal conclusion."
        ),
        source_documents=doc_names,
        confidence=0.55,
    )
