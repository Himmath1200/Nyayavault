from app.models.enums import UserRole
from tests.conftest import DEMO_PASSWORD, auth_headers, login, make_user


def test_login_wrong_password_rejected(client, db):
    make_user(db, "wrongpass@nyayavault.demo", UserRole.INVESTIGATING_OFFICER)
    resp = client.post("/api/auth/login", json={"email": "wrongpass@nyayavault.demo", "password": "not-the-password"})
    assert resp.status_code == 401


def test_login_requires_mfa_then_succeeds(client, db):
    make_user(db, "mfauser@nyayavault.demo", UserRole.INVESTIGATING_OFFICER)
    resp = client.post("/api/auth/login", json={"email": "mfauser@nyayavault.demo", "password": DEMO_PASSWORD})
    assert resp.status_code == 200
    assert resp.json()["mfa_required"] is True

    bad_mfa = client.post("/api/auth/mfa/verify", json={"email": "mfauser@nyayavault.demo", "code": "000000"})
    assert bad_mfa.status_code == 401

    good_mfa = client.post("/api/auth/mfa/verify", json={"email": "mfauser@nyayavault.demo", "code": "123456"})
    assert good_mfa.status_code == 200
    assert good_mfa.json()["access_token"]


def test_me_endpoint_requires_token(client, db):
    make_user(db, "meuser@nyayavault.demo", UserRole.AUDITOR)
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401

    token = login(client, "meuser@nyayavault.demo")
    resp = client.get("/api/auth/me", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["email"] == "meuser@nyayavault.demo"


def test_step_up_verify_requires_existing_session_and_correct_code(client, db):
    """Used when a signed-in user (e.g. scanning a certificate's QR code while already
    logged in) re-confirms with just the MFA code, without re-entering their password."""
    make_user(db, "stepup@nyayavault.demo", UserRole.COURT_OFFICER)

    unauth = client.post("/api/auth/step-up-verify", json={"code": "123456"})
    assert unauth.status_code == 401

    token = login(client, "stepup@nyayavault.demo")

    wrong_code = client.post("/api/auth/step-up-verify", headers=auth_headers(token), json={"code": "000000"})
    assert wrong_code.status_code == 401

    right_code = client.post("/api/auth/step-up-verify", headers=auth_headers(token), json={"code": "123456", "context": "qr_test"})
    assert right_code.status_code == 200
    assert right_code.json()["verified"] is True
