"""GeminiService: the single point of contact with the Gemini API.

Design principle: AI provides *understanding* (classification, extraction,
summarization). It never performs authorization (RBAC/ABAC) or integrity
verification (SHA-256 / hash chains) — those are separate subsystems.

If GEMINI_ENABLED is false, or the Gemini call fails/returns invalid JSON for
any reason, every method here falls back to the deterministic mock provider
so the application never crashes and the UI can keep functioning.
"""

import json
import logging

from pydantic import ValidationError

from app.ai import mock_provider, prompts
from app.ai.schemas import (
    CaseAnswer,
    CaseInsights,
    ContradictionReport,
    DocumentClassification,
    EntityExtraction,
    TimelineExtraction,
)
from app.core.config import settings

logger = logging.getLogger("nyayavault.ai")

MAX_TEXT_CHARS = 12000


class GeminiService:
    def __init__(self):
        self._client = None
        if settings.GEMINI_ENABLED and settings.GEMINI_API_KEY:
            try:
                from google import genai

                self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception:
                logger.exception("Failed to initialize Gemini client; falling back to mock AI provider")
                self._client = None

    @property
    def is_live(self) -> bool:
        return self._client is not None

    def _call_gemini_json(self, prompt: str, schema: type) -> dict | None:
        """Uses Gemini's controlled generation (response_schema) so the model is constrained
        to return JSON in exactly our Pydantic contract's shape, rather than a free-form JSON
        object that merely resembles it — the latter is what caused unpredictable field-name
        drift (e.g. the model choosing `classification_level` instead of `classification`)."""
        if not self._client:
            return None
        try:
            response = self._client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config={"response_mime_type": "application/json", "response_schema": schema},
            )
            return json.loads(response.text)
        except Exception:
            logger.exception("Gemini call failed; falling back to mock AI provider")
            return None

    def classify_document(self, text: str, filename: str = "") -> tuple[DocumentClassification, bool]:
        truncated = text[:MAX_TEXT_CHARS]
        raw = self._call_gemini_json(prompts.CLASSIFY_DOCUMENT_PROMPT.format(text=truncated), DocumentClassification)
        if raw:
            try:
                return DocumentClassification.model_validate(raw), True
            except ValidationError:
                logger.warning("Gemini classify_document returned invalid schema; using mock fallback")
        return mock_provider.mock_classify_document(truncated, filename), False

    def extract_entities(self, text: str) -> tuple[EntityExtraction, bool]:
        truncated = text[:MAX_TEXT_CHARS]
        raw = self._call_gemini_json(prompts.EXTRACT_ENTITIES_PROMPT.format(text=truncated), EntityExtraction)
        if raw:
            try:
                return EntityExtraction.model_validate(raw), True
            except ValidationError:
                logger.warning("Gemini extract_entities returned invalid schema; using mock fallback")
        return mock_provider.mock_extract_entities(truncated), False

    def extract_timeline(self, text: str, source_document: str = "") -> tuple[TimelineExtraction, bool]:
        truncated = text[:MAX_TEXT_CHARS]
        raw = self._call_gemini_json(prompts.EXTRACT_TIMELINE_PROMPT.format(text=truncated), TimelineExtraction)
        if raw:
            try:
                return TimelineExtraction.model_validate(raw), True
            except ValidationError:
                logger.warning("Gemini extract_timeline returned invalid schema; using mock fallback")
        return mock_provider.mock_extract_timeline(truncated, source_document), False

    def detect_contradictions(self, doc_a_name: str, doc_a_text: str, doc_b_name: str, doc_b_text: str) -> tuple[ContradictionReport, bool]:
        payload = f"Document A ({doc_a_name}):\n{doc_a_text[:4000]}\n\nDocument B ({doc_b_name}):\n{doc_b_text[:4000]}"
        raw = self._call_gemini_json(prompts.DETECT_CONTRADICTIONS_PROMPT.format(documents=payload), ContradictionReport)
        if raw:
            try:
                return ContradictionReport.model_validate(raw), True
            except ValidationError:
                logger.warning("Gemini detect_contradictions returned invalid schema; using mock fallback")
        return mock_provider.mock_detect_contradictions(doc_a_name, doc_a_text, doc_b_name, doc_b_text), False

    def generate_case_insights(self, case_title: str, document_summaries: list[tuple[str, str]]) -> tuple[CaseInsights, bool]:
        joined = "\n---\n".join(f"{name}:\n{text[:1500]}" for name, text in document_summaries[:20])
        raw = self._call_gemini_json(prompts.CASE_SUMMARY_PROMPT.format(documents=joined), CaseInsights)
        if raw:
            try:
                return CaseInsights.model_validate(raw), True
            except ValidationError:
                logger.warning("Gemini generate_case_insights returned invalid schema; using mock fallback")
        return mock_provider.mock_case_summary(case_title, [name for name, _ in document_summaries]), False

    def answer_case_question(self, question: str, context_snippets: list[tuple[str, str]]) -> tuple[CaseAnswer, bool]:
        context = "\n---\n".join(f"[{name}]\n{text[:1500]}" for name, text in context_snippets[:10])
        raw = self._call_gemini_json(prompts.CASE_QUESTION_PROMPT.format(context=context, question=question), CaseAnswer)
        if raw:
            try:
                return CaseAnswer.model_validate(raw), True
            except ValidationError:
                logger.warning("Gemini answer_case_question returned invalid schema; using mock fallback")
        return mock_provider.mock_answer_question(question, context_snippets), False


gemini_service = GeminiService()
