"""CRUD operations for Loan Applications, Timeline, and Documents."""

import random
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.application import LoanApplication, TimelineEvent, Document
from app.schemas.application import LoanApplicationCreate, LoanApplicationUpdate


def get_application_by_id(db: Session, app_id: str) -> Optional[LoanApplication]:
    return db.query(LoanApplication).filter(LoanApplication.id == app_id).first()


def get_applications(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    loan_type: Optional[str] = None,
    search: Optional[str] = None,
) -> Tuple[List[LoanApplication], int]:
    query = db.query(LoanApplication)

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


def create_application(db: Session, app_in: LoanApplicationCreate) -> LoanApplication:
    # Generate ID if not provided
    app_id = app_in.id or f"APP-2026-{random.randint(1000, 9999)}"

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
            id=f"t1_{app_id}",
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
            id=f"t2_{app_id}",
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
            id=f"t3_{app_id}",
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

    db.commit()
    db.refresh(db_app)
    return db_app


def update_application(db: Session, app_id: str, app_update: LoanApplicationUpdate) -> Optional[LoanApplication]:
    db_app = get_application_by_id(db, app_id)
    if not db_app:
        return None

    update_data = app_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_app, field, value)

    db_app.last_updated = "الآن"
    db.commit()
    db.refresh(db_app)
    return db_app


def record_officer_decision(db: Session, app_id: str, decision: str, notes: Optional[str] = None) -> Optional[LoanApplication]:
    db_app = get_application_by_id(db, app_id)
    if not db_app:
        return None

    if decision == "approve":
        db_app.status = "approved"
        db_app.ai_recommendation = "approve"
        db_app.ai_recommendation_label = "موافقة معتمدة"
        db_app.ai_recommendation_label_en = "Approved"
        event_title = "اعتماد التمويل"
        event_title_en = "Financing Approved"
        event_desc = notes or "تم اعتماد التمويل وإصدار الموافقة الائتمانية بنجاح من موظف الائتمان."
        event_desc_en = notes or "Financing application approved successfully by credit officer."
    elif decision == "reject":
        db_app.status = "rejected"
        db_app.ai_recommendation = "reject"
        db_app.ai_recommendation_label = "رفض الطلب"
        db_app.ai_recommendation_label_en = "Rejected"
        event_title = "رفض الطلب"
        event_title_en = "Application Rejected"
        event_desc = notes or "تم رفض الطلب وتوثيق السبب في السجل الائتماني."
        event_desc_en = notes or "Application rejected and recorded in credit audit log."
    else:
        db_app.status = "under_review"
        db_app.ai_recommendation = "manual_review"
        db_app.ai_recommendation_label = "مراجعة بشرية"
        db_app.ai_recommendation_label_en = "Manual Review"
        event_title = "تحويل للمراجعة البشرية"
        event_title_en = "Human Review Transferred"
        event_desc = notes or "تم تحويل الطلب إلى قائمة المراجعة البشرية الإضافية."
        event_desc_en = notes or "Application transferred to human review queue."

    db_app.last_updated = "الآن"

    # Add decision to timeline
    event = TimelineEvent(
        id=f"decision_{app_id}_{random.randint(100, 999)}",
        application_id=app_id,
        title=event_title,
        title_en=event_title_en,
        timestamp="الآن",
        description=event_desc,
        description_en=event_desc_en,
        status="completed",
        icon_type="review",
    )
    db.add(event)
    db.commit()
    db.refresh(db_app)
    return db_app


def delete_application(db: Session, app_id: str) -> bool:
    db_app = get_application_by_id(db, app_id)
    if not db_app:
        return False
    db.delete(db_app)
    db.commit()
    return True
