import io

from app.models.enums import UserRole
from tests.conftest import auth_headers, login, make_user


def _create_case(client, token):
    resp = client.post(
        "/api/cases",
        headers=auth_headers(token),
        json={"title": "View vs Download Test Case", "category": "Digital Fraud Investigation", "jurisdiction": "Test District"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _upload_document(client, token, case_id):
    resp = client.post(
        "/api/documents/upload",
        headers=auth_headers(token),
        data={"case_id": case_id, "document_type": "INVESTIGATION_REPORT", "classification": "INTERNAL"},
        files={"file": ("report.txt", io.BytesIO(b"Synthetic report content for view-vs-download test."), "text/plain")},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _run(client, db, role: UserRole, purpose: str):
    """Regression test helper: a role holding DOCUMENT_VIEW without DOCUMENT_DOWNLOAD (System
    Admin, Auditor, Read-Only Reviewer) must still be able to open a document's content — the
    "access granted but nothing opens" bug — while /download for the same document and role
    stays correctly forbidden."""
    make_user(db, "io_owner_vd@nyayavault.demo", UserRole.INVESTIGATING_OFFICER)
    owner_token = login(client, "io_owner_vd@nyayavault.demo")
    case = _create_case(client, owner_token)
    upload = _upload_document(client, owner_token, case["id"])
    document_id = upload["document"]["id"]

    viewer_email = f"viewer_{role.value.lower()}@nyayavault.demo"
    make_user(db, viewer_email, role)
    viewer_token = login(client, viewer_email)

    view_resp = client.get(f"/api/documents/{document_id}/view", headers=auth_headers(viewer_token), params={"purpose": purpose})
    assert view_resp.status_code == 200, view_resp.text
    assert view_resp.content == b"Synthetic report content for view-vs-download test."

    download_resp = client.get(f"/api/documents/{document_id}/download", headers=auth_headers(viewer_token), params={"purpose": purpose})
    assert download_resp.status_code == 403, download_resp.text


def test_auditor_can_view_but_not_download(client, db):
    _run(client, db, UserRole.AUDITOR, "ADMINISTRATIVE_REVIEW")


def test_system_admin_can_view_but_not_download(client, db):
    _run(client, db, UserRole.SYSTEM_ADMIN, "ADMINISTRATIVE_REVIEW")


def test_investigating_officer_with_download_permission_can_download(client, db):
    make_user(db, "io_full_vd@nyayavault.demo", UserRole.INVESTIGATING_OFFICER)
    token = login(client, "io_full_vd@nyayavault.demo")
    case = _create_case(client, token)
    upload = _upload_document(client, token, case["id"])
    document_id = upload["document"]["id"]

    resp = client.get(f"/api/documents/{document_id}/download", headers=auth_headers(token), params={"purpose": "INVESTIGATION"})
    assert resp.status_code == 200
    assert resp.headers["content-disposition"].startswith("attachment")

    view_resp = client.get(f"/api/documents/{document_id}/view", headers=auth_headers(token), params={"purpose": "INVESTIGATION"})
    assert view_resp.status_code == 200
    assert view_resp.headers["content-disposition"].startswith("inline")
