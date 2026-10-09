"""CRUD operations for Loan Applications, Timeline, and Documents."""

import secrets
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import new_id
from app.models.application import DecisionAudit, Document, LoanApplication, TimelineEvent
from app.models.user import User
from app.schemas.application import LoanApplicationCreate, LoanApplicationUpdate
from app.models.portfolio import DecisionAuditLog, LoanFacility
from app.models.case import CaseCard
from app.crud.crud_case import sync_case_card


def _sanitize_for_json(val: Any) -> Any:
    """Recursively convert Decimals and non-primitive objects to JSON-serializable types."""
    if isinstance(val, dict):
        return {k: _sanitize_for_json(v) for k, v in val.items()}
    elif isinstance(val, (list, tuple)):
        return [_sanitize_for_json(x) for x in val]
    elif isinstance(val, Decimal):
        return float(val)
    return val

class DecisionConflict(Exception):
    """Raised when an application already has a final (approved/rejected) decision."""


class DelegationLimitExceeded(Exception):
    """Raised when an officer attempts to approve an amount exceeding their delegation authority."""

    def __init__(self, message: str, limit: float, requested: float):
        super().__init__(message)
        self.message = message
        self.limit = limit
        self.requested = requested


FINAL_STATUSES = {"approved", "rejected"}


def _new_application_id(db: Session) -> str:
    for _ in range(5):
        candidate = f"APP-{datetime.utcnow().year}-{secrets.token_hex(4).upper()}"
        if not get_application_by_id(db, candidate):
            return candidate
    raise RuntimeError("Could not allocate a unique application id")


def _audit(
    db: Session, *, application_id: str, action: str, actor: Optional[User],
    decision: Optional[str] = None, previous_status: Optional[str] = None,
    new_status: Optional[str] = None, notes: Optional[str] = None,
    snapshot: Optional[Dict[str, Any]] = None,
) -> None:
    safe_snapshot = _sanitize_for_json(snapshot) if snapshot is not None else None
    db.add(DecisionAudit(
        id=new_id("aud"), application_id=application_id, action=action, decision=decision,
        previous_status=previous_status, new_status=new_status,
        actor_user_id=actor.id if actor else None, actor_name=actor.name_en if actor else None,
        notes=notes, snapshot=safe_snapshot,
    ))


def get_audit_trail(db: Session, app_id: str) -> List[DecisionAudit]:
    return (
        db.query(DecisionAudit)
        .filter(DecisionAudit.application_id == app_id)
        .order_by(DecisionAudit.created_at.asc())
        .all()
    )


def get_application_by_id(db: Session, app_id: str) -> Optional[LoanApplication]:
    return db.query(LoanApplication).filter(LoanApplication.id == app_id).first()


def get_applications(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    loan_type: Optional[str] = None,
    search: Optional[str] = None,
    applicant_id: Optional[str] = None,
) -> Tuple[List[LoanApplication], int]:
    query = db.query(LoanApplication)

    # Row-level scoping: clients only ever query their own applications.
    if applicant_id is not None:
        query = query.filter(LoanApplication.applicant_id == applicant_id)

    if status and status != "all":
        query = query.filter(LoanApplication.status == status)

    if loan_type and loan_type != "all":
        query = query.filter(LoanApplication.loan_type == loan_type)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                LoanApplication.id.ilike(search_term),
                LoanApplication.applicant_name.ilike(search_term),
                LoanApplication.applicant_name_en.ilike(search_term),
                LoanApplication.national_id.ilike(search_term),
                LoanApplication.mobile_number.ilike(search_term),
            )
        )

    total = query.count()
    items = query.order_by(LoanApplication.created_at.desc()).offset(skip).limit(limit).all()
    return items, total


