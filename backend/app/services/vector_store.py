"""Vector Store — pgvector-backed semantic similarity service for CrediX.

Responsibilities
----------------
1. **upsert_application_vectors** — compute dense embeddings for the key OCR fields
   extracted from a loan application and store them in the ``vector_embeddings``
   Supabase table (one row per field, keyed by ``embedding_key``).

2. **find_similar_applications** — given an ``application_id``, retrieve its
   composite vector and run a pgvector cosine-distance query to return the top-N
   most semantically similar applications from the portfolio.

3. **compute_application_vector** — build a single composite 128-dim vector that
   summarises the whole application by averaging its key field vectors.

All database operations use raw SQL via SQLAlchemy ``text()`` so the service works
without adding the ``pgvector`` Python package as a dependency — the vector literal
is passed as a PostgreSQL array string (``'[0.1, 0.2, ...]'::vector``).

Graceful degradation
--------------------
Every public function catches ``Exception`` broadly so that a missing pgvector
extension (Supabase Free Tier) or SQLite test environment never crashes the API.
The caller receives an empty result / ``False`` in that case.
"""

from __future__ import annotations

import secrets
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.services.semantic_taxonomy import compute_dense_vector


# ── Embedding key definitions ─────────────────────────────────────────────────

# The fields we embed for each application. The value is the OCR key path used
# to extract the raw text.  We keep it simple: 6 semantically rich fields.
EMBEDDING_FIELDS: Dict[str, str] = {
    "job_title":         "المسمى الوظيفي",       # label placeholder; real text comes from app
    "employer":          "جهة العمل",
    "income_band":       "الراتب المعلن",
    "loan_purpose":      "غرض التمويل",
    "loan_type":         "نوع التمويل",
    "occupation_full":   "المسمى الوظيفي والجهة",  # concatenated field
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _new_id(prefix: str = "vec") -> str:
    return f"{prefix}_{secrets.token_hex(6)}"


def _vec_to_pg_literal(vec: List[float]) -> str:
    """Convert a Python float list to the pgvector literal format: '[0.1,0.2,...]'."""
    return "[" + ",".join(f"{v:.8f}" for v in vec) + "]"


def _average_vectors(vecs: List[List[float]]) -> List[float]:
    """Element-wise average of a list of same-dimensional vectors."""
    if not vecs:
        return [0.0] * 128
    dim = len(vecs[0])
    avg = [sum(v[i] for v in vecs) / len(vecs) for i in range(dim)]
    norm = sum(x * x for x in avg) ** 0.5
    return [x / norm for x in avg] if norm > 0 else avg


# ── Public API ────────────────────────────────────────────────────────────────

def compute_application_vector(
    job_title: Optional[str] = None,
    employer: Optional[str] = None,
    loan_type: Optional[str] = None,
    purpose: Optional[str] = None,
    occupation: Optional[str] = None,
    income_label: Optional[str] = None,
) -> List[float]:
    """Compute a single composite embedding vector for a loan application.

    Averages the individual field vectors so the result captures the overall
    semantic fingerprint of the application.
    """
    parts: List[List[float]] = []

    def _add(text: Optional[str]) -> None:
        if text and text.strip():
            parts.append(compute_dense_vector(text.strip()))

    _add(job_title)
    _add(employer)
    _add(loan_type)
    _add(purpose)
    _add(occupation)
    _add(income_label)

    return _average_vectors(parts)


def upsert_application_vectors(
    db: Session,
    application_id: str,
    job_title: Optional[str] = None,
    employer: Optional[str] = None,
    loan_type: Optional[str] = None,
    purpose: Optional[str] = None,
    occupation: Optional[str] = None,
) -> bool:
    """Compute and upsert vector embeddings for a loan application into pgvector.

    Returns True on success, False on any error (missing extension, SQLite, etc.).
    """
    try:
        # --- Per-field embeddings ---
        field_texts: Dict[str, str] = {}
        if job_title:
            field_texts["job_title"] = job_title
        if employer:
            field_texts["employer"] = employer
        if loan_type:
            field_texts["loan_type"] = loan_type
        if purpose:
            field_texts["purpose"] = purpose
        if occupation:
            field_texts["occupation_full"] = occupation
        # Composite vector: average of all non-empty fields
        composite_vec = compute_application_vector(
            job_title=job_title,
            employer=employer,
            loan_type=loan_type,
            purpose=purpose,
            occupation=occupation,
        )
        field_texts["__composite__"] = " ".join(filter(None, [job_title, employer, loan_type, purpose]))

        all_rows: List[Tuple[str, str, str, List[float]]] = []

        # Individual field rows
        for key, source_text in field_texts.items():
            vec = composite_vec if key == "__composite__" else compute_dense_vector(source_text)
            all_rows.append((_new_id(), key, source_text, vec))

        for row_id, emb_key, source_text, vec in all_rows:
            pg_vec = _vec_to_pg_literal(vec)
            db.execute(
                text("""
                    INSERT INTO vector_embeddings
                        (id, application_id, embedding_key, source_text, vector, model_name)
                    VALUES
                        (:id, :app_id, :key, :src, :vec::vector, 'credix-hashvec-v1')
                    ON CONFLICT (application_id, embedding_key)
                    DO UPDATE SET
                        source_text = EXCLUDED.source_text,
                        vector      = EXCLUDED.vector,
                        model_name  = EXCLUDED.model_name,
                        created_at  = NOW();
                """),
                {
                    "id":     row_id,
                    "app_id": application_id,
                    "key":    emb_key,
                    "src":    source_text,
                    "vec":    pg_vec,
                },
            )
        db.commit()
        return True
    except Exception:
        # Fail silently — pgvector may not be enabled on this Supabase project
        db.rollback()
        return False


def find_similar_applications(
    db: Session,
    application_id: str,
    top_k: int = 5,
    min_similarity: float = 0.60,
) -> List[Dict[str, Any]]:
    """Find the top-K loan applications most semantically similar to the given one.

    Uses the pgvector ``<=>`` cosine-distance operator on the ``__composite__``
    embedding.  Returns a list of dicts ready to serialise as JSON.

    Falls back to an empty list if:
      - pgvector extension is not available
      - The source application has no stored vector
      - Any other database error
    """
    try:
        # 1. Retrieve the composite vector for the source application
        src_row = db.execute(
            text("""
                SELECT vector::text
                FROM vector_embeddings
                WHERE application_id = :app_id
                  AND embedding_key  = '__composite__'
                LIMIT 1;
            """),
            {"app_id": application_id},
        ).fetchone()

        if not src_row:
            return []

        src_vec_literal = src_row[0]  # already a pg vector literal string from DB

        # 2. Cosine similarity query: 1 - cosine_distance
        #    We exclude the source application itself and applications with no composite vector.
        rows = db.execute(
            text("""
                SELECT
                    ve.application_id,
                    1 - (ve.vector <=> :src_vec::vector) AS similarity,
                    la.applicant_name,
                    la.loan_type,
                    la.loan_type_label,
                    la.requested_amount,
                    la.status,
                    la.credit_score,
                    la.credit_risk_label,
                    la.occupation,
                    la.submitted_at
                FROM vector_embeddings ve
                JOIN loan_applications la ON la.id = ve.application_id
                WHERE ve.embedding_key  = '__composite__'
                  AND ve.application_id != :app_id
                ORDER BY ve.vector <=> :src_vec::vector
                LIMIT :top_k;
            """),
            {
                "src_vec": src_vec_literal,
                "app_id":  application_id,
                "top_k":   top_k + 10,   # over-fetch to apply min_similarity filter
            },
        ).fetchall()

        results: List[Dict[str, Any]] = []
        for row in rows:
            similarity = float(row[1]) if row[1] is not None else 0.0
            if similarity < min_similarity:
                continue
            results.append(
                {
                    "application_id":    row[0],
                    "similarity":        round(similarity, 4),
                    "similarity_pct":    round(similarity * 100, 1),
                    "applicant_name":    row[2] or "—",
                    "loan_type":         row[3] or "",
                    "loan_type_label":   row[4] or "",
                    "requested_amount":  float(row[5]) if row[5] else None,
                    "status":            row[6] or "",
                    "credit_score":      row[7],
                    "credit_risk_label": row[8] or "",
                    "occupation":        row[9] or "",
                    "submitted_at":      row[10].isoformat() if row[10] else None,
                }
            )
            if len(results) >= top_k:
                break

        return results

    except Exception:
        return []


def get_application_embedding_summary(
    db: Session,
    application_id: str,
) -> Dict[str, Any]:
    """Return a summary of stored embeddings for an application (for UI display)."""
    try:
        rows = db.execute(
            text("""
                SELECT embedding_key, source_text, created_at
                FROM vector_embeddings
                WHERE application_id = :app_id
                ORDER BY created_at;
            """),
            {"app_id": application_id},
        ).fetchall()

        return {
            "application_id":  application_id,
            "stored_vectors":  len(rows),
            "model_name":      "credix-hashvec-v1",
            "vector_dim":      128,
            "fields": [
                {
                    "key":         row[0],
                    "source_text": row[1] or "",
                    "indexed_at":  row[2].isoformat() if row[2] else None,
                }
                for row in rows
                if row[0] != "__composite__"
            ],
            "has_composite": any(row[0] == "__composite__" for row in rows),
        }
    except Exception:
        return {
            "application_id": application_id,
            "stored_vectors": 0,
            "model_name":     "credix-hashvec-v1",
            "vector_dim":     128,
            "fields":         [],
            "has_composite":  False,
        }
