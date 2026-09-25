"""Text extraction abstraction. PDFs are parsed with pypdf; other formats fall
back to an OCR-abstraction stub (a real deployment would wire in Tesseract /
a cloud OCR API behind the same function signature)."""

import io

from pypdf import PdfReader


def extract_text(content: bytes, mime_type: str) -> str:
    try:
        if mime_type == "application/pdf":
            reader = PdfReader(io.BytesIO(content))
            return "\n".join((page.extract_text() or "") for page in reader.pages).strip()
        if mime_type == "text/plain":
            return content.decode("utf-8", errors="ignore")
        # image / docx: OCR abstraction placeholder for this prototype.
        return ""
    except Exception:
        return ""


def extract_metadata(content: bytes, mime_type: str) -> dict:
    metadata = {"page_count": 0, "author": "", "source_device": ""}
    if mime_type == "application/pdf":
        try:
            reader = PdfReader(io.BytesIO(content))
            metadata["page_count"] = len(reader.pages)
            info = reader.metadata or {}
            metadata["author"] = str(info.get("/Author", "") or "")
        except Exception:
            pass
    return metadata
