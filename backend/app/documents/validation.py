import os

from app.core.config import settings

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".docx", ".txt"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}


class FileValidationError(Exception):
    pass


def validate_upload(filename: str, content_type: str, size: int) -> None:
    if size > settings.MAX_UPLOAD_SIZE:
        raise FileValidationError(f"File exceeds maximum upload size of {settings.MAX_UPLOAD_SIZE} bytes")
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise FileValidationError(f"File type {ext} is not permitted")
    if content_type not in ALLOWED_MIME_TYPES:
        raise FileValidationError(f"MIME type {content_type} is not permitted")


def secure_filename(filename: str) -> str:
    base = os.path.basename(filename)
    return "".join(c for c in base if c.isalnum() or c in "._- ")[:255] or "unnamed"
