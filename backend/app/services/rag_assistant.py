"""Lazy bridge from the FastAPI process to the frozen standalone RAG runtime.

The RAG dependencies are intentionally imported only when the first chat
request arrives. This keeps backend startup, migrations, and API tests usable
when the optional GPU/RAG environment is not installed.
"""

from __future__ import annotations

import sys
import re
from functools import lru_cache
from pathlib import Path
from typing import Any


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]


@lru_cache(maxsize=1)
def get_rag_assistant() -> Any:
    """Build one process-local assistant using the repository's frozen config."""

    root = str(REPOSITORY_ROOT)
    if root not in sys.path:
        sys.path.insert(0, root)

    from src.ai_assistant.generation.generator import GroundedRAGAssistant
    from src.ai_assistant.llm.config import LLMSettings
    from src.ai_assistant.llm.factory import get_llm
    from dotenv import load_dotenv

    # FastAPI is normally started from ``backend/`` and its settings file is
    # therefore backend/.env. Load it first, then use the repository .env as a
    # fallback for standalone/local runs. Existing process variables win.
    load_dotenv(REPOSITORY_ROOT / "backend" / ".env", override=False)
    load_dotenv(REPOSITORY_ROOT / ".env", override=False)
    settings = LLMSettings.from_env(dotenv_path=REPOSITORY_ROOT / "backend" / ".env")
    return GroundedRAGAssistant(provider=get_llm(settings))


def answer_query(query: str) -> Any:
    """Run retrieval, reranking, context expansion, and grounded generation."""

    if not isinstance(query, str) or not query.strip():
        raise ValueError("query must be a non-empty string")
    return get_rag_assistant().answer(query.strip())


@lru_cache(maxsize=1)
def get_general_assistant() -> Any:
    """Build the isolated general assistant; it never loads the RAG index."""

    root = str(REPOSITORY_ROOT)
    if root not in sys.path:
        sys.path.insert(0, root)

    from dotenv import load_dotenv
    from src.ai_assistant.generation.general import GeneralAssistant
    from src.ai_assistant.llm.config import LLMSettings
    from src.ai_assistant.llm.factory import get_llm

    load_dotenv(REPOSITORY_ROOT / "backend" / ".env", override=False)
    load_dotenv(REPOSITORY_ROOT / ".env", override=False)
    settings = LLMSettings.from_env(dotenv_path=REPOSITORY_ROOT / "backend" / ".env")
    return GeneralAssistant(provider=get_llm(settings))


def answer_general_query(query: str) -> Any:
    """Run the non-grounded path and return an explicitly AI-generated answer."""

    if not isinstance(query, str) or not query.strip():
        raise ValueError("query must be a non-empty string")
    return get_general_assistant().answer(query.strip())


# Auto routing is intentionally conservative about document claims: an explicit
# document/source intent always wins and uses grounded generation. Explicit
# general intent may use the isolated general path; an explicit source clause
# followed by an explanation clause uses typed hybrid segments.
_GENERAL_INTENT = re.compile(
    # Keep broad fact forms such as "what is the limit?" conservative: they
    # may be asking for a document-specific value, so they stay grounded in
    # Auto mode unless the user explicitly asks for a general explanation.
    r"\b(?:explain|define|meaning of|what does\s+[^?]*\s+mean|in general|generally|concept of)\b"
    r"|(?:اشرح|يعني\s*ايه|ما\s+معنى|بشكل\s+عام|مفهوم)",
    re.IGNORECASE,
)
_HYBRID_INTENT = re.compile(
    r"\s+(?:and|then)\s+(?=(?:explain|tell\s+me|why|how|what\s+does)\b)"
    r"|\s+(?:و|ثم)\s*(?=(?:اشرح|وضح|لماذا|ليه|ما\s+معنى|ازاي)\b)",
    re.IGNORECASE,
)
_SOURCE_INTENT = re.compile(
    r"\b(?:according to|per the|in the document|in our|credi[xs]|policy|policies|regulation|source|evidence|file|case|application|record)\b"
    r"|(?:حسب|وفق|اللائحة|السياسة|المستند|الوثيقة|الملف|الحالة|الطلب|السجل|كشف|الحساب)",
    re.IGNORECASE,
)


