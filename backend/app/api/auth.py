from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import jwt
from sqlalchemy.orm import Session

from app.audit.service import record_event
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, decode_token, verify_password
from app.database.session import get_db
from app.models.enums import NotificationSeverity
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    MFAVerifyRequest,
    RefreshRequest,
    StepUpVerifyRequest,
    StepUpVerifyResponse,
    TokenResponse,
    UserOut,
)
from app.security.deps import get_client_meta, get_current_user
from app.services import notification_service, security_service, user_service

router = APIRouter(prefix="/api/auth", tags=["auth"])

DEMO_MFA_CODE = "123456"


def _issue_tokens(user) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(str(user.id), user.role.value),
        refresh_token=create_refresh_token(str(user.id)),
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    client_meta = get_client_meta(request)
    user = user_service.get_by_email(db, payload.email)

    if user is None or not verify_password(payload.password, user.hashed_password):
        security_service.check_failed_login_anomaly(db, payload.email, user, client_meta)
        record_event(db, "LOGIN_FAILED", actor=user, metadata={"email": payload.email}, **client_meta)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is inactive")

    security_service.clear_failed_logins(db, payload.email)

    if user.mfa_enabled and not payload.remember_device:
        now = datetime.now(timezone.utc)
        mfa_token = jwt.encode(
            {"sub": str(user.id), "type": "mfa", "iat": now, "exp": now + timedelta(minutes=5)},
            settings.JWT_SECRET,
            algorithm=settings.JWT_ALGORITHM,
        )
        return LoginResponse(mfa_required=True, mfa_token=mfa_token)

    tokens = _issue_tokens(user)
    security_service.check_login_time_anomaly(db, user, client_meta)
    record_event(db, "LOGIN", actor=user, metadata={}, **client_meta)
    return LoginResponse(mfa_required=False, access_token=tokens.access_token, refresh_token=tokens.refresh_token, user=tokens.user)


@router.post("/mfa/verify", response_model=TokenResponse)
def verify_mfa(payload: MFAVerifyRequest, request: Request, db: Session = Depends(get_db)):
    client_meta = get_client_meta(request)
    user = user_service.get_by_email(db, payload.email)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session")
    if payload.code != DEMO_MFA_CODE:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid MFA code")

    tokens = _issue_tokens(user)
    security_service.check_login_time_anomaly(db, user, client_meta)
    record_event(db, "LOGIN", actor=user, metadata={"mfa": True}, **client_meta)
    notification_service.notify(
        db, user.id, NotificationSeverity.INFO, "New login verified", "MFA verification succeeded for your account."
    )
    return tokens


@router.post("/step-up-verify", response_model=StepUpVerifyResponse)
def step_up_verify(payload: StepUpVerifyRequest, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Re-confirms an already-authenticated session with just the MFA code — used when a
    signed-in user is prompted to re-verify before viewing something sensitive (e.g. opening
    a certificate reached via a QR code) without forcing them to re-enter their password."""
    client_meta = get_client_meta(request)
    if payload.code != DEMO_MFA_CODE:
        record_event(db, "STEP_UP_VERIFICATION_FAILED", actor=user, metadata={"context": payload.context}, **client_meta)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid verification code")
    record_event(db, "STEP_UP_VERIFIED", actor=user, metadata={"context": payload.context}, **client_meta)
    return StepUpVerifyResponse(verified=True)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    data = decode_token(payload.refresh_token)
    if data is None or data.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")
    import uuid as _uuid

    user = db.get(User, _uuid.UUID(data["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    return _issue_tokens(user)


@router.post("/logout")
def logout(request: Request, db: Session = Depends(get_db), user=Depends(get_current_user)):
    client_meta = get_client_meta(request)
    record_event(db, "LOGOUT", actor=user, metadata={}, **client_meta)
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserOut)
def me(user=Depends(get_current_user)):
    return user
