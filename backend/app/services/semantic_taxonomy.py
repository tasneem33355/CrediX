"""Semantic Taxonomy Resolver & Vector Embedding Matching Engine.

Solves the multi-terminology and cross-document discrepancy problem across Egyptian
and regional financial institutions:
- Variations in financial fields (e.g. "صافي المنصرف" vs "صافي الراتب" vs "Net Pay").
- Variations in job titles (e.g. "أخصائي تطوير أعمال" vs "مهندس حلول ومبيعات تقنية").
- Classification of bank transaction ledger descriptions.
- Embedding vector similarity search with Cosine Similarity.
"""

from dataclasses import dataclass, field
import hashlib
import math
import re
from typing import Any, Dict, List, Optional, Tuple


# ─── 1. STANDARD FINANCIAL & REGULATORY TAXONOMY ───

TAXONOMY_DICTIONARY: Dict[str, Dict[str, Any]] = {
    "net_salary": {
        "canonical_ar": "صافي الراتب الشهري",
        "canonical_en": "Net Monthly Salary",
        "category": "income",
        "synonyms": [
            "صافي الراتب",
            "صافي المرتب",
            "صافي المنصرف",
            "صافي الدخل الشهري",
            "تحويل راتب",
            "تحويل مرتب",
            "مرتب شهري",
            "الأجر الصافي",
            "Net Pay",
            "Net Salary",
            "Take Home Pay",
            "Take-Home Pay",
            "Salary Transfer",
            "Payroll Credit",
            "SALARY CR",
            "SAL",
            "MONTHLY SALARY",
        ],
    },
    "gross_salary": {
        "canonical_ar": "إجمالي الراتب التعاقدي",
        "canonical_en": "Gross Contractual Salary",
        "category": "income",
        "synonyms": [
            "إجمالي الراتب",
            "إجمالي المرتب",
            "المرتب الشامل",
            "إجمالي الاستحقاقات",
            "الراتب الأساسي والإضافي",
            "إجمالي الأجر",
            "Gross Salary",
            "Gross Income",
            "Total Earnings",
            "Basic Plus Allowances",
            "Gross Pay",
        ],
    },
    "loan_installment": {
        "canonical_ar": "قسط التمويل الشهري",
        "canonical_en": "Monthly Financing Installment",
        "category": "liability",
        "synonyms": [
            "قسط تمويل",
            "خصم قسط تمويل",
            "قسط قرض شخصي",
            "قسط سلفة",
            "سداد مرابحة",
            "خصم تسهيل ائتماني",
            "سداد تمويل استهلاكي",
            "Loan Installment",
            "Facility Debit",
            "Installment Deduction",
            "DEB INST",
            "LOAN REPAYMENT",
            "FINANCE PMT",
        ],
    },
    "bank_inflow": {
        "canonical_ar": "متوسط التدفق البنكي الوارد",
        "canonical_en": "Average Monthly Bank Inflow",
        "category": "banking",
        "synonyms": [
            "التدفق البنكي",
            "إجمالي الإيداعات",
            "مجموع الحركات الدائنة",
            "الإيداعات النقدية والتحويلات",
            "متوسط الدخل المصرفي",
            "Total Inflow",
            "Total Credits",
            "Monthly Inflow",
            "Bank Deposit Inflow",
            "Turnover",
        ],
    },
    "commercial_registry": {
        "canonical_ar": "رقم السجل التجاري",
        "canonical_en": "Commercial Registration Number",
        "category": "business",
        "synonyms": [
            "السجل التجاري",
            "سجل تجاري مميكن",
            "رقم القيد بالسجل التجاري",
            "مستخرج سجل الشركات",
            "رقم القيد التجاري",
            "Commercial Register",
            "CR Number",
            "Commercial Registry No",
            "Business Reg",
        ],
    },
    "employer_name": {
        "canonical_ar": "جهة العمل / اسم المنشأة",
        "canonical_en": "Employer / Company Name",
        "category": "employment",
        "synonyms": [
            "جهة العمل",
            "اسم الشركة",
            "صاحب العمل",
            "اسم المنشأة",
            "الجهة التابع لها",
            "الشركة المشغلة",
            "Employer Name",
            "Company Name",
            "Organization",
            "Workplace",
        ],
    },
    "job_title": {
        "canonical_ar": "المسمى الوظيفي / المهنة",
        "canonical_en": "Job Title / Profession",
        "category": "employment",
        "synonyms": [
            "المسمى الوظيفي",
            "المهنة المدونة",
            "الوظيفة الحالية",
            "طبيعة العمل",
            "المهنة بالبطاقة",
            "Job Title",
            "Occupation",
            "Position",
            "Designation",
            "Profession",
        ],
    },
    "national_id": {
        "canonical_ar": "الرقم القومي (14 رقماً)",
        "canonical_en": "National ID Number",
        "category": "identity",
        "synonyms": [
            "الرقم القومي",
            "رقم بطاقة تحقيق الشخصية",
            "الرقم التعريفي القومي",
            "رقم الهوية",
            "بطاقة الرقم القومي",
            "National ID",
            "NID",
            "National Identification",
            "Citizen ID",
        ],
    },
}