def create_application(
    db: Session,
    app_in: LoanApplicationCreate,
    applicant_id: Optional[str] = None,
    actor: Optional[User] = None,
) -> LoanApplication:
    # Generate ID if not provided
    app_id = app_in.id or _new_application_id(db)

    # Default labels
    loan_type_labels = {
        "personal": ("تمويل شخصي", "Personal Financing"),
        "sme": ("تمويل مشروعات صغيرة", "SME Financing"),
        "auto": ("تمويل سيارات", "Auto Financing"),
        "mortgage": ("تمويل عقاري", "Mortgage Financing"),
    }
    label_ar, label_en = loan_type_labels.get(app_in.loan_type, ("تمويل شخصي", "Personal Financing"))

    default_pipeline_steps = [
        {"id": "step_1", "label": "استلام ورفع المستندات", "labelEn": "Document Ingestion", "status": "completed"},
        {"id": "step_2", "label": "استخراج البيانات بالـ OCR", "labelEn": "OCR Extraction", "status": "completed"},
        {"id": "step_3", "label": "التحقق وتقييم الائتمان", "labelEn": "Credit Assessment", "status": "completed"},
        {"id": "step_4", "label": "فحص الاحتيال والمخاطر", "labelEn": "Fraud Detection", "status": "current"},
        {"id": "step_5", "label": "المراجعة والاعتماد النهائي", "labelEn": "Final Review", "status": "pending"},
    ]

    db_app = LoanApplication(
        id=app_id,
        applicant_id=applicant_id,
        applicant_name=app_in.applicant_name,
        applicant_name_en=app_in.applicant_name_en or app_in.applicant_name,
        national_id=app_in.national_id,
        mobile_number=app_in.mobile_number,
        client_type=app_in.client_type or "current",
        occupation=app_in.occupation,
        occupation_en=app_in.occupation_en,
        loan_type=app_in.loan_type,
        loan_type_label=app_in.loan_type_label or label_ar,
        loan_type_label_en=app_in.loan_type_label_en or label_en,
        requested_amount=app_in.requested_amount,
        currency=app_in.currency or "ج.م",
        tenure_months=app_in.tenure_months or 36,
        purpose=app_in.purpose,
        date="الآن",
        last_updated="الآن",
        status="under_review",
    # DEMO ONLY: fixed values preserve the API contract; they are not model outputs.
        ai_recommendation="manual_review",
        ai_recommendation_label="مراجعة بشرية",
        ai_recommendation_label_en="Manual Review",
        ai_confidence=85.0,
        recommendation_reasons=[
            {"ar": "طلب جديد مكتمل البيانات بحاجة للمراجعة النهائية.", "en": "New completed application awaiting final officer review."}
        ],
        pipeline_completed_steps=3,
        pipeline_total_steps=5,
        pipeline_steps=default_pipeline_steps,
        ocr_accuracy=98.0,
        extracted_from_doc_count=2,
        extracted_fields=[
            {"label": "الاسم الكامل", "labelEn": "Full Name", "value": app_in.applicant_name, "confidence": 99.0},
            {"label": "الرقم القومي", "labelEn": "National ID", "value": app_in.national_id, "confidence": 99.5},
            {"label": "المبلغ المطلوب", "labelEn": "Requested Amount", "value": f"{app_in.requested_amount:,.0f} ج.م", "confidence": 98.0},
        ],
        bank_summary={
            "totalDeposits": app_in.requested_amount * 0.4,
            "monthlyAverage": (app_in.requested_amount * 0.4) / 3,
            "totalTransactions": 45,
            "averageBalance": app_in.requested_amount * 0.15,
            "periodMonths": 3,
        },
        credit_score=75,
        credit_risk_category="medium",
        credit_risk_label="مخاطر مقبولة",
        credit_risk_label_en="Acceptable Risk",
        calculated_factors_count=18,
        credit_factors=[
            {"id": "f1", "name": "نسبة الدين إلى الدخل (DBR)", "nameEn": "Debt-to-Income Ratio", "percentage": 75, "rating": "good", "ratingLabel": "جيد", "ratingLabelEn": "Good"},
            {"id": "f2", "name": "سجل الدفع والالتزامات السابقة", "nameEn": "Payment History", "percentage": 70, "rating": "good", "ratingLabel": "جيد", "ratingLabelEn": "Good"},
        ],
        fraud_risk_score=22,
        fraud_risk_category="low",
        fraud_risk_label="مخاطر منخفضة",
        fraud_risk_label_en="Low Risk",
        analyzed_signals_count=32,
        fraud_signals=[],
    )

    db.add(db_app)
    db.flush()

    # Create initial timeline events
    initial_timeline = [
        TimelineEvent(
            id=new_id("tl"),
            application_id=app_id,
            title="استلام الطلب",
            title_en="Application Ingestion",
            timestamp="الآن",
            description="تم استلام الطلب والمستندات بنجاح من بوابة العميل",
            description_en="Received application & documents from applicant portal",
            status="completed",
            icon_type="receipt",
        ),
        TimelineEvent(
            id=new_id("tl"),
            application_id=app_id,
            title="استخراج البيانات بالـ OCR",
            title_en="OCR Extraction",
            timestamp="الآن",
            description="اكتمل استخراج البيانات بدقة 98.0%",
            description_en="Completed field extraction with 98.0% confidence",
            status="completed",
            icon_type="ocr",
        ),
        TimelineEvent(
            id=new_id("tl"),
            application_id=app_id,
            title="المراجعة النهائية والقرار",
            title_en="Final Decision",
            timestamp="بانتظار الإجراء",
            description="في انتظار قرار موظف الائتمان",
            description_en="Awaiting credit officer review and action",
            status="pending",
            icon_type="review",
        ),
    ]
    db.add_all(initial_timeline)
    _audit(db, application_id=app_id, action="created", actor=actor, new_status="under_review")

    db.commit()
    db.refresh(db_app)
    return db_app


