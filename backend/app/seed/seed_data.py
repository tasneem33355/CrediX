"""Database seeding for Task 0 demo data.

Scores, confidence values, recommendations, OCR fields, and chat citations in
this fixture are DEMO ONLY. They are not outputs from production AI services.
"""

from sqlalchemy.orm import Session
from app.models.user import User
from app.models.application import LoanApplication, Document, TimelineEvent
from app.models.case import CaseCard
from app.models.chat import ChatSession, ChatMessage


def seed_database(db: Session) -> None:
    """Seed the database with initial users, applications, cases, and chat history."""
    
    # 1. Users (Multi-Tier Credit Officers & Client)
    if db.query(User).count() == 0:
        officer_junior = User(
            id="usr_officer_junior",
            name="أحمد هلال",
            name_en="Ahmed Helal",
            email="ahmed.helal@credix.bank.eg",
            role="officer",
            officer_tier="junior_officer",
            approval_limit_egp=250000.0,
            can_override_policy=False,
            title="مسؤول ائتمان مبتدئ",
            title_en="Junior Credit Officer",
        )
        officer_senior = User(
            id="usr_officer_01",
            name="محمد سامي",
            name_en="Mohamed Sami",
            email="mohamed.sami@credix.bank.eg",
            role="officer",
            officer_tier="senior_officer",
            approval_limit_egp=750000.0,
            can_override_policy=False,
            title="كبير مسؤولي الائتمان",
            title_en="Senior Credit Officer",
        )
        officer_manager = User(
            id="usr_officer_manager",
            name="سارة الشناوي",
            name_en="Sara El-Shennawy",
            email="sara.shennawy@credix.bank.eg",
            role="officer",
            officer_tier="risk_manager",
            approval_limit_egp=3000000.0,
            can_override_policy=True,
            title="مدير إدارة مخاطر الائتمان",
            title_en="Credit Risk Manager",
        )
        officer_cro = User(
            id="usr_cro",
            name="د. طارق عبد العزيز",
            name_en="Dr. Tarek Abdelaziz",
            email="tarek.abdelaziz@credix.bank.eg",
            role="officer",
            officer_tier="cro",
            approval_limit_egp=100000000.0,
            can_override_policy=True,
            title="رئيس قطاع المخاطر والائتمان (CRO)",
            title_en="Chief Risk Officer",
        )
        client = User(
            id="usr_client_01",
            name="أحمد فؤاد عبد الله",
            name_en="Ahmed Fouad Abdallah",
            email="ahmed.fouad@gmail.com",
            role="client",
            title="مقدم طلب تمويل",
            title_en="Financing Applicant",
        )
        db.add_all([officer_junior, officer_senior, officer_manager, officer_cro, client])
        db.commit()

    # 2. Loan Applications & Documents & Timeline
    if db.query(LoanApplication).count() == 0:
        app1 = LoanApplication(
            id="APP-2026-0839",
            applicant_id="usr_client_01",
            applicant_name="أحمد فؤاد عبد الله",
            applicant_name_en="Ahmed Fouad Abdallah",
            national_id="28501151001234",
            mobile_number="01012345678",
            client_type="current",
            occupation="مالك شركة تجارية",
            occupation_en="Commercial Business Owner",
            loan_type="sme",
            loan_type_label="تمويل مشروعات صغيرة",
            loan_type_label_en="SME Financing",
            requested_amount=1250000.0,
            currency="ج.م",
            date="04 سبتمبر 2026",
            last_updated="منذ 12 دقيقة",
            status="suspicious",
            ai_recommendation="manual_review",
            ai_recommendation_label="مراجعة بشرية",
            ai_recommendation_label_en="Manual Review",
            ai_confidence=78.0,
            recommendation_reasons=[
                {
                    "ar": "تناقض واضح بين الدخل الشهري المعلن (85,000 ج.م) ومتوسط الإيداعات الفعلية في كشف الحساب (53,700 ج.م).",
                    "en": "Clear discrepancy between declared monthly income (85,000 EGP) and actual bank statement deposit average (53,700 EGP)."
                },
                {
                    "ar": "طول السجل الائتماني أقل من عامين مما يرفع مؤشر المخاطرة التراكمية.",
                    "en": "Credit history length is under 2 years, elevating cumulative risk metrics."
                },
                {
                    "ar": "رصد عدم تطابق في توقيع شهادة الدخل مقارنة بالنماذج المعتمدة.",
                    "en": "Potential signature irregularity detected on the uploaded income certificate."
                }
            ],
            pipeline_completed_steps=4,
            pipeline_total_steps=5,
            pipeline_steps=[
                {"id": "step_1", "label": "استلام ورفع المستندات", "labelEn": "Document Ingestion", "status": "completed"},
                {"id": "step_2", "label": "استخراج البيانات بالـ OCR", "labelEn": "OCR Extraction", "status": "completed"},
                {"id": "step_3", "label": "التحقق وتقييم الائتمان", "labelEn": "Credit Assessment", "status": "completed"},
                {"id": "step_4", "label": "فحص الاحتيال والمخاطر", "labelEn": "Fraud Detection", "status": "completed"},
                {"id": "step_5", "label": "المراجعة والاعتماد النهائي", "labelEn": "Final Review", "status": "current"},
            ],
            ocr_accuracy=97.4,
            extracted_from_doc_count=4,
            extracted_fields=[
                {"label": "الاسم الكامل", "labelEn": "Full Name", "value": "أحمد فؤاد عبد الله", "confidence": 99.2},
                {"label": "الرقم القومي", "labelEn": "National ID", "value": "28501151001234", "confidence": 99.8},
                {"label": "الدخل الشهري المعلن", "labelEn": "Declared Income", "value": "85,000 ج.م", "confidence": 96.0},
                {"label": "مدة النشاط التجاري", "labelEn": "Business Duration", "value": "8 سنوات و 4 أشهر", "confidence": 94.5},
                {"label": "عنوان النشاط", "labelEn": "Business Address", "value": "شارع التسعين، التجمع الخامس، القاهرة", "confidence": 98.1},
                {"label": "الغرض من التمويل", "labelEn": "Financing Purpose", "value": "توسعة نشاط تجاري وشراء بضائع", "confidence": 95.7},
            ],
            bank_summary={
                "totalDeposits": 485200.0,
                "monthlyAverage": 161733.0,
                "totalTransactions": 87,
                "averageBalance": 126450.0,
                "periodMonths": 3
            },
            credit_score=54,
            credit_risk_category="medium",
            credit_risk_label="مخاطر متوسطة",
            credit_risk_label_en="Medium Risk",
            calculated_factors_count=18,
            credit_factors=[
                {"id": "f1", "name": "نسبة الدين إلى الدخل (DBR)", "nameEn": "Debt-to-Income Ratio", "percentage": 78.0, "rating": "good", "ratingLabel": "جيد", "ratingLabelEn": "Good"},
                {"id": "f2", "name": "سجل الدفع والالتزامات السابقة", "nameEn": "Payment History", "percentage": 62.0, "rating": "medium", "ratingLabel": "متوسط", "ratingLabelEn": "Moderate"},
                {"id": "f3", "name": "طول السجل الائتماني (i-Score)", "nameEn": "Credit History Length", "percentage": 44.0, "rating": "weak", "ratingLabel": "ضعيف", "ratingLabelEn": "Weak"},
                {"id": "f4", "name": "طبيعة النشاط واستقرار القطاع", "nameEn": "Industry & Job Stability", "percentage": 85.0, "rating": "good", "ratingLabel": "جيد جداً", "ratingLabelEn": "Very Good"},
            ],
            fraud_risk_score=72,
            fraud_risk_category="high",
            fraud_risk_label="مخاطر مرتفعة",
            fraud_risk_label_en="High Risk",
            analyzed_signals_count=32,
            fraud_signals=[
                {
                    "id": "fr_1",
                    "title": "تناقض بين الدخل المعلن وكشف الحساب البنكي",
                    "titleEn": "Discrepancy Between Declared Income & Bank Statement",
                    "severity": "high",
                    "severityLabel": "مرتفع",
                    "severityLabelEn": "High",
                    "confidence": 94.0,
                    "evidence": "الدخل المعلن 85,000 ج.م بينما متوسط الإيداعات النقدية لا يتعدى 53,700 ج.م شهرياً مع وجود تحويلات غير منتظمة.",
                    "evidenceEn": "Declared income is 85,000 EGP whereas actual cash deposits average only 53,700 EGP with irregular transfers.",
                    "relatedDocument": "كشف حساب بنكي - آخر 3 شهور (صفحة 2)",
                    "relatedDocumentEn": "3-Month Bank Statement (Page 2)",
                    "timestamp": "04 سبتمبر 2026 - 09:46 ص",
                    "recommendedAction": "طلب مستخرج سجل ضريبي أو إيصالات تدفق مالي إضافية للتحقق.",
                    "recommendedActionEn": "Request tax register extract or additional cash flow receipts to verify.",
                    "declaredValue": "85,000 ج.م",
                    "actualValue": "53,700 ج.م",
                },
                {
                    "id": "fr_2",
                    "title": "تطابق غير طبيعي في بيانات الوثائق (احتمالية تعديل رقمي)",
                    "titleEn": "Abnormal Document Artifacts (Potential Digital Modification)",
                    "severity": "medium",
                    "severityLabel": "متوسط",
                    "severityLabelEn": "Medium",
                    "confidence": 78.0,
                    "evidence": "تحليل طبقات الخطوط يشير إلى تعديل في خانة الرصيد الختامي في الصفحة الأخيرة من كشف الحساب.",
                    "evidenceEn": "Font layer artifact analysis indicates modifications on the closing balance field on page 3.",
                    "relatedDocument": "شهادة دخل حديثة",
                    "relatedDocumentEn": "Recent Income Certificate",
                    "timestamp": "04 سبتمبر 2026 - 09:44 ص",
                    "recommendedAction": "إجراء فحص يدوي دقيق مع الجهة المصدرة للشهادة.",
                    "recommendedActionEn": "Perform manual audit with the issuing entity.",
                },
                {
                    "id": "fr_3",
                    "title": "تكرار بيانات العميل في طلب سابق تم رفضه",
                    "titleEn": "Applicant Data Pattern Matched to Previously Rejected Application",
                    "severity": "medium",
                    "severityLabel": "متوسط",
                    "severityLabelEn": "Medium",
                    "confidence": 78.0,
                    "evidence": "تطابق رقم السجل التجاري ورقم الهاتف مع طلب رقم APP-2025-0142 الذي رُفض بسبب تعثر سابق.",
                    "evidenceEn": "Commercial register number and phone matched rejected case APP-2025-0142.",
                    "relatedDocument": "السجل التجاري",
                    "relatedDocumentEn": "Commercial Register",
                    "timestamp": "04 سبتمبر 2026 - 09:43 ص",
                    "recommendedAction": "مراجعة أسباب الرفض السابقة وسجل الاستعلام الائتماني (i-Score).",
                    "recommendedActionEn": "Review previous rejection rationale and updated i-Score record.",
                }
            ]
        )

        app2 = LoanApplication(
            id="APP-2026-0842",
            applicant_name="محمود عبد الحميد",
            applicant_name_en="Mahmoud Abdelhamid",
            national_id="29003120104455",
            mobile_number="01123456789",
            client_type="current",
            occupation="مهندس برمجيات حر",
            occupation_en="Freelance Software Engineer",
            loan_type="personal",
            loan_type_label="تمويل شخصي",
            loan_type_label_en="Personal Financing",
            requested_amount=185000.0,
            currency="ج.م",
            date="04 سبتمبر 2026",
            last_updated="منذ 25 دقيقة",
            status="under_review",
            ai_recommendation="approve",
            ai_recommendation_label="موافقة مقترحة",
            ai_recommendation_label_en="Suggested Approval",
            ai_confidence=89.0,
            recommendation_reasons=[{"ar": "دخل ثابت مع نسبة عبء دين ممتازة 24%.", "en": "Stable income with excellent DTI ratio of 24%."}],
            pipeline_completed_steps=5,
            pipeline_total_steps=5,
            ocr_accuracy=98.2,
            extracted_from_doc_count=3,
            bank_summary={"totalDeposits": 310000.0, "monthlyAverage": 103333.0, "totalTransactions": 42, "averageBalance": 88000.0, "periodMonths": 3},
            credit_score=82,
            credit_risk_category="low",
            credit_risk_label="مخاطر منخفضة",
            credit_risk_label_en="Low Risk",
            calculated_factors_count=18,
            fraud_risk_score=18,
            fraud_risk_category="low",
            fraud_risk_label="مخاطر منخفضة",
            fraud_risk_label_en="Low Risk",
            analyzed_signals_count=32,
        )

        app3 = LoanApplication(
            id="APP-2026-0841",
            applicant_name="سارة إبراهيم",
            applicant_name_en="Sara Ibrahim",
            national_id="29508210109988",
            mobile_number="01234567890",
            client_type="current",
            occupation="طبيبة بشرية - مستشفى خاص",
            occupation_en="Physician - Private Hospital",
            loan_type="auto",
            loan_type_label="تمويل سيارات",
            loan_type_label_en="Auto Financing",
            requested_amount=640000.0,
            currency="ج.م",
            date="03 سبتمبر 2026",
            last_updated="منذ ساعة",
            status="approved",
            ai_recommendation="approve",
            ai_recommendation_label="موافقة معتمدة",
            ai_recommendation_label_en="Approved",
            ai_confidence=96.0,
            recommendation_reasons=[{"ar": "تاريخ ائتماني ممتاز ودخل مثبت.", "en": "Excellent credit track record and verified income."}],
            pipeline_completed_steps=5,
            pipeline_total_steps=5,
            ocr_accuracy=99.1,
            extracted_from_doc_count=4,
            bank_summary={"totalDeposits": 720000.0, "monthlyAverage": 240000.0, "totalTransactions": 110, "averageBalance": 320000.0, "periodMonths": 3},
            credit_score=91,
            credit_risk_category="low",
            credit_risk_label="جدارة ممتازة",
            credit_risk_label_en="Excellent Score",
            calculated_factors_count=18,
            fraud_risk_score=12,
            fraud_risk_category="low",
            fraud_risk_label="نظيف تماماً",
            fraud_risk_label_en="Clean Record",
            analyzed_signals_count=32,
        )

        app4 = LoanApplication(
            id="APP-2026-0838",
            applicant_name="مريم وائل",
            applicant_name_en="Maryam Wael",
            national_id="28812040103322",
            mobile_number="01567890123",
            client_type="current",
            occupation="مديرة تسويق عقاري",
            occupation_en="Real Estate Marketing Director",
            loan_type="mortgage",
            loan_type_label="تمويل عقاري",
            loan_type_label_en="Mortgage Financing",
            requested_amount=2500000.0,
            currency="ج.م",
            date="02 سبتمبر 2026",
            last_updated="منذ ساعتين",
            status="under_review",
            ai_recommendation="manual_review",
            ai_recommendation_label="مراجعة الضمانات",
            ai_recommendation_label_en="Collateral Review",
            ai_confidence=82.0,
            recommendation_reasons=[{"ar": "المبلغ كبير يتطلب تقييماً ميدانياً للوحدة العقارية.", "en": "High amount requires on-site real estate appraisal."}],
            pipeline_completed_steps=4,
            pipeline_total_steps=5,
            ocr_accuracy=96.5,
            extracted_from_doc_count=5,
            bank_summary={"totalDeposits": 1400000.0, "monthlyAverage": 466666.0, "totalTransactions": 145, "averageBalance": 590000.0, "periodMonths": 3},
            credit_score=76,
            credit_risk_category="medium",
            credit_risk_label="مخاطر مقبولة",
            credit_risk_label_en="Acceptable Risk",
            calculated_factors_count=18,
            fraud_risk_score=28,
            fraud_risk_category="low",
            fraud_risk_label="مخاطر منخفضة",
            fraud_risk_label_en="Low Risk",
            analyzed_signals_count=32,
        )

        app5 = LoanApplication(
            id="APP-2026-0835",
            applicant_name="يوسف خالد",
            applicant_name_en="Youssef Khaled",
            national_id="29806110105577",
            mobile_number="01099887766",
            client_type="current",
            occupation="محاسب قانوني",
            occupation_en="Certified Public Accountant",
            loan_type="personal",
            loan_type_label="تمويل شخصي",
            loan_type_label_en="Personal Financing",
            requested_amount=95000.0,
            currency="ج.م",
            date="01 سبتمبر 2026",
            last_updated="منذ يوم",
            status="approved",
            ai_recommendation="approve",
            ai_recommendation_label="موافقة فورية",
            ai_recommendation_label_en="Instant Approval",
            ai_confidence=94.0,
            recommendation_reasons=[{"ar": "طلب متوافق تماماً مع شروط التمويل السريع.", "en": "Fully compliant with fast-track financing parameters."}],
            pipeline_completed_steps=5,
            pipeline_total_steps=5,
            ocr_accuracy=98.9,
            extracted_from_doc_count=3,
            bank_summary={"totalDeposits": 180000.0, "monthlyAverage": 60000.0, "totalTransactions": 55, "averageBalance": 45000.0, "periodMonths": 3},
            credit_score=88,
            credit_risk_category="low",
            credit_risk_label="مخاطر منخفضة",
            credit_risk_label_en="Low Risk",
            calculated_factors_count=18,
            fraud_risk_score=10,
            fraud_risk_category="low",
            fraud_risk_label="سليم",
            fraud_risk_label_en="Clean",
            analyzed_signals_count=32,
        )

        app6 = LoanApplication(
            id="APP-2026-0832",
            applicant_name="نورهان عادل",
            applicant_name_en="Nourhan Adel",
            national_id="29604150106611",
            mobile_number="01155443322",
            client_type="current",
            occupation="صيدلانية",
            occupation_en="Pharmacist",
            loan_type="auto",
            loan_type_label="تمويل سيارات",
            loan_type_label_en="Auto Financing",
            requested_amount=420000.0,
            currency="ج.م",
            date="31 أغسطس 2026",
            last_updated="منذ 3 أيام",
            status="rejected",
            ai_recommendation="reject",
            ai_recommendation_label="رفض الطلب",
            ai_recommendation_label_en="Reject Application",
            ai_confidence=92.0,
            recommendation_reasons=[{"ar": "تجاوز الحد الأقصى لنسبة عبء الدين المحددة من البنك المركزي المصري (DBR > 50%).", "en": "Exceeded Central Bank of Egypt Debt-Burden Ratio (DBR > 50%)."}],
            pipeline_completed_steps=5,
            pipeline_total_steps=5,
            ocr_accuracy=97.8,
            extracted_from_doc_count=4,
            bank_summary={"totalDeposits": 220000.0, "monthlyAverage": 73333.0, "totalTransactions": 60, "averageBalance": 18000.0, "periodMonths": 3},
            credit_score=63,
            credit_risk_category="medium",
            credit_risk_label="مخاطر مرتفعة نسبياً",
            credit_risk_label_en="Relatively High Risk",
            calculated_factors_count=18,
            fraud_risk_score=35,
            fraud_risk_category="medium",
            fraud_risk_label="مخاطر مقبولة",
            fraud_risk_label_en="Medium Risk",
            analyzed_signals_count=32,
        )

        db.add_all([app1, app2, app3, app4, app5, app6])
        db.flush()

        # Documents for App1
        docs = [
            Document(id="doc_1", application_id="APP-2026-0839", code="ID", name="بطاقة الرقم القومي", name_en="National ID Card", size="2.4 MB", upload_date="04 سبتمبر 2026", status="success", status_label="ناجح", status_label_en="Verified"),
            Document(id="doc_2", application_id="APP-2026-0839", code="BA", name="كشف حساب بنكي - آخر 3 شهور", name_en="Bank Statement (Last 3 Months)", size="5.8 MB", upload_date="04 سبتمبر 2026", status="success", status_label="ناجح", status_label_en="Verified"),
            Document(id="doc_3", application_id="APP-2026-0839", code="IC", name="شهادة دخل حديثة", name_en="Recent Income Certificate", size="1.2 MB", upload_date="04 سبتمبر 2026", status="processing", status_label="قيد المعالجة", status_label_en="Processing"),
            Document(id="doc_4", application_id="APP-2026-0839", code="CR", name="سجل تجاري مميكن", name_en="Commercial Register", size="3.1 MB", upload_date="04 سبتمبر 2026", status="success", status_label="ناجح", status_label_en="Verified"),
        ]
        db.add_all(docs)

        # Timeline for App1
        timeline = [
            TimelineEvent(id="t1", application_id="APP-2026-0839", title="استلام الطلب", title_en="Application Ingestion", timestamp="04 سبتمبر - 09:42 ص", description="تم استلام الطلب والمستندات بنجاح من بوابة العميل", description_en="Received application & documents from applicant portal", status="completed", icon_type="receipt"),
            TimelineEvent(id="t2", application_id="APP-2026-0839", title="استخراج البيانات بالـ OCR", title_en="OCR Extraction", timestamp="04 سبتمبر - 09:43 ص", description="اكتمل استخراج البيانات بدقة 97.4%", description_en="Completed field extraction with 97.4% confidence", status="completed", icon_type="ocr"),
            TimelineEvent(id="t3", application_id="APP-2026-0839", title="تقييم الائتمان", title_en="Credit Assessment", timestamp="04 سبتمبر - 09:45 ص", description="تم احتساب الدرجة الائتمانية: 54/100 (مخاطر متوسطة)", description_en="Calculated credit score: 54/100 (Medium Risk)", status="completed", icon_type="score"),
            TimelineEvent(id="t4", application_id="APP-2026-0839", title="فحص الاحتيال", title_en="Fraud Risk Scan", timestamp="04 سبتمبر - 09:46 ص", description="تم رصد 3 إشارات تحتاج مراجعة بشرية فورية", description_en="Flagged 3 anomalies requiring immediate human review", status="current", icon_type="fraud"),
            TimelineEvent(id="t5", application_id="APP-2026-0839", title="المراجعة النهائية والقرار", title_en="Final Decision", timestamp="بانتظار الإجراء", description="في انتظار قرار موظف الائتمان", description_en="Awaiting credit officer review and action", status="pending", icon_type="review"),
        ]
        db.add_all(timeline)
        db.commit()

    # 3. CaseCards (Kanban)
    if db.query(CaseCard).count() == 0:
        cases = [
            CaseCard(id="case_1", application_id="APP-2026-0841", client_name="سارة إبراهيم", client_name_en="Sara Ibrahim", initials="س", amount=640000.0, currency="ج.م", stage_tag="تقييم المستندات", stage_tag_en="Document Evaluation", column_id="processing"),
            CaseCard(id="case_2", application_id="APP-2026-0835", client_name="يوسف خالد", client_name_en="Youssef Khaled", initials="ي", amount=95000.0, currency="ج.م", stage_tag="استخراج البيانات", stage_tag_en="Data Extraction", column_id="processing"),
            CaseCard(id="case_3", application_id="APP-2026-0839", client_name="أحمد فؤاد", client_name_en="Ahmed Fouad", initials="أ", amount=1250000.0, currency="ج.م", stage_tag="إشارة احتيال", stage_tag_en="Fraud Flag", column_id="human_review"),
            CaseCard(id="case_4", application_id="APP-2026-0838", client_name="مريم وائل", client_name_en="Maryam Wael", initials="م", amount=2500000.0, currency="ج.م", stage_tag="درجة ائتمانية", stage_tag_en="Credit Score", column_id="human_review"),
            CaseCard(id="case_5", application_id="APP-2026-0832", client_name="نورهان عادل", client_name_en="Nourhan Adel", initials="ن", amount=420000.0, currency="ج.م", stage_tag="تم الاعتماد", stage_tag_en="Approved", column_id="completed"),
            CaseCard(id="case_6", application_id="APP-2026-0830", client_name="كريم حسني", client_name_en="Karim Hosny", initials="ك", amount=180000.0, currency="ج.م", stage_tag="تم الاعتماد", stage_tag_en="Approved", column_id="completed"),
        ]
        db.add_all(cases)
        db.commit()

    # 4. Chat Sessions & Messages
    if db.query(ChatSession).count() == 0:
        sess1 = ChatSession(
            id="sess_1",
            user_id="usr_officer_01",
            title="تحليل طلب أحمد فؤاد",
            title_en="Analysis for Ahmed Fouad",
            time_ago="منذ 12 دقيقة",
            time_ago_en="12 mins ago",
            active=True,
        )
        sess2 = ChatSession(
            id="sess_2",
            user_id="usr_officer_01",
            title="ملخص طلبات اليوم",
            title_en="Today's Applications Summary",
            time_ago="أمس، 04:20 م",
            time_ago_en="Yesterday, 04:20 PM",
            active=False,
        )
        sess3 = ChatSession(
            id="sess_3",
            user_id="usr_officer_01",
            title="مؤشرات الاحتيال الشهرية",
            title_en="Monthly Fraud Indicators",
            time_ago="02 سبتمبر",
            time_ago_en="02 Sep",
            active=False,
        )
        db.add_all([sess1, sess2, sess3])
        db.flush()

        messages = [
            ChatMessage(
                id="msg_1",
                session_id="sess_1",
                sender="assistant",
                text="مرحباً محمد، أنا جاهز لمساعدتك في تحليل طلب أحمد فؤاد. يمكنني الإجابة عن أسئلتك بالرجوع إلى المستندات المرفقة:",
                text_en="Hello Mohamed, I am ready to assist you in analyzing Ahmed Fouad's financing application. I can answer your questions cited with the attached documents:",
                timestamp="09:48 ص",
                citations=[
                    {"documentName": "كشف الحساب البنكي", "documentNameEn": "Bank Statement", "page": 1, "quote": "كشف حساب 3 شهور"},
                    {"documentName": "شهادة الدخل", "documentNameEn": "Income Certificate", "page": 1, "quote": "بيان الدخل المعلن"}
                ]
            ),
            ChatMessage(
                id="msg_2",
                session_id="sess_1",
                sender="user",
                text="ما هو مجموع مبلغ الإيداعات خلال آخر 3 شهور؟",
                text_en="What is the total amount of deposits over the last 3 months?",
                timestamp="09:49 ص",
                citations=[]
            ),
            ChatMessage(
                id="msg_3",
                session_id="sess_1",
                sender="assistant",
                text="إجمالي الإيداعات خلال آخر 3 شهور هو 485,200 ج.م، بمتوسط شهري قدره 161,733 ج.م.",
                text_en="Total deposits over the last 3 months amount to 485,200 EGP, with a monthly average of 161,733 EGP.",
                timestamp="09:49 ص",
                citations=[
                    {"documentName": "كشف الحساب البنكي", "documentNameEn": "Bank Statement", "page": 2, "quote": "إجمالي الإيداعات: 485,200 ج.م - صفحة 2، كشف الحساب"}
                ],
                suggested_action={
                    "label": "إجراء مقترح",
                    "labelEn": "Suggested Action",
                    "description": "ينصح بمراجعة يدوية بسبب التناقض بين الدخل المعلن ومتوسط الإيداعات.",
                    "descriptionEn": "Manual review recommended due to discrepancy between declared income and average deposits."
                }
            )
        ]
        db.add_all(messages)
        db.commit()