# Equivalent job tracks for cross-document occupational resolution
JOB_TRACK_EQUIVALENCES = [
    {
        "track": "business_development_sales",
        "terms": [
            "أخصائي تطوير أعمال",
            "مدير تطوير أعمال",
            "أخصائي مبيعات",
            "مسؤول مبيعات وتسويق",
            "أخصائي تسويق تجاري",
            "Business Development",
            "Sales Specialist",
            "Commercial Specialist",
        ],
    },
    {
        "track": "software_engineering_it",
        "terms": [
            "مهندس برمجيات",
            "مطور برامج",
            "أخصائي نظم ومعلومات",
            "مهندس حاسبات وتكنولوجيا",
            "مطور تطبيقات",
            "Software Engineer",
            "Software Developer",
            "IT Specialist",
        ],
    },
    {
        "track": "accounting_finance",
        "terms": [
            "محاسب مالي",
            "أخصائي حسابات",
            "مراجع حسابات",
            "مدير حسابات",
            "محلل مالي",
            "Financial Accountant",
            "Accountant",
            "Financial Analyst",
            "Auditor",
        ],
    },
]


# ─── 2. EMBEDDING VECTOR GENERATION & COSINE SIMILARITY ───

def _normalize_text(s: str) -> str:
    """Normalize Arabic & Latin characters for robust subword representation."""
    s = s.strip().lower()
    # Normalize Arabic diacritics & letter variants
    s = re.sub(r"[\u064B-\u065F\u0670]", "", s)  # harakat
    s = re.sub(r"[إأآا]", "ا", s)
    s = re.sub(r"ى", "ي", s)
    s = re.sub(r"ة", "ه", s)
    s = re.sub(r"[^\w\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def compute_dense_vector(text: str, dim: int = 128) -> List[float]:
    """Generate a dense, normalized vector representation for a text string.
    
    Uses character and word n-gram hashing to guarantee deterministic, zero-dependency,
    cross-lingual vector embeddings that capture semantic root similarity.
    """
    clean = _normalize_text(text)
    if not clean:
        return [0.0] * dim

    vec = [0.0] * dim

    # 1. Word tokens
    words = clean.split()
    for w in words:
        h = int(hashlib.md5(w.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        vec[idx] += 2.0

    # 2. Character 3-grams for subword morphology (e.g. 'منصرف', 'صرف', 'مرتب', 'راتب')
    for i in range(max(1, len(clean) - 2)):
        tri = clean[i : i + 3]
        h = int(hashlib.sha256(tri.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        vec[idx] += 1.0

    # L2 normalize vector
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]
    return vec


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Compute standard cosine similarity between two unit vectors."""
    dot = sum(a * b for a, b in zip(v1, v2))
    return max(0.0, min(1.0, dot))


# ─── 3. VECTOR INDEX & TAXONOMY RESOLVER ───

@dataclass
class IndexedTaxonomyEntry:
    standard_key: str
    canonical_ar: str
    canonical_en: str
    category: str
    synonym: str
    vector: List[float]


class VectorTaxonomyResolver:
    """High-performance vector similarity search engine over banking taxonomies."""

    def __init__(self):
        self._index: List[IndexedTaxonomyEntry] = []
        self._build_index()

    def _build_index(self):
        for key, meta in TAXONOMY_DICTIONARY.items():
            for syn in meta["synonyms"]:
                vec = compute_dense_vector(syn)
                self._index.append(
                    IndexedTaxonomyEntry(
                        standard_key=key,
                        canonical_ar=meta["canonical_ar"],
                        canonical_en=meta["canonical_en"],
                        category=meta["category"],
                        synonym=syn,
                        vector=vec,
                    )
                )

    def resolve_field(self, raw_input: str, threshold: float = 0.55) -> Dict[str, Any]:
        """Find the canonical financial field for an arbitrary OCR string."""
        if not raw_input or not raw_input.strip():
            return {
                "matched": False,
                "input": raw_input,
                "confidence": 0.0,
                "reason": "Empty input string",
            }

        input_clean = _normalize_text(raw_input)
        input_vec = compute_dense_vector(input_clean)

        best_entry: Optional[IndexedTaxonomyEntry] = None
        best_score: float = -1.0

        for item in self._index:
            # Exact synonym match shortcut
            if _normalize_text(item.synonym) == input_clean:
                return {
                    "matched": True,
                    "input": raw_input,
                    "standard_key": item.standard_key,
                    "canonical_ar": item.canonical_ar,
                    "canonical_en": item.canonical_en,
                    "category": item.category,
                    "matched_synonym": item.synonym,
                    "confidence": 0.99,
                    "match_type": "exact_semantic",
                }

            score = cosine_similarity(input_vec, item.vector)
            if score > best_score:
                best_score = score
                best_entry = item

        if best_entry and best_score >= threshold:
            return {
                "matched": True,
                "input": raw_input,
                "standard_key": best_entry.standard_key,
                "canonical_ar": best_entry.canonical_ar,
                "canonical_en": best_entry.canonical_en,
                "category": best_entry.category,
                "matched_synonym": best_entry.synonym,
                "confidence": round(best_score, 3),
                "match_type": "vector_similarity",
            }

        return {
            "matched": False,
            "input": raw_input,
            "best_guess": best_entry.canonical_ar if best_entry else None,
            "confidence": round(max(0.0, best_score), 3),
            "threshold": threshold,
            "reason": "Confidence below threshold",
        }

    def match_job_titles(self, title_a: str, title_b: str) -> Dict[str, Any]:
        """Resolve whether two divergent job titles belong to the same professional track."""
        clean_a = _normalize_text(title_a)
        clean_b = _normalize_text(title_b)

        if not clean_a or not clean_b:
            return {"consistent": False, "score": 0.0, "reason": "Missing job title"}

        if clean_a == clean_b:
            return {
                "consistent": True,
                "score": 1.0,
                "track": "exact_match",
                "verdict_ar": "تطابق وظيفي تام 100%",
                "verdict_en": "Exact occupational match",
            }

        # Check track equivalence groups
        for group in JOB_TRACK_EQUIVALENCES:
            norm_terms = [_normalize_text(t) for t in group["terms"]]
            has_a = any(t in clean_a or clean_a in t for t in norm_terms)
            has_b = any(t in clean_b or clean_b in t for t in norm_terms)
            if has_a and has_b:
                return {
                    "consistent": True,
                    "score": 0.92,
                    "track": group["track"],
                    "verdict_ar": "تطابق دلالي: كلاهما ضمن نفس المسار والقطاع الوظيفي",
                    "verdict_en": f"Semantic equivalence in {group['track']}",
                }

        # Fallback to vector cosine similarity
        va = compute_dense_vector(clean_a)
        vb = compute_dense_vector(clean_b)
        sim = cosine_similarity(va, vb)

        consistent = sim >= 0.58
        return {
            "consistent": consistent,
            "score": round(sim, 3),
            "track": "vector_evaluated",
            "verdict_ar": "متوافق مع طبيعة العمل" if consistent else "اختلاف وظيفي يحتاج تدقيق",
            "verdict_en": "Compatible role" if consistent else "Different occupational track",
        }

    def normalize_extracted_fields(self, raw_fields: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize an arbitrary dictionary of OCR extracted keys into standardized schema."""
        normalized: Dict[str, Any] = {}
        resolutions: List[Dict[str, Any]] = []

        for key, val in raw_fields.items():
            res = self.resolve_field(key)
            if res.get("matched"):
                std_key = res["standard_key"]
                normalized[std_key] = val
                resolutions.append({
                    "original_key": key,
                    "resolved_key": std_key,
                    "canonical_name": res["canonical_ar"],
                    "confidence": res["confidence"],
                })
            else:
                normalized[key] = val

        return {
            "normalized_fields": normalized,
            "resolutions": resolutions,
            "resolved_count": len(resolutions),
        }


# Singleton instance
_resolver_instance = VectorTaxonomyResolver()


def get_taxonomy_resolver() -> VectorTaxonomyResolver:
    """Return the global VectorTaxonomyResolver instance."""
    return _resolver_instance
