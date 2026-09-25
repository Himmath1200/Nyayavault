import io
import uuid

from app.models.case import CaseMember
from app.models.enums import UserRole
from tests.conftest import auth_headers, login, make_user


def _create_case(client, token):
    resp = client.post(
        "/api/cases",
        headers=auth_headers(token),
        json={"title": "Email Verification Test Case", "category": "Digital Fraud Investigation", "jurisdiction": "Test District"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _upload_document(client, token, case_id, classification):
    resp = client.post(
        "/api/documents/upload",
        headers=auth_headers(token),
        data={"case_id": case_id, "document_type": "INVESTIGATION_REPORT", "classification": classification},
        files={"file": ("report.txt", io.BytesIO(b"Synthetic report content for email verification test."), "text/plain")},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_highly_confidential_document_blocks_download_until_email_verified(client, db):
    # Must be a role whose classification ceiling actually reaches HIGHLY_CONFIDENTIAL
    # (Forensic Officer) — otherwise the base zero-trust decision denies it outright before
    # the email-verification gate is even reached, which is a different code path. Forensic
    # Officer lacks CASE_CREATE, so an Investigating Officer creates the case and the forensic
    # user is added as a case member directly (there's no case-membership API endpoint yet).
    make_user(db, "io_owner_hc@nyayavault.demo", UserRole.INVESTIGATING_OFFICER)
    forensic_user = make_user(db, "forensic_ev@nyayavault.demo", UserRole.FORENSIC_OFFICER)
    owner_token = login(client, "io_owner_hc@nyayavault.demo")
    token = login(client, "forensic_ev@nyayavault.demo")

    case = _create_case(client, owner_token)
    db.add(CaseMember(case_id=uuid.UUID(case["id"]), user_id=forensic_user.id, role_on_case="MEMBER"))
    db.commit()

    upload = _upload_document(client, token, case["id"], "HIGHLY_CONFIDENTIAL")
    document_id = upload["document"]["id"]

    # Forensic Officer's allowed purposes are FORENSIC_ANALYSIS / EVIDENCE_VERIFICATION, not
    # the default INVESTIGATION purpose — pass one explicitly so the base decision is granted
    # and the request actually reaches the new email-verification gate.
    params = {"purpose": "FORENSIC_ANALYSIS"}

    # The base zero-trust decision grants access (assigned to case, role/purpose/classification
    # all within the forensic officer's ceiling) — but content is still withheld.
    blocked = client.get(f"/api/documents/{document_id}/download", headers=auth_headers(token), params=params)
    assert blocked.status_code == 403
    assert blocked.json()["detail"]["requires_email_verification"] is True

    request_resp = client.post(
        f"/api/documents/{document_id}/email-verification/request", headers=auth_headers(token), params=params
    )
    assert request_resp.status_code == 200, request_resp.text
    code = request_resp.json()["demo_code"]
    assert code and len(code) == 6

    wrong_confirm = client.post(
        f"/api/documents/{document_id}/email-verification/confirm", headers=auth_headers(token), json={"code": "000000"}
    )
    assert wrong_confirm.status_code == 401

    right_confirm = client.post(
        f"/api/documents/{document_id}/email-verification/confirm", headers=auth_headers(token), json={"code": code}
    )
    assert right_confirm.status_code == 200, right_confirm.text
    assert right_confirm.json()["verified"] is True

    unlocked = client.get(f"/api/documents/{document_id}/download", headers=auth_headers(token), params=params)
    assert unlocked.status_code == 200
    assert unlocked.content == b"Synthetic report content for email verification test."


def test_email_verification_request_rejected_when_base_access_not_granted(client, db):
    """A user who wouldn't be granted access at all (not assigned to the case) cannot use the
    email-verification endpoint to fish for a code either — step-up narrows access, it can't
    grant access on its own."""
    make_user(db, "io_owner@nyayavault.demo", UserRole.INVESTIGATING_OFFICER)
    make_user(db, "reviewer_ev@nyayavault.demo", UserRole.READ_ONLY_REVIEWER)
    owner_token = login(client, "io_owner@nyayavault.demo")
    reviewer_token = login(client, "reviewer_ev@nyayavault.demo")

    case = _create_case(client, owner_token)
    upload = _upload_document(client, owner_token, case["id"], "HIGHLY_CONFIDENTIAL")
    document_id = upload["document"]["id"]

    resp = client.post(f"/api/documents/{document_id}/email-verification/request", headers=auth_headers(reviewer_token))
    assert resp.status_code == 403


def test_email_verification_not_applicable_to_lower_classifications(client, db):
    make_user(db, "io_low@nyayavault.demo", UserRole.INVESTIGATING_OFFICER)
    token = login(client, "io_low@nyayavault.demo")

    case = _create_case(client, token)
    upload = _upload_document(client, token, case["id"], "INTERNAL")
    document_id = upload["document"]["id"]

    # No email-verification gate for non-HIGHLY_CONFIDENTIAL documents — download succeeds directly.
    direct = client.get(f"/api/documents/{document_id}/download", headers=auth_headers(token))
    assert direct.status_code == 200

    request_resp = client.post(f"/api/documents/{document_id}/email-verification/request", headers=auth_headers(token))
    assert request_resp.status_code == 400