def auto_route(query: str) -> str:
    """Return grounded, general, or explicit claim-level hybrid route.

    Source/document intent wins.  Hybrid is selected only when a source clause
    is explicitly followed by an explanation clause; ambiguous text remains
    grounded.  Unsupported evidence is handled by the grounded/hybrid path.
    """

    if not isinstance(query, str) or not query.strip():
        raise ValueError("query must be a non-empty string")
    text = query.strip()
    if _SOURCE_INTENT.search(text):
        if _GENERAL_INTENT.search(text) and _HYBRID_INTENT.search(text):
            return "hybrid"
        return "grounded"
    return "general" if _GENERAL_INTENT.search(text) else "grounded"


def answer_auto_query(query: str) -> Any:
    """Probe, support-check, and route through the isolated Auto assistant."""

    if not isinstance(query, str) or not query.strip():
        raise ValueError("query must be a non-empty string")
    return get_auto_assistant().answer(query.strip())


@lru_cache(maxsize=1)
def get_auto_assistant() -> Any:
    """Build the evidence-first router with one ENV-selected provider."""

    root = str(REPOSITORY_ROOT)
    if root not in sys.path:
        sys.path.insert(0, root)
    from dotenv import load_dotenv
    from src.ai_assistant.llm.config import LLMSettings
    from src.ai_assistant.llm.factory import get_llm
    from src.ai_assistant.routing.router import RoutedAssistant
    from src.ai_assistant.support_gate.gate import EvidenceSupportGate

    load_dotenv(REPOSITORY_ROOT / "backend" / ".env", override=False)
    load_dotenv(REPOSITORY_ROOT / ".env", override=False)
    settings = LLMSettings.from_env(dotenv_path=REPOSITORY_ROOT / "backend" / ".env")
    provider = get_llm(settings)
    return RoutedAssistant(provider=provider, support_gate=EvidenceSupportGate(provider))


def answer_hybrid_query(query: str) -> Any:
    """Run the claim-level hybrid path through the canonical evidence router."""

    if not isinstance(query, str) or not query.strip():
        raise ValueError("query must be a non-empty string")
    if auto_route(query) != "hybrid":
        raise ValueError("query does not contain an explicit hybrid source/explanation request")
    result = get_auto_assistant().answer(query.strip())
    if result.answer_mode != "hybrid":
        raise ValueError("hybrid route did not produce a hybrid answer")
    return result


def answer_citations(answer: Any) -> list[dict[str, Any]]:
    """Convert immutable RAG provenance into the backend chat citation shape."""

    # The grounded response keeps provenance handles separate from source text.
    # Resolve the cited chunk IDs here so the UI can show an auditable excerpt
    # without changing the frozen generation contracts.
    get_chunk = None
    try:
        if str(REPOSITORY_ROOT) not in sys.path:
            sys.path.insert(0, str(REPOSITORY_ROOT))
        from src.rag.retrieval_adapter import get_chunk as retrieval_get_chunk

        get_chunk = retrieval_get_chunk
    except Exception:
        # Provenance remains useful even if the optional local index is not
        # available while serializing an otherwise valid answer.
        pass

    citations: list[dict[str, Any]] = []
    for source in answer.resolved_sources:
        title = source.document_title or source.document_id
        page = source.page_start or 0
        identifiers = ", ".join(source.chunk_ids)
        quote = ""
        if get_chunk is not None:
            excerpts = []
            for chunk_id in source.chunk_ids:
                try:
                    text = str(get_chunk(chunk_id).get("text_original", "")).strip()
                except Exception:
                    continue
                if text:
                    excerpts.append(text)
            quote = " ".join(excerpts)[:500]
        provenance = quote or (f"{source.handle} · {identifiers}" if identifiers else source.handle)
        citations.append(
            {
                "documentName": title,
                "documentNameEn": title,
                "page": page,
                "quote": provenance,
            }
        )
    return citations
