import io
import uuid

from app.ai.gemini_service import gemini_service
from app.documents.storage import storage
from app.models.document import Document
from app.models.enums import UserRole
from app.models.evidence import EvidenceItem
from tests.conftest import auth_headers, login, make_user


def _create_case(client, token):
    resp = client.post(
        "/api/cases",
        headers=auth_headers(token),
        json={"title": "Test Case", "category": "Digital Fraud Investigation", "jurisdiction": "Test District"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _upload_document(client, token, case_id, classification="SEALED"):
    resp = client.post(
        "/api/documents/upload",
        headers=auth_headers(token),
        data={"case_id": case_id, "document_type": "EVIDENCE_RECORD", "classification": classification},
        files={"file": ("evidence.txt", io.BytesIO(b"Synthetic evidence content for testing."), "text/plain")},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_unauthorized_user_cannot_access_restricted_document(client, db):
    make_user(db, "io_restrict@nyayavault.demo", UserRole.INVESTIGATING_OFFICER)
    make_user(db, "reviewer_restrict@nyayavault.demo", UserRole.READ_ONLY_REVIEWER)
    officer_token = login(client, "io_restrict@nyayavault.demo")
    reviewer_token = login(client, "reviewer_restrict@nyayavault.demo")

    case = _create_case(client, officer_token)
    upload = _upload_document(client, officer_token, case["id"], classification="SEALED")
    document_id = upload["document"]["id"]

    # A read-only reviewer is not assigned to this case AND the reviewer's classification
    # ceiling (INTERNAL) is far below SEALED, so both checks should independently deny access.
    check = client.get(
        f"/api/documents/{document_id}/access-check",
        headers=auth_headers(reviewer_token),
        params={"purpose": "ADMINISTRATIVE_REVIEW", "action": "VIEW"},
    )
    assert check.status_code == 200
    decision = check.json()
    assert decision["granted"] is False
    assert len(decision["reasons"]) > 0

    download = client.get(
        f"/api/documents/{document_id}/download",
        headers=auth_headers(reviewer_token),
        params={"purpose": "ADMINISTRATIVE_REVIEW"},
    )
    assert download.status_code == 403


def test_sealed_evidence_cannot_be_modified(client, db):
    make_user(db, "io_seal@nyayavault.demo", UserRole.INVESTIGATING_OFFICER)
    officer_token = login(client, "io_seal@nyayavault.demo")

    case = _create_case(client, officer_token)
    upload = _upload_document(client, officer_token, case["id"], classification="HIGHLY_CONFIDENTIAL")
    assert upload["document"]["is_sealed"] is True
    assert upload["document"]["custody_status"] == "SEALED"

    # No route exists that allows modifying a document's stored content — sealing is
    # structural, not just a flag checked by a single endpoint.
    route_paths_and_methods = {(r.path, m) for r in client.app.routes for m in getattr(r, "methods", set()) if "documents" in r.path}
    mutating_content_routes = {
        (path, method) for path, method in route_paths_and_methods
        if method in ("PUT", "PATCH") and "{document_id}" in path and "verify" not in path
    }
    assert mutating_content_routes == set()


def test_tampered_file_produces_integrity_failure(client, db):
    make_user(db, "io_tamper@nyayavault.demo", UserRole.INVESTIGATING_OFFICER)
    officer_token = login(client, "io_tamper@nyayavault.demo")

    case = _create_case(client, officer_token)
    upload = _upload_document(client, officer_token, case["id"], classification="INTERNAL")
    document_id = upload["document"]["id"]

    ok_verify = client.post(f"/api/documents/{document_id}/verify", headers=auth_headers(officer_token))
    assert ok_verify.status_code == 200
    assert ok_verify.json()["match"] is True
    assert ok_verify.json()["integrity_status"] == "VERIFIED"

    document = db.get(Document, uuid.UUID(document_id))
    storage.save(b"TAMPERED CONTENT - bytes altered after sealing", document.file_path)

    tampered_verify = client.post(f"/api/documents/{document_id}/verify", headers=auth_headers(officer_token))
    assert tampered_verify.status_code == 200
    result = tampered_verify.json()
    assert result["match"] is False
    assert result["integrity_status"] == "FAILED"
    assert result["requires_investigation"] is True


def test_audit_events_cannot_be_deleted_through_api(client, db):
    make_user(db, "auditor_del@nyayavault.demo", UserRole.AUDITOR)
    token = login(client, "auditor_del@nyayavault.demo")

    audit_route_methods = {m for r in client.app.routes if r.path.startswith("/api/audit") for m in getattr(r, "methods", set())}
    assert "DELETE" not in audit_route_methods
    assert "PUT" not in audit_route_methods
    assert "PATCH" not in audit_route_methods

    listing = client.get("/api/audit", headers=auth_headers(token))
    assert listing.status_code == 200

    chain = client.get("/api/audit/chain-integrity", headers=auth_headers(token))
    assert chain.status_code == 200
    assert chain.json()["intact"] is True


def test_gemini_failure_does_not_crash_application():
    class ExplodingClient:
        class models:
            @staticmethod
            def generate_content(*args, **kwargs):
                raise RuntimeError("simulated Gemini outage")

    original_client = gemini_service._client
    try:
        gemini_service._client = ExplodingClient()
        classification, is_live = gemini_service.classify_document("FIRST INFORMATION REPORT sample text", "test.txt")
        assert is_live is False
        assert classification.document_type
    finally:
        gemini_service._client = original_client