def update_application(
    db: Session, app_id: str, app_update: LoanApplicationUpdate, actor: Optional[User] = None,
) -> Optional[LoanApplication]:
    db_app = get_application_by_id(db, app_id)
    if not db_app:
        return None

    changes: Dict[str, Any] = {}
    for field, value in app_update.model_dump(exclude_unset=True).items():
        old = getattr(db_app, field)
        if old != value:
            changes[field] = {"from": float(old) if hasattr(old, "as_tuple") else old, "to": value}
            setattr(db_app, field, value)

    if changes:
        db_app.last_updated = "الآن"  # legacy display column
        _audit(db, application_id=app_id, action="edited", actor=actor, snapshot={"changes": changes})
    db.commit()
    db.refresh(db_app)
    return db_app


_DECISION_OUTCOMES = {
    "approve": ("approved", "اعتماد التمويل", "Financing Approved",
                "تم اعتماد التمويل وإصدار الموافقة الائتمانية بنجاح من موظف الائتمان.",
                "Financing application approved successfully by credit officer."),
    "reject": ("rejected", "رفض الطلب", "Application Rejected",
               "تم رفض الطلب وتوثيق السبب في السجل الائتماني.",
               "Application rejected and recorded in credit audit log."),
    "manual": ("under_review", "تحويل للمراجعة البشرية", "Human Review Transferred",
               "تم تحويل الطلب إلى قائمة المراجعة البشرية الإضافية.",
               "Application transferred to human review queue."),
}

_CONTRACT_BY_LOAN_TYPE = {
    "personal": "CASH_LOAN",
    "auto": "CAR_LOAN",
    "sme": "SME_LOAN",
    "mortgage": "MORTGAGE",
}


def _create_facility_for(db: Session, db_app: LoanApplication) -> None:
    """An approved application becomes a granted facility in the portfolio (once)."""
    if db.query(LoanFacility.facility_id).filter(LoanFacility.application_id == db_app.id).first():
        return
    db.add(LoanFacility(
        facility_id=new_id("fac"),
        application_id=db_app.id,
        customer_id=db_app.applicant_id or db_app.national_id,
        contract_type=_CONTRACT_BY_LOAN_TYPE.get(db_app.loan_type, "CASH_LOAN"),
        granted_amount=db_app.requested_amount,
        granted_date=datetime.utcnow().date(),
        tenor_months=db_app.tenure_months or 1,
        facility_status="ACTIVE_PERFORMING",
        historical_max_dpd=0,
        is_demo=False,
    ))

