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
        if token == "officer-token":
            return AuthClaims(sub="supabase-officer-01", email="mohamed.sami@credix.bank.eg", email_verified=True,
                              aud="authenticated", iss="https://example.supabase.co/auth/v1", exp=4_102_444_800)
        if token == "client-token":
            return AuthClaims(sub="supabase-client-01", email="ahmed.fouad@gmail.com", email_verified=True,
                              aud="authenticated", iss="https://example.supabase.co/auth/v1", exp=4_102_444_800)
        if token == "other-client-token":
            return AuthClaims(sub="supabase-client-02", email="other.client@example.com", email_verified=True,
                              aud="authenticated", iss="https://example.supabase.co/auth/v1", exp=4_102_444_800)
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


@pytest.fixture
def as_officer(auth_verifier_override):
    """Officer (usr_officer_01) mapped to a stubbed Supabase subject."""
    _map_subject("usr_officer_01", "supabase-officer-01")
    return {"Authorization": "Bearer officer-token"}


@pytest.fixture
def as_client(auth_verifier_override):
    """Seeded client (usr_client_01), owner of APP-2026-0839."""
    _map_subject("usr_client_01", "supabase-client-01")
    return {"Authorization": "Bearer client-token"}


@pytest.fixture
def as_other_client(auth_verifier_override):
    """A second client that owns nothing."""
    db = SessionLocal()
    try:
        db.add(User(id="usr_client_02", name="Other", name_en="Other", email="other.client@example.com",
                    external_auth_id="supabase-client-02", role="client"))
        db.commit()
    finally:
        db.close()
    return {"Authorization": "Bearer other-client-token"}


def _map_subject(user_id: str, subject: str) -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).one()
        user.external_auth_id = subject
        db.commit()
    finally:
        db.close()


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


def test_auth_and_users(as_officer):
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
    assert client.get("/api/v1/users").status_code == 401
    users = client.get("/api/v1/users", headers=as_officer)
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


def test_applications_crud_and_decision(as_officer):
    # List applications
    res = client.get("/api/v1/applications", headers=as_officer)
    assert res.status_code == 200
    apps = res.json()
    assert len(apps) >= 1

    # Get specific application
    app_id = "APP-2026-0839"
    detail = client.get(f"/api/v1/applications/{app_id}", headers=as_officer)
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
    create_res = client.post("/api/v1/applications", json=new_app, headers=as_officer)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["applicantName"] == "طارق محمود"
    created_id = created["id"]

    # Process officer decision
    decision_res = client.post(
        f"/api/v1/applications/{created_id}/decision",
        json={"decision": "approve", "notes": "تمت الموافقة بعد استيفاء الشروط"},
        headers=as_officer,
    )
    assert decision_res.status_code == 200
    assert decision_res.json()["status"] == "approved"


def test_documents_endpoints(as_officer):
    docs = client.get("/api/v1/documents", headers=as_officer)
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
    create_doc = client.post("/api/v1/documents", json=new_doc, headers=as_officer)
    assert create_doc.status_code == 201
    doc_id = create_doc.json()["id"]

    # Get document
    get_doc = client.get(f"/api/v1/documents/{doc_id}", headers=as_officer)
    assert get_doc.status_code == 200
    assert get_doc.json()["code"] == "TAX"


def test_fraud_endpoints(as_officer):
    fraud_cases = client.get("/api/v1/fraud/cases", headers=as_officer)
    assert fraud_cases.status_code == 200
    assert isinstance(fraud_cases.json(), list)

    signals = client.get("/api/v1/fraud/signals", headers=as_officer)
    assert signals.status_code == 200
    assert len(signals.json()) > 0


