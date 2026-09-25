import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text
from sqlalchemy import JSON as JSONB, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import Classification, CustodyStatus, DocumentStatus, DocumentType, IntegrityStatus


class Document(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "documents"

    document_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    document_type: Mapped[DocumentType] = mapped_column(Enum(DocumentType, name="document_type"), index=True, nullable=False)
    classification: Mapped[Classification] = mapped_column(Enum(Classification, name="classification"), index=True, nullable=False)
    status: Mapped[DocumentStatus] = mapped_column(Enum(DocumentStatus, name="document_status"), default=DocumentStatus.QUARANTINED, index=True)
    current_version: Mapped[int] = mapped_column(Integer, default=1)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(128), default="application/pdf")
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    sha256_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    integrity_status: Mapped[IntegrityStatus] = mapped_column(Enum(IntegrityStatus, name="integrity_status"), default=IntegrityStatus.UNVERIFIED)
    digital_signature_valid: Mapped[bool] = mapped_column(Boolean, default=True)
    custody_status: Mapped[CustodyStatus] = mapped_column(Enum(CustodyStatus, name="custody_status"), default=CustodyStatus.WITH_INVESTIGATOR)
    is_sealed: Mapped[bool] = mapped_column(Boolean, default=False)
    extracted_text: Mapped[str] = mapped_column(Text, default="")
    ai_summary: Mapped[str] = mapped_column(Text, default="")


class DocumentVersion(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "document_versions"

    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    sha256_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    change_note: Mapped[str] = mapped_column(String(512), default="")


class DocumentMetadata(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "document_metadata"

    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, index=True, unique=True)
    page_count: Mapped[int] = mapped_column(Integer, default=0)
    author: Mapped[str] = mapped_column(String(255), default="")
    source_device: Mapped[str] = mapped_column(String(255), default="")
    extra: Mapped[dict] = mapped_column(JSONB, default=dict)
