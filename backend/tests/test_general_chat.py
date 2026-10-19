from types import SimpleNamespace

from app.crud.crud_chat import add_chat_message_and_respond
from app.database import SessionLocal
from app.schemas.chat import ChatMessageCreate
from app.services.rag_assistant import answer_auto_query, auto_route


def test_auto_route_is_conservative_and_only_explicit_hybrid():
    assert auto_route("Explain credit risk in general") == "general"
    assert auto_route("ما معنى مخاطر الائتمان بشكل عام؟") == "general"
    assert auto_route("What is the limit according to the policy?") == "grounded"
    assert auto_route("اشرح الحد حسب اللائحة") == "grounded"
    assert auto_route("What is the limit?") == "grounded"
    assert auto_route("ما هو الحد؟") == "grounded"
    assert auto_route("Tell me something") == "grounded"
    assert auto_route("What is the limit according to policy and explain why it matters?") == "hybrid"
    assert auto_route("ما الحد حسب اللائحة واشرح أهميته؟") == "hybrid"


def test_chat_mode_allowlist_includes_auto():
    assert ChatMessageCreate(text="Question").mode == "auto"
    assert ChatMessageCreate(text="Question", mode="grounded").mode == "grounded"
    assert ChatMessageCreate(text="Question", mode="general").mode == "general"


def test_auto_query_calls_only_one_isolated_path(monkeypatch):
    calls = []
    class FakeAuto:
        def answer(self, query):
            calls.append(("auto", query))
            return "routed"

    monkeypatch.setattr("app.services.rag_assistant.get_auto_assistant", lambda: FakeAuto())

    assert answer_auto_query("Explain credit risk in general") == "routed"
    assert answer_auto_query("What is the limit according to the policy?") == "routed"
    assert answer_auto_query("What is the limit according to policy and explain why it matters?") == "routed"
    assert calls == [
        ("auto", "Explain credit risk in general"),
        ("auto", "What is the limit according to the policy?"),
        ("auto", "What is the limit according to policy and explain why it matters?"),
    ]


def test_hybrid_chat_persists_typed_segments(monkeypatch):
    hybrid = SimpleNamespace(
        answer="The sourced answer.\n\nThe general explanation.",
        answer_mode="hybrid",
        provenance="mixed",
        disclaimer=None,
        segments=[
            SimpleNamespace(text="The sourced answer.", source_type="retrieved", citation_handles=["E1"], support_status="supported"),
            SimpleNamespace(text="The general explanation.", source_type="ai_generated", citation_handles=[], support_status="inference"),
        ],
    )
    class FakeAuto:
        def answer(self, query):
            return hybrid

    monkeypatch.setattr("app.services.rag_assistant.get_auto_assistant", lambda: FakeAuto())
    monkeypatch.setattr("app.services.rag_assistant.answer_citations", lambda answer: [{"documentName": "Policy", "documentNameEn": "Policy", "page": 1, "quote": "evidence"}])
    db = SessionLocal()
    try:
        _, assistant = add_chat_message_and_respond(
            db,
            "sess_1",
            ChatMessageCreate(text="What is the limit according to policy and explain why it matters?", mode="auto"),
        )
        assert assistant.answer_mode == "hybrid"
        assert assistant.provenance == "mixed"
        assert assistant.segments[0]["sourceType"] == "retrieved"
        assert assistant.segments[1]["sourceType"] == "ai_generated"
        assert assistant.segments[1]["citationHandles"] == []
    finally:
        db.close()


def test_general_chat_mode_persists_ai_provenance_without_citations(monkeypatch):
    expected = SimpleNamespace(
        answer="A general explanation.",
        answer_mode="general",
        provenance="ai_generated",
        disclaimer="AI-generated answer; not retrieved from CrediX documents.",
    )

    def fake_general(query):
        assert query == "Explain credit risk"
        return expected

    monkeypatch.setattr("app.services.rag_assistant.answer_general_query", fake_general, raising=False)
    db = SessionLocal()
    try:
        user, assistant = add_chat_message_and_respond(
            db,
            "sess_1",
            ChatMessageCreate(text="Explain credit risk", mode="general"),
        )
        assert user.sender == "user"
        assert assistant.text == expected.answer
        assert assistant.citations == []
        assert assistant.answer_mode == "general"
        assert assistant.provenance == "ai_generated"
        assert assistant.disclaimer == expected.disclaimer
    finally:
        db.close()
