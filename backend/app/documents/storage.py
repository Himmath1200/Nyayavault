"""Storage abstraction. LocalStorage is used for local dev / any host with a persistent
filesystem. VercelBlobStorage is used automatically when BLOB_READ_WRITE_TOKEN is set (i.e.
when deployed to Vercel, whose serverless functions have no persistent disk). Both implement
the same save/read/exists interface, so calling code (document_service.py) never branches on
which backend is active."""

import abc
import mimetypes
import os
import uuid

import httpx

from app.core.config import settings


class StorageBackend(abc.ABC):
    @abc.abstractmethod
    def save(self, content: bytes, relative_path: str) -> str: ...

    @abc.abstractmethod
    def read(self, relative_path: str) -> bytes: ...

    @abc.abstractmethod
    def exists(self, relative_path: str) -> bool: ...


class LocalStorage(StorageBackend):
    def __init__(self, base_dir: str | None = None):
        self.base_dir = os.path.abspath(base_dir or settings.UPLOAD_DIR)
        os.makedirs(self.base_dir, exist_ok=True)

    def _resolve(self, relative_path: str) -> str:
        # Prevent path traversal: resolve and ensure the result stays under base_dir.
        full_path = os.path.abspath(os.path.join(self.base_dir, relative_path))
        if not full_path.startswith(self.base_dir + os.sep) and full_path != self.base_dir:
            raise ValueError("Invalid storage path")
        return full_path

    def save(self, content: bytes, relative_path: str) -> str:
        full_path = self._resolve(relative_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(content)
        return relative_path

    def read(self, relative_path: str) -> bytes:
        full_path = self._resolve(relative_path)
        with open(full_path, "rb") as f:
            return f.read()

    def exists(self, relative_path: str) -> bool:
        try:
            return os.path.isfile(self._resolve(relative_path))
        except ValueError:
            return False


class VercelBlobStorage(StorageBackend):
    """Talks to Vercel Blob's REST API directly (no official Python SDK exists).

    Uploads are written with `x-add-random-suffix: 0` so the blob's public URL is always
    exactly `{BLOB_PUBLIC_BASE_URL}/{relative_path}` — deterministic and reconstructible from
    the same relative_path that generate_storage_path() produced and that gets persisted as
    Document.file_path, with no extra column needed to remember the "real" URL.
    """

    UPLOAD_URL = "https://blob.vercel-storage.com"

    def __init__(self):
        if not settings.BLOB_READ_WRITE_TOKEN or not settings.BLOB_PUBLIC_BASE_URL:
            raise RuntimeError(
                "VercelBlobStorage requires both BLOB_READ_WRITE_TOKEN and BLOB_PUBLIC_BASE_URL to be set."
            )
        self.token = settings.BLOB_READ_WRITE_TOKEN
        self.base_url = settings.BLOB_PUBLIC_BASE_URL.rstrip("/")

    def save(self, content: bytes, relative_path: str) -> str:
        content_type = mimetypes.guess_type(relative_path)[0] or "application/octet-stream"
        resp = httpx.put(
            f"{self.UPLOAD_URL}/{relative_path}",
            headers={
                "Authorization": f"Bearer {self.token}",
                "x-api-version": "7",
                "x-add-random-suffix": "0",
                "x-content-type": content_type,
            },
            content=content,
            timeout=30,
        )
        resp.raise_for_status()
        return relative_path

    def read(self, relative_path: str) -> bytes:
        resp = httpx.get(f"{self.base_url}/{relative_path}", timeout=30)
        resp.raise_for_status()
        return resp.content

    def exists(self, relative_path: str) -> bool:
        resp = httpx.head(f"{self.base_url}/{relative_path}", timeout=15)
        return resp.status_code == 200


def generate_storage_path(case_number: str, original_filename: str) -> str:
    safe_ext = "".join(c for c in os.path.splitext(original_filename)[1] if c.isalnum() or c == ".")[:10]
    safe_case = "".join(c for c in case_number if c.isalnum() or c in "-_")
    return f"{safe_case}/{uuid.uuid4().hex}{safe_ext}"


def _build_storage() -> StorageBackend:
    if settings.BLOB_READ_WRITE_TOKEN:
        return VercelBlobStorage()
    return LocalStorage()


storage = _build_storage()
