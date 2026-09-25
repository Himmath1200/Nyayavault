import uuid

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy import Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import AccessAction, AccessPurpose, AccessRequestStatus


class AccessRequest(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "access_requests"

    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, index=True)
    requested_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    purpose: Mapped[AccessPurpose] = mapped_column(Enum(AccessPurpose, name="access_purpose"), nullable=False)
    action: Mapped[AccessAction] = mapped_column(Enum(AccessAction, name="access_action"), nullable=False)
    justification: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[AccessRequestStatus] = mapped_column(Enum(AccessRequestStatus, name="access_request_status"), default=AccessRequestStatus.PENDING, index=True)
    decided_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    decided_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), nullable=True)
    decision_note: Mapped[str] = mapped_column(String(512), default="")


class AccessLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "access_logs"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True, index=True)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id"), nullable=True, index=True)
    purpose: Mapped[str] = mapped_column(String(64), default="")
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    granted: Mapped[bool] = mapped_column(Boolean, nullable=False)
    reasons: Mapped[str] = mapped_column(Text, default="")
    ip_address: Mapped[str] = mapped_column(String(64), default="")
    device: Mapped[str] = mapped_column(String(255), default="")
