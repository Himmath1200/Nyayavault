import io

from app.models.enums import UserRole
from tests.conftest import auth_headers, login, make_user


def _create_case(client, token):
    resp = client.post(
        "/api/cases",
        headers=auth_headers(token),
        json={"title": "Verification Test Case", "category": "Digital Fraud Investigation", "jurisdiction": "Test District"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _upload_document(client, token, case_id):
    resp = client.post(
        "/api/documents/upload",
        headers=auth_headers(token),
        data={"case_id": case_id, "document_type": "EVIDENCE_RECORD", "classification": "SEALED"},
        files={"file": ("evidence.txt", io.BytesIO(b"Synthetic evidence content for certificate test."), "text/plain")},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_certificate_can_be_generated_and_retrieved_by_court_officer(client, db):
    """Regression test: GET /api/certificates/{id} previously crashed with a 500 when the
    path parameter (a plain string) was compared against the UUID-typed `id` column without
    being converted to uuid.UUID first — this broke the certificate view immediately after
    generation for every Court Officer."""
    make_user(db, "io_cert@nyayavault.demo", UserRole.INVESTIGATING_OFFICER)
    make_user(db, "court_cert@nyayavault.demo", UserRole.COURT_OFFICER)
    officer_token = login(client, "io_cert@nyayavault.demo")
    court_token = login(client, "court_cert@nyayavault.demo")

    case = _create_case(client, officer_token)
    upload = _upload_document(client, officer_token, case["id"])
    evidence_id = upload["evidence_id"]

    create_resp = client.post("/api/certificates", headers=auth_headers(court_token), json={"evidence_id": evidence_id})
    assert create_resp.status_code == 201, create_resp.text
    cert = create_resp.json()

    get_resp = client.get(f"/api/certificates/{cert['id']}", headers=auth_headers(court_token))
    assert get_resp.status_code == 200, get_resp.text
    assert get_resp.json()["id"] == cert["id"]

    public_resp = client.get(f"/api/verify/{cert['verification_id']}")
    assert public_resp.status_code == 200, public_resp.text
    assert public_resp.json()["certificate_id"] == cert["certificate_number"]
    # The public metadata page never reveals real object IDs, only human-readable numbers.
    assert cert["document_id"] not in public_resp.text
    assert cert["case_id"] not in public_resp.text


def test_qr_resolve_requires_login_then_opens_document_for_any_authenticated_role(client, db):
    """The public QR page offers a 'sign in to unlock' flow rather than exposing content
    to anonymous scanners. /resolve requires only a valid session (not a specific role like
    COURT_VERIFY) so any authenticated, authorized user — not just court/legal staff — can
    reach the underlying document, exactly as they could from anywhere else in the app."""
    make_user(db, "io_qr@nyayavault.demo", UserRole.INVESTIGATING_OFFICER)
    officer_token = login(client, "io_qr@nyayavault.demo")

    case = _create_case(client, officer_token)
    upload = _upload_document(client, officer_token, case["id"])
    evidence_id = upload["evidence_id"]

    cert = client.post("/api/certificates", headers=auth_headers(officer_token), json={"evidence_id": evidence_id})
    # Investigating Officer lacks CERTIFICATE_GENERATE — use admin-equivalent seed data instead
    # if that 403s; otherwise proceed with the created certificate.
    if cert.status_code != 201:
        make_user(db, "court_qr@nyayavault.demo", UserRole.COURT_OFFICER)
        court_token = login(client, "court_qr@nyayavault.demo")
        cert = client.post("/api/certificates", headers=auth_headers(court_token), json={"evidence_id": evidence_id})
    assert cert.status_code == 201, cert.text
    verification_id = cert.json()["verification_id"]

    unauth_resolve = client.get(f"/api/verify/{verification_id}/resolve")
    assert unauth_resolve.status_code == 401

    resolve_resp = client.get(f"/api/verify/{verification_id}/resolve", headers=auth_headers(officer_token))
    assert resolve_resp.status_code == 200, resolve_resp.text
    document_id = resolve_resp.json()["document_id"]

    doc_resp = client.get(f"/api/documents/{document_id}", headers=auth_headers(officer_token))
    assert doc_resp.status_code == 200, doc_resp.text
