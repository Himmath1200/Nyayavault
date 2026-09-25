"""Step-up email verification for HIGHLY_CONFIDENTIAL documents.

Beyond the normal zero-trust access decision (role x case x classification x
purpose x risk), a HIGHLY_CONFIDENTIAL document requires one additional,
short-lived proof of presence: a one-time code delivered to the user's
registered email before the file content is released.

This prototype has no SMTP integration configured, so — exactly like the
platform's existing MFA step, which always uses a fixed demo code rather than
a real SMS/authenticator — the generated code is disclosed directly in the
API response and as an in-app notification instead of actually being emailed.
This is a deliberate, disclosed simplification, not a production email
delivery path.

State lives in the database (EmailVerificationCode), not an in-process dict —
a serverless deployment gives no guarantee that the request that generates a
code and the request that confirms it land on the same warm instance.
"""

import random
import uuid as uuidlib
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.verification import EmailVerificationCode

CODE_TTL_MINUTES = 10
UNLOCK_TTL_MINUTES = 20


def _aware(value: datetime | None) -> datetime | None:
    """SQLite drops tzinfo on round-trip; normalize back to UTC-aware before comparing."""
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _get_or_create(db: Session, user_id: str, document_id: str) -> EmailVerificationCode:
    uid, did = uuidlib.UUID(user_id), uuidlib.UUID(document_id)
    row = db.execute(
        select(EmailVerificationCode).where(
            EmailVerificationCode.user_id == uid, EmailVerificationCode.document_id == did
        )
    ).scalar_one_or_none()
    if row is None:
        row = EmailVerificationCode(user_id=uid, document_id=did)
        db.add(row)
    return row


def generate_code(db: Session, user_id: str, document_id: str) -> tuple[str, datetime]:
    row = _get_or_create(db, user_id, document_id)
    code = f"{random.randint(0, 999999):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=CODE_TTL_MINUTES)
    row.code = code
    row.code_expires_at = expires_at
    db.commit()
    return code, expires_at


def confirm_code(db: Session, user_id: str, document_id: str, code: str) -> datetime | None:
    """Validates the code and, on success, opens a time-limited unlock window so the user
    isn't re-prompted on every subsequent view/download of the same document. Returns the
    unlock expiry on success, None on an invalid or expired code."""
    row = _get_or_create(db, user_id, document_id)
    expires_at = _aware(row.code_expires_at)
    if not row.code or not expires_at or datetime.now(timezone.utc) > expires_at or code != row.code:
        db.commit()
        return None
    row.code = None
    row.code_expires_at = None
    unlock_expires = datetime.now(timezone.utc) + timedelta(minutes=UNLOCK_TTL_MINUTES)
    row.unlocked_until = unlock_expires
    db.commit()
    return unlock_expires


def is_unlocked(db: Session, user_id: str, document_id: str) -> bool:
    uid, did = uuidlib.UUID(user_id), uuidlib.UUID(document_id)
    row = db.execute(
        select(EmailVerificationCode).where(
            EmailVerificationCode.user_id == uid, EmailVerificationCode.document_id == did
        )
    ).scalar_one_or_none()
    expires_at = _aware(row.unlocked_until) if row else None
    if not expires_at:
        return False
    if datetime.now(timezone.utc) > expires_at:
        row.unlocked_until = None
        db.commit()
        return False
    return True


def mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if len(local) <= 2:
        masked_local = local[0] + "*" * max(len(local) - 1, 1)
    else:
        masked_local = local[0] + "*" * (len(local) - 2) + local[-1]
    return f"{masked_local}@{domain}"
