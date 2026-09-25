SYSTEM_PREAMBLE = (
    "You are an analysis assistant for a legal/investigative document management prototype "
    "(NyayaVault, built for NCRB). Do not make legal conclusions. Do not determine guilt or "
    "innocence. Do not recommend punishment or accuse any person. Identify uncertainty "
    "explicitly. Return structured data only, matching the requested JSON schema exactly. "
    "Flag any potential inconsistency as requiring human review — never state that evidence "
    "is false or fabricated."
)

CLASSIFY_DOCUMENT_PROMPT = (
    SYSTEM_PREAMBLE
    + "\n\nClassify the following legal/investigation document. Identify its document_type "
    "(one of: FIR, POLICE_REPORT, INVESTIGATION_REPORT, WITNESS_STATEMENT, CHARGE_SHEET, "
    "COURT_FILING, EVIDENCE_RECORD, FORENSIC_REPORT, LEGAL_NOTICE, JUDGMENT, OTHER), a "
    "confidence score between 0 and 1, and a recommended classification level (one of: "
    "PUBLIC, INTERNAL, CONFIDENTIAL, HIGHLY_CONFIDENTIAL, SEALED).\n\nDocument text:\n{text}"
)

EXTRACT_ENTITIES_PROMPT = (
    SYSTEM_PREAMBLE
    + "\n\nExtract structured entities from the following document text: persons, locations, "
    "organizations, dates, evidence_items, case_numbers, legal_sections. Only include entities "
    "explicitly present in the text.\n\nDocument text:\n{text}"
)

EXTRACT_TIMELINE_PROMPT = (
    SYSTEM_PREAMBLE
    + "\n\nExtract a chronological list of events mentioned in the following document text. "
    "For each event provide date, time (if present), a short event description, and a "
    "confidence score between 0 and 1 reflecting how explicitly the document states it.\n\n"
    "Document text:\n{text}"
)

DETECT_CONTRADICTIONS_PROMPT = (
    SYSTEM_PREAMBLE
    + "\n\nCompare the following documents from the same case and identify any potential "
    "inconsistencies (e.g. differing times, locations, or descriptions of the same event). "
    "For each, describe it as a 'potential inconsistency detected — human review required', "
    "assign a severity (LOW, MEDIUM, HIGH), and list which documents are involved. Never "
    "assert that a document is false.\n\nDocuments:\n{documents}"
)

CASE_SUMMARY_PROMPT = (
    SYSTEM_PREAMBLE
    + "\n\nSummarize the following case based on its documents. Provide a neutral, factual "
    "summary, key people mentioned, key locations, and any risk signals an investigator should "
    "review (not conclusions).\n\nCase documents:\n{documents}"
)

CASE_QUESTION_PROMPT = (
    SYSTEM_PREAMBLE
    + "\n\nAnswer the following question about the case using ONLY the provided context "
    "excerpts. If the context does not support an answer, say so explicitly rather than "
    "guessing. Cite which source documents you used.\n\nContext:\n{context}\n\nQuestion: {question}"
)
