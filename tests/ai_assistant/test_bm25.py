from __future__ import annotations

from src.rag.bm25 import BM25Index, expand_query_tokens, normalize_for_bm25


def test_code_switched_query_expands_to_auditable_arabic_aliases() -> None:
    terms = expand_query_tokens("credit registry check")
    assert "ائتمان" in terms
    assert "تسجيل" in terms
    assert "استعلام" in terms


def test_bm25_aliases_retrieve_arabic_corpus_for_english_terms() -> None:
    index = BM25Index([
        {"chunk_id": "arabic", "tokens": ["نظام", "تسجيل", "الائتمان"]},
        {"chunk_id": "other", "tokens": ["ضمان", "بضاعة"]},
    ])
    results = index.search("credit registry check", top_k=2)
    assert results[0][0] == 0


def test_bm25_folds_eastern_arabic_digits_for_numeric_queries() -> None:
    assert "300" in normalize_for_bm25("٣۰۰")
    index = BM25Index([
        {"chunk_id": "threshold", "tokens": ["300", "الف"]},
        {"chunk_id": "other", "tokens": ["200", "الف"]},
    ])
    assert index.search("٣۰۰ ألف", top_k=1)[0][0] == 0
