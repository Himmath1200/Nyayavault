import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy import JSON as JSONB, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDMixin


class VerificationCertificate(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "verification_certificates"

    certificate_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    verification_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    evidence_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("evidence_items.id"), nullable=False, index=True)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, index=True)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False, index=True)
    issued_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    issued_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), nullable=False)
    hash_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    custody_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    signature_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    audit_complete: Mapped[bool] = mapped_column(Boolean, default=True)
    snapshot: Mapped[dict] = mapped_column(JSONB, default=dict)


class EmailVerificationCode(Base, UUIDMixin, TimestampMixin):
    """Step-up email verification state for HIGHLY_CONFIDENTIAL document access.

    Backed by the database (rather than an in-process dict) because serverless deployments
    (e.g. Vercel) give no guarantee that two requests are served by the same warm instance —
    an in-memory store would silently "forget" pending codes between requests.
    """

    __tablename__ = "email_verification_codes"
    __table_args__ = (UniqueConstraint("user_id", "document_id", name="uq_email_verification_user_document"),)

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, index=True)
    code: Mapped[str | None] = mapped_column(String(6), nullable=True)
    code_expires_at: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)
    unlocked_until: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)


class FailedLoginAttempt(Base, UUIDMixin):
    """One row per failed login, used to detect brute-force patterns.

    Same rationale as EmailVerificationCode: this used to be an in-memory counter, which
    doesn't survive across serverless invocations.
    """

    __tablename__ = "failed_login_attempts"

    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    attempted_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), nullable=False)