def test_cases_kanban_crud(as_officer):
    cases = client.get("/api/v1/cases", headers=as_officer)
    assert cases.status_code == 200
    assert len(cases.json()) >= 6

    # Create case
    new_case = {
        "clientName": "حسن الشناوي",
        "amount": 500000,
        "stageTag": "استخراج البيانات",
        "columnId": "processing",
    }
    create_res = client.post("/api/v1/cases", json=new_case, headers=as_officer)
    assert create_res.status_code == 201
    case_id = create_res.json()["id"]

    # Move case to human_review
    patch_res = client.patch(
        f"/api/v1/cases/{case_id}",
        json={"columnId": "human_review", "stageTag": "مراجعة يدوية"},
        headers=as_officer,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["columnId"] == "human_review"


def test_ai_assistant_chat(as_officer):
    sessions = client.get("/api/v1/ai-assistant/sessions", headers=as_officer)
    assert sessions.status_code == 200
    assert len(sessions.json()) >= 3

    sess_id = "sess_1"
    messages = client.get(f"/api/v1/ai-assistant/sessions/{sess_id}/messages", headers=as_officer)
    assert messages.status_code == 200
    assert len(messages.json()) >= 3

    # Send prompt
    send_res = client.post(
        f"/api/v1/ai-assistant/sessions/{sess_id}/messages",
        json={"text": "هل توجد متناقضات في كشف الحساب؟"},
        headers=as_officer,
    )
    assert send_res.status_code == 200
    history = send_res.json()
    assert len(history) == 2  # [user_msg, bot_msg]
    assert history[0]["sender"] == "user"
    assert history[1]["sender"] == "assistant"
    assert len(history[1]["citations"]) > 0


def test_dashboard_analytics(as_officer):
    stats = client.get("/api/v1/dashboard/stats", headers=as_officer)
    assert stats.status_code == 200
    data = stats.json()
    assert data["totalApplications"] > 0
    assert data["approvalRate"] > 0

    trends = client.get("/api/v1/dashboard/trends", headers=as_officer)
    assert trends.status_code == 200
    assert len(trends.json()) == 30

    donut = client.get("/api/v1/dashboard/status-distribution", headers=as_officer)
    assert donut.status_code == 200
    assert len(donut.json()) == 4

    loan_types = client.get("/api/v1/dashboard/loan-types", headers=as_officer)
    assert loan_types.status_code == 200
    assert len(loan_types.json()) == 4



# ---------------------------------------------------------------------------
# Authorization: every business route requires a verified identity and a role.
# ---------------------------------------------------------------------------

OFFICER_ONLY_ROUTES = [
    ("get", "/api/v1/users"),
    ("post", "/api/v1/users"),
    ("get", "/api/v1/fraud/cases"),
    ("get", "/api/v1/fraud/signals"),
    ("get", "/api/v1/cases"),
    ("get", "/api/v1/cases/any"),
    ("post", "/api/v1/cases"),
    ("patch", "/api/v1/cases/any"),
    ("delete", "/api/v1/cases/any"),
    ("get", "/api/v1/dashboard/stats"),
    ("get", "/api/v1/dashboard/trends"),
    ("get", "/api/v1/dashboard/status-distribution"),
    ("get", "/api/v1/dashboard/loan-types"),
    ("get", "/api/v1/ai-assistant/sessions"),
    ("post", "/api/v1/ai-assistant/sessions"),
    ("get", "/api/v1/ai-assistant/sessions/sess_1"),
    ("get", "/api/v1/ai-assistant/sessions/sess_1/messages"),
    ("post", "/api/v1/ai-assistant/sessions/sess_1/messages"),
    ("delete", "/api/v1/ai-assistant/sessions/sess_1"),
    ("patch", "/api/v1/applications/APP-2026-0839"),
    ("post", "/api/v1/applications/APP-2026-0839/decision"),
    ("delete", "/api/v1/applications/APP-2026-0839"),
    ("get", "/api/v1/applications/APP-2026-0839/audit"),
    ("delete", "/api/v1/documents/any"),
]

AUTHENTICATED_ROUTES = [
    ("get", "/api/v1/applications"),
    ("get", "/api/v1/applications/APP-2026-0839"),
    ("post", "/api/v1/applications"),
    ("get", "/api/v1/documents"),
    ("get", "/api/v1/documents/any"),
    ("post", "/api/v1/documents"),
]


@pytest.mark.parametrize("method,path", OFFICER_ONLY_ROUTES + AUTHENTICATED_ROUTES)
def test_business_routes_reject_anonymous_requests(method, path):
    response = getattr(client, method)(path)
    assert response.status_code == 401, f"{method.upper()} {path} must require a Bearer token"


@pytest.mark.parametrize("method,path", OFFICER_ONLY_ROUTES)
def test_officer_only_routes_reject_clients(method, path, as_client):
    response = getattr(client, method)(path, headers=as_client)
    assert response.status_code == 403, f"{method.upper()} {path} must be officer-only"
    assert response.json()["detail"]["code"] == "INSUFFICIENT_ROLE"


def test_client_only_sees_own_applications(as_client, as_other_client):
    own = client.get("/api/v1/applications", headers=as_client)
    assert own.status_code == 200
    assert [a["id"] for a in own.json()] == ["APP-2026-0839"]

    other = client.get("/api/v1/applications", headers=as_other_client)
    assert other.status_code == 200
    assert other.json() == []


def test_client_cannot_read_someone_elses_application_or_documents(as_client, as_other_client, as_officer):
    assert client.get("/api/v1/applications/APP-2026-0839", headers=as_client).status_code == 200

    # 404 (not 403) so application IDs cannot be enumerated.
    assert client.get("/api/v1/applications/APP-2026-0839", headers=as_other_client).status_code == 404

    # Applications owned by nobody are invisible to every client.
    unowned = client.get("/api/v1/applications/APP-2026-0841", headers=as_client)
    assert unowned.status_code == 404

    own_docs = client.get("/api/v1/documents", headers=as_client).json()
    assert len(own_docs) > 0
    assert all(d["applicationId"] == "APP-2026-0839" for d in own_docs)
    assert client.get("/api/v1/documents", headers=as_other_client).json() == []
    assert client.get(f"/api/v1/documents/{own_docs[0]['id']}", headers=as_other_client).status_code == 404

    # Officers still see everything.
    assert len(client.get("/api/v1/applications", headers=as_officer).json()) >= 6


def test_client_submission_is_owned_by_caller_and_ignores_client_supplied_id(as_client, as_other_client):
    payload = {
        "id": "APP-2026-0839",  # attempt to collide with / overwrite an existing record
        "applicantName": "عميل جديد",
        "nationalId": "29901010107788",
        "mobileNumber": "01098765432",
        "loanType": "personal",
        "requestedAmount": 100000,
    }
    created = client.post("/api/v1/applications", json=payload, headers=as_client)
    assert created.status_code == 201
    new_id = created.json()["id"]
    assert new_id != "APP-2026-0839"

    assert client.get(f"/api/v1/applications/{new_id}", headers=as_client).status_code == 200
    assert client.get(f"/api/v1/applications/{new_id}", headers=as_other_client).status_code == 404

    db = SessionLocal()
    try:
        from app.models.application import LoanApplication
        assert db.query(LoanApplication).filter(LoanApplication.id == new_id).one().applicant_id == "usr_client_01"
    finally:
        db.close()


def test_client_documents_must_target_an_owned_application(as_client):
    body = {"name": "بطاقة", "nameEn": "ID", "code": "ID"}
    assert client.post("/api/v1/documents", json=body, headers=as_client).status_code == 404
    assert client.post(
        "/api/v1/documents", json={**body, "applicationId": "APP-2026-0841"}, headers=as_client
    ).status_code == 404
    ok = client.post("/api/v1/documents", json={**body, "applicationId": "APP-2026-0839"}, headers=as_client)
    assert ok.status_code == 201
    assert ok.json()["applicationId"] == "APP-2026-0839"


def test_officer_decision_value_is_validated(as_officer):
    response = client.post(
        "/api/v1/applications/APP-2026-0839/decision", json={"decision": "hack"}, headers=as_officer
    )
    assert response.status_code == 422


def test_chat_sessions_are_scoped_to_their_officer(as_officer):
    created = client.post("/api/v1/ai-assistant/sessions", json={"title": "جلسة جديدة"}, headers=as_officer)
    assert created.status_code == 201

    db = SessionLocal()
    try:
        db.add(User(id="usr_officer_02", name="ضابط", name_en="Officer Two", email="o2@credix.bank.eg", role="officer"))
        from app.models.chat import ChatSession
        db.add(ChatSession(id="sess_foreign", user_id="usr_officer_02", title="x", title_en="x"))
        db.commit()
    finally:
        db.close()

    ids = [s["id"] for s in client.get("/api/v1/ai-assistant/sessions", headers=as_officer).json()]
    assert "sess_foreign" not in ids
    assert created.json()["id"] in ids
    assert client.get("/api/v1/ai-assistant/sessions/sess_foreign", headers=as_officer).status_code == 404


def test_legacy_login_is_disabled_by_default_config(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "ENABLE_LEGACY_LOGIN", False)
    assert client.post("/api/v1/auth/login", json={"role": "officer"}).status_code == 404


def test_public_users_endpoint_cannot_create_privileged_profiles(as_client):
    body = {"name": "x", "nameEn": "x", "email": "evil@example.com", "role": "officer"}
    assert client.post("/api/v1/users", json=body).status_code == 401
    assert client.post("/api/v1/users", json=body, headers=as_client).status_code == 403


def test_production_settings_fail_fast():
    from pydantic import ValidationError
    from app.config import Settings

    # Explicit values so the suite's own ENABLE_LEGACY_LOGIN=true env var cannot leak in.
    base = {
        "APP_ENV": "production",
        "DATABASE_URL": "postgresql+psycopg://u:p@db/credix",
        "ENABLE_LEGACY_LOGIN": False,
    }
    with pytest.raises(ValidationError):
        Settings(**base, SUPABASE_URL="")  # no SUPABASE_URL
    with pytest.raises(ValidationError):
        Settings(**{**base, "ENABLE_LEGACY_LOGIN": True}, SUPABASE_URL="https://x.supabase.co")
    with pytest.raises(ValidationError):
        Settings(**{**base, "DATABASE_URL": "sqlite:///./x.db"}, SUPABASE_URL="https://x.supabase.co")
    assert Settings(**base, SUPABASE_URL="https://x.supabase.co").is_production


# ---------------------------------------------------------------------------
# New hardening tests
# ---------------------------------------------------------------------------

def _payload(**overrides):
    base = {"applicantName": "عميل اختبار", "nationalId": "29901010107788",
            "mobileNumber": "01098765432", "loanType": "personal", "requestedAmount": 100000}
    return {**base, **overrides}


def test_generated_ids_are_unguessable(as_officer):
    import re
    ids = {client.post("/api/v1/applications", json=_payload(), headers=as_officer).json()["id"] for _ in range(5)}
    assert len(ids) == 5 and all(re.fullmatch(r"APP-\d{4}-[0-9A-F]{8}", i) for i in ids)


@pytest.mark.parametrize("bad", [{"requestedAmount": 0}, {"tenureMonths": 999},
                                 {"nationalId": "123"}, {"mobileNumber": "02098765432"}])
def test_application_input_is_validated(bad, as_officer):
    assert client.post("/api/v1/applications", json=_payload(**bad), headers=as_officer).status_code == 422


def test_patch_cannot_change_status_or_scores(as_officer):
    for body in ({"status": "approved"}, {"creditScore": 99}, {"fraudRiskScore": 1}):
        assert client.patch("/api/v1/applications/APP-2026-0839", json=body, headers=as_officer).status_code == 422


def test_decision_is_audited_final_and_keeps_ai_recommendation(as_officer):
    created = client.post("/api/v1/applications", json=_payload(), headers=as_officer).json()
    app_id, ai_before = created["id"], created["aiRecommendation"]

    res = client.post(f"/api/v1/applications/{app_id}/decision",
                      json={"decision": "reject", "notes": "دخل غير مثبت"}, headers=as_officer).json()
    assert res["status"] == "rejected" and res["finalDecision"] == "reject"
    assert res["decidedBy"] == "usr_officer_01" and res["aiRecommendation"] == ai_before

    assert client.post(f"/api/v1/applications/{app_id}/decision",
                       json={"decision": "approve"}, headers=as_officer).status_code == 409

    trail = client.get(f"/api/v1/applications/{app_id}/audit", headers=as_officer).json()
    assert [e["action"] for e in trail] == ["created", "decision"]
    assert trail[-1]["previousStatus"] == "under_review" and trail[-1]["newStatus"] == "rejected"

    assert client.delete(f"/api/v1/applications/{app_id}", headers=as_officer).status_code == 204
    after = client.get(f"/api/v1/applications/{app_id}/audit", headers=as_officer).json()
    assert [e["action"] for e in after] == ["created", "decision", "deleted"]


def test_timestamps_are_utc_aware_iso(as_officer):
    from datetime import datetime
    d = client.get("/api/v1/applications/APP-2026-0839", headers=as_officer).json()
    for v in (d["submittedAt"], d["updatedAt"], d["documents"][0]["uploadedAt"], d["timeline"][0]["createdAt"]):
        assert datetime.fromisoformat(v.replace("Z", "+00:00")).utcoffset() is not None

