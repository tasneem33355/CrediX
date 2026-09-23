"""Automated Test Suite for CrediX FastAPI Backend."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.auth.claims import AuthClaims
from app.auth.dependencies import get_jwt_verifier, require_role
from app.auth.jwt_verifier import SupabaseJWTVerificationError
from app.database import SessionLocal
from app.models.user import User
client = TestClient(app)


class StubJWTVerifier:
    """Network-free verifier stub used only at the FastAPI dependency boundary."""

    def verify_access_token(self, token: str) -> AuthClaims:
        if token in {"invalid", "expired", "wrong-issuer", "wrong-audience"}:
            raise SupabaseJWTVerificationError()
        if token == "mapped":
            return AuthClaims(
                sub="supabase-user-mapped",
                email="mohamed.sami@credix.bank.eg",
                aud="authenticated",
                iss="https://example.supabase.co/auth/v1",
                exp=4_102_444_800,
            )
        if token == "unknown-profile":
            return AuthClaims(
                sub="supabase-user-unknown",
                email="unknown@example.com",
                aud="authenticated",
                iss="https://example.supabase.co/auth/v1",
                exp=4_102_444_800,
            )
        if token == "provision-client":
            return AuthClaims(
                sub="supabase-user-new-client",
                email="new.client@example.com",
                email_verified=True,
                user_metadata={"full_name": "New Client"},
                aud="authenticated",
                iss="https://example.supabase.co/auth/v1",
                exp=4_102_444_800,
            )
        if token == "provision-client-repeat":
            return AuthClaims(
                sub="supabase-user-new-client",
                email="new.client@example.com",
                email_verified=True,
                user_metadata={"full_name": "Changed Name Must Not Duplicate"},
                aud="authenticated",
                iss="https://example.supabase.co/auth/v1",
                exp=4_102_444_800,
            )
        if token == "privileged-email":
            return AuthClaims(
                sub="supabase-user-privileged-collision",
                email="mohamed.sami@credix.bank.eg",
                email_verified=True,
                user_metadata={"full_name": "Attempted Takeover"},
                aud="authenticated",
                iss="https://example.supabase.co/auth/v1",
                exp=4_102_444_800,
            )
        if token == "unverified":
            return AuthClaims(
                sub="supabase-user-unverified",
                email="unverified@example.com",
                email_verified=False,
                aud="authenticated",
                iss="https://example.supabase.co/auth/v1",
                exp=4_102_444_800,
            )
        raise SupabaseJWTVerificationError()


@pytest.fixture
def auth_verifier_override():
    app.dependency_overrides[get_jwt_verifier] = lambda: StubJWTVerifier()
    try:
        yield
    finally:
        app.dependency_overrides.pop(get_jwt_verifier, None)


def test_root_and_health():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "online"

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json() == {"status": "ok", "service": "credix-backend"}


def test_app_imports_and_openapi_schema_is_available():
    assert app is not None
    schema = client.get("/openapi.json")
    assert schema.status_code == 200
    assert "/api/v1/applications" in schema.json()["paths"]


def test_local_cors_origin_is_explicitly_allowed():
    response = client.options(
        "/api/v1/applications",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_auth_and_users():
    # Login as officer
    res = client.post("/api/v1/auth/login", json={"role": "officer"})
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "officer"
    assert "Mohamed Sami" in data["nameEn"]

    # Login as client
    res = client.post("/api/v1/auth/login", json={"role": "client"})
    assert res.status_code == 200
    assert res.json()["role"] == "client"

    # List users
    users = client.get("/api/v1/users")
    assert users.status_code == 200
    assert len(users.json()) >= 2


def test_auth_me_requires_bearer_token():
    missing = client.get("/api/v1/auth/me")
    assert missing.status_code == 401

    malformed = client.get("/api/v1/auth/me", headers={"Authorization": "Token abc"})
    assert malformed.status_code == 401


@pytest.mark.parametrize("token", ["invalid", "expired", "wrong-issuer", "wrong-audience"])
def test_auth_me_rejects_invalid_verified_tokens(token, auth_verifier_override):
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_auth_me_returns_profile_for_mapped_subject(auth_verifier_override):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == "usr_officer_01").one()
        user.external_auth_id = "supabase-user-mapped"
        db.commit()
    finally:
        db.close()

    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer mapped"})
    assert response.status_code == 200
    assert response.json()["id"] == "usr_officer_01"
    assert response.json()["role"] == "officer"


def test_auth_me_rejects_unprovisioned_profile(auth_verifier_override):
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer unknown-profile"})
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "PROFILE_NOT_PROVISIONED"


def test_provision_requires_bearer_token():
    response = client.post("/api/v1/auth/provision")
    assert response.status_code == 401


def test_provision_rejects_invalid_token(auth_verifier_override):
    response = client.post("/api/v1/auth/provision", headers={"Authorization": "Bearer invalid"})
    assert response.status_code == 401


def test_provision_creates_client_and_is_idempotent(auth_verifier_override):
    first = client.post(
        "/api/v1/auth/provision",
        headers={"Authorization": "Bearer provision-client"},
        json={"role": "officer"},
    )
    assert first.status_code == 200
    first_data = first.json()
    assert first_data["role"] == "client"
    assert first_data["email"] == "new.client@example.com"
    first_id = first_data["id"]

    second = client.post(
        "/api/v1/auth/provision",
        headers={"Authorization": "Bearer provision-client-repeat"},
    )
    assert second.status_code == 200
    assert second.json()["id"] == first_id

    db = SessionLocal()
    try:
        matches = db.query(User).filter(User.external_auth_id == "supabase-user-new-client").all()
        assert len(matches) == 1
        assert matches[0].role == "client"
    finally:
        db.close()

    me = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer provision-client"})
    assert me.status_code == 200
    assert me.json()["id"] == first_id


def test_provision_never_takes_over_privileged_email(auth_verifier_override):
    response = client.post(
        "/api/v1/auth/provision",
        headers={"Authorization": "Bearer privileged-email"},
    )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "PRIVILEGED_EMAIL_COLLISION"


def test_provision_requires_verified_identity(auth_verifier_override):
    response = client.post("/api/v1/auth/provision", headers={"Authorization": "Bearer unverified"})
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "EMAIL_NOT_VERIFIED"


def test_role_dependency_uses_database_role_only():
    officer = User(id="officer", name="Officer", name_en="Officer", email="officer@example.com", role="officer")
    client_user = User(id="client", name="Client", name_en="Client", email="client@example.com", role="client")
    officer_dependency = require_role("officer")

    assert officer_dependency(officer) is officer
    with pytest.raises(Exception) as error:
        officer_dependency(client_user)
    assert getattr(error.value, "status_code", None) == 403


def test_applications_crud_and_decision():
    # List applications
    res = client.get("/api/v1/applications")
    assert res.status_code == 200
    apps = res.json()
    assert len(apps) >= 1

    # Get specific application
    app_id = "APP-2026-0839"
    detail = client.get(f"/api/v1/applications/{app_id}")
    assert detail.status_code == 200
    app_data = detail.json()
    assert app_data["id"] == app_id
    assert app_data["creditScore"] == 54
    assert len(app_data["documents"]) > 0
    assert len(app_data["timeline"]) > 0

    # Create new application
    new_app = {
        "applicantName": "طارق محمود",
        "applicantNameEn": "Tarek Mahmoud",
        "nationalId": "29901010107788",
        "mobileNumber": "01098765432",
        "clientType": "new",
        "occupation": "مهندس استشاري",
        "occupationEn": "Consulting Engineer",
        "loanType": "personal",
        "requestedAmount": 300000,
        "tenureMonths": 24,
        "purpose": "تجديد وتأثيث عيادة",
    }
    create_res = client.post("/api/v1/applications", json=new_app)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["applicantName"] == "طارق محمود"
    created_id = created["id"]

    # Process officer decision
    decision_res = client.post(
        f"/api/v1/applications/{created_id}/decision",
        json={"decision": "approve", "notes": "تمت الموافقة بعد استيفاء الشروط"},
    )
    assert decision_res.status_code == 200
    assert decision_res.json()["status"] == "approved"


def test_documents_endpoints():
    docs = client.get("/api/v1/documents")
    assert docs.status_code == 200
    assert len(docs.json()) > 0

    # Create document
    new_doc = {
        "name": "إقرار ضريبي 2025",
        "nameEn": "Tax Declaration 2025",
        "code": "TAX",
        "size": "1.8 MB",
        "status": "processing",
    }
    create_doc = client.post("/api/v1/documents", json=new_doc)
    assert create_doc.status_code == 201
    doc_id = create_doc.json()["id"]

    # Get document
    get_doc = client.get(f"/api/v1/documents/{doc_id}")
    assert get_doc.status_code == 200
    assert get_doc.json()["code"] == "TAX"


def test_fraud_endpoints():
    fraud_cases = client.get("/api/v1/fraud/cases")
    assert fraud_cases.status_code == 200
    assert len(fraud_cases.json()) > 0

    signals = client.get("/api/v1/fraud/signals")
    assert signals.status_code == 200
    assert len(signals.json()) > 0


def test_cases_kanban_crud():
    cases = client.get("/api/v1/cases")
    assert cases.status_code == 200
    assert len(cases.json()) >= 6

    # Create case
    new_case = {
        "clientName": "حسن الشناوي",
        "amount": 500000,
        "stageTag": "استخراج البيانات",
        "columnId": "processing",
    }
    create_res = client.post("/api/v1/cases", json=new_case)
    assert create_res.status_code == 201
    case_id = create_res.json()["id"]

    # Move case to human_review
    patch_res = client.patch(
        f"/api/v1/cases/{case_id}",
        json={"columnId": "human_review", "stageTag": "مراجعة يدوية"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["columnId"] == "human_review"


def test_ai_assistant_chat():
    sessions = client.get("/api/v1/ai-assistant/sessions")
    assert sessions.status_code == 200
    assert len(sessions.json()) >= 3

    sess_id = "sess_1"
    messages = client.get(f"/api/v1/ai-assistant/sessions/{sess_id}/messages")
    assert messages.status_code == 200
    assert len(messages.json()) >= 3

    # Send prompt
    send_res = client.post(
        f"/api/v1/ai-assistant/sessions/{sess_id}/messages",
        json={"text": "هل توجد متناقضات في كشف الحساب؟"},
    )
    assert send_res.status_code == 200
    history = send_res.json()
    assert len(history) == 2  # [user_msg, bot_msg]
    assert history[0]["sender"] == "user"
    assert history[1]["sender"] == "assistant"
    assert len(history[1]["citations"]) > 0


def test_dashboard_analytics():
    stats = client.get("/api/v1/dashboard/stats")
    assert stats.status_code == 200
    data = stats.json()
    assert data["totalApplications"] > 0
    assert data["approvalRate"] > 0

    trends = client.get("/api/v1/dashboard/trends")
    assert trends.status_code == 200
    assert len(trends.json()) == 7

    donut = client.get("/api/v1/dashboard/status-distribution")
    assert donut.status_code == 200
    assert len(donut.json()) == 3

    loan_types = client.get("/api/v1/dashboard/loan-types")
    assert loan_types.status_code == 200
    assert len(loan_types.json()) == 4