def record_officer_decision(
    db: Session, app_id: str, decision: str, notes: Optional[str] = None, officer: Optional[User] = None,
) -> Optional[LoanApplication]:
    """The AI recommendation is evidence and is left untouched; the human decision, the
    officer and the time are stored on the application and appended to the audit trail."""
    db_app = get_application_by_id(db, app_id)
    if not db_app:
        return None
    if db_app.status in FINAL_STATUSES:
        raise DecisionConflict(f"Application {app_id} already has a final decision ({db_app.status})")

    # Credit Delegation Authority Matrix Enforcement:
    policy_override_applied = False
    if decision == "approve" and officer is not None:
        limit = getattr(officer, "approval_limit_egp", None)
        can_override = getattr(officer, "can_override_policy", False)
        requested = float(db_app.requested_amount or 0)
        if limit is not None and limit > 0 and requested > limit:
            if not can_override:
                raise DelegationLimitExceeded(
                    f"مبلغ التمويل المطلوب ({requested:,.0f} ج.م) يتجاوز سقف صلاحيتك الائتمانية ({limit:,.0f} ج.م). يجب تصعيد الملف لمدير المخاطر أو الـ CRO.",
                    limit=limit,
                    requested=requested,
                )
            else:
                policy_override_applied = True

    new_status, title, title_en, desc, desc_en = _DECISION_OUTCOMES[decision]
    previous_status = db_app.status

    db_app.status = new_status
    db_app.final_decision = decision
    db_app.decided_by = officer.id if officer else None
    db_app.decided_at = datetime.utcnow()
    db_app.decision_notes = notes
    db_app.last_updated = "الآن"  # legacy display column

    db.add(TimelineEvent(
        id=new_id("tl"), application_id=app_id, title=title, title_en=title_en,
        timestamp="الآن",  # legacy display column
        description=notes or desc, description_en=notes or desc_en,
        status="completed", icon_type="review",
    ))
    _audit(
        db, application_id=app_id, action="decision", actor=officer, decision=decision,
        previous_status=previous_status, new_status=new_status, notes=notes,
        snapshot={
            "ai_recommendation": db_app.ai_recommendation,
            "ai_confidence": float(db_app.ai_confidence) if db_app.ai_confidence is not None else None,
            "credit_score": db_app.credit_score,
            "fraud_risk_score": db_app.fraud_risk_score,
            "requested_amount": float(db_app.requested_amount) if db_app.requested_amount is not None else None,
            "policy_override_applied": policy_override_applied,
            "officer_tier": getattr(officer, "officer_tier", None) if officer else None,
            "officer_approval_limit": float(officer.approval_limit_egp) if (officer and getattr(officer, "approval_limit_egp", None) is not None) else None,
        },
    )
    
    if new_status == "approved":
        _create_facility_for(db, db_app)
        sync_case_card(db, db_app, "completed", "تم الاعتماد", "Approved")
    elif new_status == "rejected":
        sync_case_card(db, db_app, "completed", "تم الرفض", "Rejected")
    else:
        sync_case_card(db, db_app, "human_review", "مراجعة بشرية", "Human Review")
        
    db.commit()
    db.refresh(db_app)
    return db_app


def delete_application(db: Session, app_id: str, actor: Optional[User] = None) -> bool:
    db_app = get_application_by_id(db, app_id)
    if not db_app:
        return False
    _audit(
        db, application_id=app_id, action="deleted", actor=actor, previous_status=db_app.status,
        snapshot={"applicant_name": db_app.applicant_name, "national_id": db_app.national_id},
    )
    db.query(CaseCard).filter(CaseCard.application_id == app_id).delete(synchronize_session=False)
    db.query(LoanFacility).filter(LoanFacility.application_id == app_id).delete(synchronize_session=False)
    db.query(DecisionAuditLog).filter(DecisionAuditLog.application_id == app_id).delete(synchronize_session=False)
    db.delete(db_app)
    db.commit()
    return True
