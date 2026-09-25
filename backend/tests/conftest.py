import os
import tempfile

import pytest

_tmp_dir = tempfile.mkdtemp(prefix="nyayavault_test_")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp_dir}/test.db"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["GEMINI_ENABLED"] = "false"
os.environ["UPLOAD_DIR"] = os.path.join(_tmp_dir, "uploads")
os.environ["MAX_UPLOAD_SIZE"] = "26214400"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"

from fastapi.testclient import TestClient  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.database.base import Base  # noqa: E402
from app.database.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models.enums import UserRole  # noqa: E402
from app.models.user import User  # noqa: E402

DEMO_PASSWORD = "Demo@1234"


@pytest.fixture(scope="session", autouse=True)
def _create_schema():
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def make_user(db, email: str, role: UserRole) -> User:
    existing = db.query(User).filter(User.email == email).one_or_none()
    if existing:
        return existing
    user = User(
        email=email, full_name=email.split("@")[0], badge_id=email[:20], role=role,
        hashed_password=hash_password(DEMO_PASSWORD), is_demo_account=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login(client, email: str) -> str:
    resp = client.post("/api/auth/login", json={"email": email, "password": DEMO_PASSWORD})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    if not data["mfa_required"]:
        return data["access_token"]
    mfa_resp = client.post("/api/auth/mfa/verify", json={"email": email, "code": "123456"})
    assert mfa_resp.status_code == 200, mfa_resp.text
    return mfa_resp.json()["access_token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
