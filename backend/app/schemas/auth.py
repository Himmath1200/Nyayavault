import uuid

from pydantic import BaseModel, EmailStr

from app.models.enums import UserRole
from app.schemas.common import ORMModel


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_device: bool = False


class MFAVerifyRequest(BaseModel):
    email: EmailStr
    code: str


class UserOut(ORMModel):
    id: uuid.UUID
    email: str
    full_name: str
    badge_id: str
    role: UserRole
    department: str
    is_active: bool
    mfa_enabled: bool
    is_demo_account: bool


class LoginResponse(BaseModel):
    mfa_required: bool
    mfa_token: str | None = None
    access_token: str | None = None
    refresh_token: str | None = None
    user: UserOut | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserOut


class RefreshRequest(BaseModel):
    refresh_token: str


class StepUpVerifyRequest(BaseModel):
    code: str
    context: str = ""


class StepUpVerifyResponse(BaseModel):
    verified: bool
