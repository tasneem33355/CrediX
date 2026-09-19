'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '@/types';

interface Translations {
  [key: string]: string;
}

const arTranslations: Translations = {
  // Brand
  'brand.name': 'CrediX',
  'brand.tagline': 'ذكاء الائتمان والتمويل الذكي',
  'brand.subtitle': 'منظومة تحليل طلبات التمويل والأئتمان الذكية',
  'brand.poweredBy': 'محرك الذكاء الاصطناعي',
  'brand.aiStatus': 'يعمل بكفاءة 98.4%',
  'brand.version': 'الإصدار 2.4.0',
  'brand.copyright': '© 2026 CrediX',

  // Navigation
  'nav.mainMenu': 'القائمة الرئيسية',
  'nav.dashboard': 'لوحة التحكم',
  'nav.applications': 'طلبات التمويل',
  'nav.documentAnalysis': 'تحليل المستندات',
  'nav.creditAssessment': 'تقييم الائتمان',
  'nav.fraudDetection': 'اكتشاف الاحتيال',
  'nav.aiAssistant': 'المساعد الذكي',
  'nav.caseManagement': 'إدارة الحالات',
  'nav.applicantPortal': 'بوابة العميل',
  'nav.logout': 'تسجيل الخروج',
  'nav.breadcrumb.root': 'تحليل التمويل والائتمان الذكي',

  // Header & User
  'header.welcome': 'مرحباً،',
  'header.officerTitle': 'كبير مسؤولي الائتمان',
  'header.officerName': 'محمد سامي',
  'header.notifications': 'الإشعارات',
  'header.switchLang': 'English',
  'header.searchPlaceholder': 'بحث بالاسم، رقم الطلب، أو الرقم القومي...',
  'header.encrypted': 'بياناتك مشفرة ومحمية',

  // Table Headers
  'table.appNumber': 'رقم الطلب',
  'table.clientName': 'اسم العميل',
  'table.loanType': 'نوع التمويل',
  'table.amount': 'المبلغ المطلوب',
  'table.creditScore': 'الجدارة',
  'table.status': 'الحالة',
  'table.actions': 'إجراءات',
  'table.showing': 'عرض',
  'table.of': 'من أصل',
  'table.lastUpdated': 'آخر تحديث منذ 5 دقائق',

  // Common Actions
  'action.save': 'حفظ',
  'action.cancel': 'إلغاء',
  'action.submit': 'إرسال',
  'action.next': 'التالي',
  'action.previous': 'السابق',
  'action.viewAll': 'عرض الكل',
  'action.viewDetails': 'عرض التفاصيل',
  'action.viewApplication': 'عرض الطلب',
  'action.backToApps': 'العودة إلى الطلبات',
  'action.export': 'تصدير البيانات',
  'action.newApplication': 'طلب تمويل جديد',
  'action.createCase': 'إنشاء حالة',
  'action.addDocument': 'إضافة مستند',
  'action.preview': 'معاينة',
  'action.send': 'إرسال',
  'action.filter': 'تصفية',
  'action.advancedFilters': 'فلاتر متقدمة',
  'action.clear': 'مسح',
  'action.retry': 'إعادة المحاولة',
  'action.close': 'إغلاق',

  // Client Portal & Tracking
  'portal.title': 'بوابة متابعة طلبات التمويل',
  'portal.welcome': 'مرحباً بك يا',
  'portal.subtitle': 'يمكنك متابعة حالة طلبك وتفاصيل المعالجة بالذكاء الاصطناعي خطوة بخطوة',
  'portal.activeApp': 'الطلب النشط حالياً',
  'portal.trackSteps': 'مراحل مراجعة الطلب',
  'portal.step1': 'استلام الطلب والمستندات',
  'portal.step2': 'تدقيق الوثائق واستخراج البيانات (OCR)',
  'portal.step3': 'التقييم الائتماني وتحليل الجدارة',
  'portal.step4': 'المراجعة النهائية وصدور القرار',
  'portal.step5': 'صرف التمويل وتوقيع العقود',
  'portal.estimatedTime': 'متوسط وقت الرد المتوقع: أقل من ساعتين',
  'portal.myDocuments': 'مستنداتي المرفوعة',
  'portal.loanSummary': 'ملخص التمويل المطلوب',
  'portal.monthlyInstallment': 'القسط الشهري التقديري',
  'portal.trackAction': 'متابعة حالة الطلب',
  'portal.newLoanAction': 'تقديم طلب آخر',
  'portal.submittedSuccess': 'تم استلام طلب التمويل بنجاح!',
  'portal.submittedDesc': 'تم حفظ بياناتك وجاري فحص وتدقيق المستندات بواسطة محرك الذكاء الاصطناعي.',

  // Officer Application Actions
  'application.approve': 'اعتماد التمويل',
  'application.reject': 'رفض الطلب',
  'application.manualReview': 'بدء مراجعة يدوية',
  'application.askAI': 'اسأل المساعد الذكي',
  'application.recommendation': 'التوصية الأولية',
  'application.confidence': 'ثقة',
  'application.reasons': 'أسباب التوصية',
  'application.detailsTitle': 'تفاصيل طلب التمويل',
  'application.officerAction': 'الإجراء الائتماني:',

  // Dashboard Stats
  'dashboard.overviewSubtitle': 'إليك ملخص أداء محفظة التمويل اليوم',
  'dashboard.totalApplications': 'إجمالي الطلبات',
  'dashboard.approvalRate': 'نسبة الموافقة',
  'dashboard.underReview': 'طلبات قيد المراجعة',
  'dashboard.suspiciousFraud': 'حالات احتيال مشبوهة',
  'dashboard.fromLastMonth': 'من الشهر السابق',
  'dashboard.requireAttention': 'حالات تحتاج انتباهك',
  'dashboard.trendTitle': 'اتجاه الطلبات',
  'dashboard.trendSubtitle': 'عدد الطلبات خلال آخر 30 يوم',
  'dashboard.incomingRequests': 'الطلبات المستلمة',
  'dashboard.statusDistribution': 'حالة الطلبات',
  'dashboard.statusDistributionSubtitle': 'التوزيع المالي الحالي',
  'dashboard.byLoanType': 'الطلبات حسب نوع التمويل',
  'dashboard.byLoanTypeSubtitle': 'مقارنة الطلبات الواردة هذا الشهر',
  'dashboard.thisMonth': 'هذا الشهر',
  'dashboard.recentApplications': 'أحدث الطلبات',
  'dashboard.recentSubtitle': 'آخر الطلبات التي تحتاج إلى إجراء',

  // Loan Types
  'loanType.personal': 'تمويل شخصي',
  'loanType.sme': 'تمويل مشروعات صغيرة',
  'loanType.auto': 'تمويل سيارات',
  'loanType.mortgage': 'تمويل عقاري',

  // Application Statuses
  'status.all': 'كل الحالات',
  'status.approved': 'موافق',
  'status.underReview': 'قيد المراجعة',
  'status.suspicious': 'مشبوه',
  'status.rejected': 'مرفوض',
  'status.completed': 'مكتملة',
  'status.processing': 'قيد المعالجة',
  'status.humanReview': 'قيد المراجعة البشرية',

  // Risk Levels
  'risk.low': 'مخاطر منخفضة',
  'risk.medium': 'مخاطر متوسطة',
  'risk.high': 'مخاطر مرتفعة',
  'risk.critical': 'مخاطر حرجة',
  'risk.requiresAttention': 'يتطلب الانتباه',
  'risk.highRiskCasesBadge': 'حالات عالية الخطورة',

  // Application Details Tabs
  'tab.extractedData': 'البيانات المستخرجة',
  'tab.creditAssessment': 'تقييم الائتمان',
  'tab.fraudDetection': 'اكتشاف الاحتيال',
  'tab.documents': 'المستندات',
  'tab.auditLog': 'سجل الطلب',

  // Extracted Data (OCR)
  'ocr.title': 'البيانات المستخرجة آلياً',
  'ocr.accuracy': 'دقة الاستخراج',
  'ocr.extractedFrom': 'تم استخراجها من',
  'ocr.documentsCount': 'مستندات باستخدام OCR',
  'ocr.name': 'الاسم الكامل',
  'ocr.nationalId': 'الرقم القومي',
  'ocr.declaredIncome': 'الدخل الشهري المعلن',
  'ocr.businessAge': 'مدة النشاط / السن',
  'ocr.address': 'عنوان النشاط / السكن',
  'ocr.purpose': 'الغرض من التمويل',

  // Bank Statement Analytics
  'bank.summaryTitle': 'ملخص الحساب البنكي',
  'bank.fromStatement': 'من كشف حساب آخر 3 شهور',
  'bank.totalDeposits': 'إجمالي الإيداعات',
  'bank.monthlyAverage': 'متوسط شهري',
  'bank.transactionsCount': 'عدد العمليات',
  'bank.averageBalance': 'متوسط الرصيد',
  'bank.operation': 'عملية',

  // Pipeline Stepper
  'pipeline.title': 'حالة معالجة المستندات',
  'pipeline.step.ocr': 'استخراج البيانات',
  'pipeline.step.credit': 'تقييم الائتمان',
  'pipeline.step.fraud': 'فحص الاحتيال',
  'pipeline.step.review': 'المراجعة النهائية',
  'pipeline.progress': 'تحليل الذكاء الاصطناعي',
  'pipeline.ofCompleted': 'مكتمل',

  // Credit Assessment
  'credit.scoreTitle': 'الدرجة الائتمانية',
  'credit.calculatedFrom': 'محسوبة بناءً على 18 عاملاً',
  'credit.factorsTitle': 'عوامل التقييم',
  'credit.factorsSubtitle': 'مساهمة كل عامل في الدرجة النهائية',
  'credit.dti': 'نسبة الدين إلى الدخل',
  'credit.paymentHistory': 'سجل الدفع والتسديد',
  'credit.historyLength': 'طول السجل الائتماني',
  'credit.jobStability': 'طبيعة الوظيفة واستقرارها',
  'credit.rating.good': 'جيد',
  'credit.rating.medium': 'متوسط',
  'credit.rating.weak': 'ضعيف',

  // Fraud Detection
  'fraud.scoreTitle': 'درجة مخاطر الاحتيال',
  'fraud.analyzedSignals': 'تحليل 32 إشارة سلوكية ووثائقية',
  'fraud.signalsTitle': 'إشارات الكشف',
  'fraud.signalsSubtitle': 'الإشارات التي أثرت على النتيجة',
  'fraud.actionRequiredAlert': 'تم اكتشاف 3 إشارات تستدعي المراجعة البشرية قبل اتخاذ القرار',
  'fraud.detectedBy': 'تم رصدها بواسطة نموذج الكشف الآلي',
  'fraud.evidence': 'الدليل والسبب',
  'fraud.relatedDoc': 'المستند المرتبط',
  'fraud.action': 'الإجراء الموصى به',
  'fraud.modelConfidence': 'ثقة النموذج',

  // AI Assistant Chat
  'ai.assistantTitle': 'مساعد CrediX الذكي',
  'ai.assistantSubtitle': 'مساعد تحليل الائتمان — مدعوم بالذكاء الاصطناعي',
  'ai.onlineStatus': 'متصل ويعمل الآن',
  'ai.askAboutApp': 'اسأل عن أي تفاصيل في طلبات التمويل — الإجابات مدعومة بمصادر موثقة',
  'ai.chatHistory': 'المحادثات',
  'ai.inputPlaceholder': 'اكتب سؤالك عن هذا الطلب...',
  'ai.suggestedAction': 'إجراء مقترح',
  'ai.prompt.contradictions': 'هل هناك متناقضات في الأوراق؟',
  'ai.prompt.checkCredit': 'فحص الجدارة الائتمانية',
  'ai.prompt.cashFlow': 'تحليل التدفق النقدي للعميل',

  // Case Management Kanban
  'cases.title': 'إدارة الحالات',
  'cases.subtitle': 'تنظيم ومتابعة سير عمل طلبات التمويل',
  'cases.underProcessing': 'قيد المعالجة',
  'cases.humanReview': 'قيد المراجعة البشرية',
  'cases.completed': 'مكتملة',
  'cases.moveTo': 'نقل إلى',
  'cases.reviewAction': 'مراجعة',
  'cases.approveAction': 'اعتماد',
  'cases.processAction': 'معالجة',
  'cases.reopenAction': 'إعادة فتح',
  'cases.totalVolume': 'إجمالي التمويل',
  'cases.totalCases': 'إجمالي الحالات',

  // Applicant Portal & Wizard
  'apply.heroTitle': 'قدّم على تمويلك بكل ثقة وسهولة',
  'apply.heroSubtitle': 'أكمل طلبك في خطوات بسيطة. تساعدنا مستنداتك في تقييم طلبك بشكل أسرع وأكثر شفافية.',
  'apply.step1': 'المعلومات الشخصية',
  'apply.step2': 'تفاصيل التمويل',
  'apply.step3': 'المستندات',
  'apply.step4': 'المراجعة والإرسال',
  'apply.stepOf': 'الخطوة',
  'apply.of': 'من',
  'apply.fullName': 'الاسم بالكامل',
  'apply.nationalId': 'الرقم القومي',
  'apply.mobileNumber': 'رقم الهاتف المحمول',
  'apply.saveAndReturn': 'حفظ والمتابعة لاحقاً',
  'apply.nextFinancing': 'التالي: تفاصيل التمويل',
  'apply.fairAi': 'تقييم عادل مدعوم بالذكاء الاصطناعي',
  'apply.authRequiredTitle': 'تسجيل الدخول مطلوب لبدء التقديم',
  'apply.authRequiredDesc': 'لتقديم طلب تمويل وحماية بياناتك المصرفية ومتابعة مراحل الموافقة، يرجى تسجيل الدخول أو إنشاء حساب جديد أولاً.',
  'apply.authSignInBtn': 'تسجيل الدخول إلى حسابي',
  'apply.authSignUpBtn': 'إنشاء حساب عميل جديد',

  // Landing Page
  'landing.badge': 'الجيل الجديد من حلول الائتمان المصرفي بالذكاء الاصطناعي',
  'landing.heroTitle1': 'المنصة الذكية الرائدة لتحليل',
  'landing.heroTitle2': 'طلبات التمويل والجدارة الائتمانية',
  'landing.heroDesc': 'أتمتة كاملة لاستخراج بيانات المستندات (OCR)، تقييم المخاطر الائتمانية بنماذج الذكاء الاصطناعي، واكتشاف محاولات الاحتيال في ثوانٍ معدودة وفقاً لمعايير البنك المركزي المصري.',
  'landing.ctaApplicant': 'تقديم طلب تمويل الآن',
  'landing.ctaOfficer': 'بوابة موظفي الائتمان',
  'landing.stats.speed': 'تسريع الموافقة بنسبة 30%',
  'landing.stats.accuracy': 'دقة استخراج OCR تتجاوز 95%',
  'landing.stats.fraud': 'خفض خسائر الاحتيال 15%',
  'landing.stats.capacity': 'معالجة +1000 طلب يومياً',
  'landing.cbeCompliance': 'متوافق مع تعليمات ومعايير حماية البيانات والشمول المالي للبنك المركزي المصري',

  // Auth & Sign In / Sign Up
  'auth.signIn': 'تسجيل الدخول',
  'auth.signUp': 'إنشاء حساب جديد',
  'auth.signInDesc': 'تسجيل الدخول إلى منظومة التمويل والائتمان الذكي',
  'auth.signUpDesc': 'أنشئ حساباً جديداً للوصول إلى المنظومة الذكية',
  'auth.selectRole': 'حدد نوع الحساب / الدور',
  'auth.roleOfficer': 'موظف ائتمان',
  'auth.roleClient': 'عميل تمويل',
  'auth.fullName': 'الاسم بالكامل',
  'auth.email': 'البريد الإلكتروني / اسم المستخدم',
  'auth.password': 'كلمة المرور',
  'auth.confirmPassword': 'تأكيد كلمة المرور',
  'auth.nationalId': 'الرقم القومي / المعرّف الوظيفي',
  'auth.mobileNumber': 'رقم الهاتف المحمول',
  'auth.rememberMe': 'تذكرني',
  'auth.forgotPassword': 'نسيت كلمة المرور؟',
  'auth.enterOfficerDashboard': 'دخول لوحة موظف الائتمان',
  'auth.enterClientPortal': 'دخول بوابة تقديم التمويل',
  'auth.registerOfficer': 'تسجيل حساب موظف ائتمان جديد',
  'auth.registerClient': 'تسجيل حساب عميل تمويل جديد',
  'auth.demoAccount': 'حساب تجريبي',
  'auth.demoCredentialsPrefilled': 'بيانات اعتماد تجريبية مُعبأة مسبقاً للعرض',
  'auth.demoHint': '💡 حساب تجريبي جاهز: انقر مباشرة للدخول دون كتابة بيانات',
  'auth.haveAccount': 'لديك حساب بالفعل؟',
  'auth.dontHaveAccount': 'ليس لديك حساب؟',
  'auth.termsNotice': 'بالاستمرار، أنت توافق على معايير حماية البيانات والشمول المالي للبنك المركزي المصري (CBE).',

  // General Currency & Numbers
  'currency.egp': 'ج.م',
  'currency.code': 'EGP',
  'unit.days': 'يوم',
  'unit.months': 'شهور',
  'unit.years': 'سنوات',
  'unit.items': 'طلب',
  'unit.last30days': 'آخر 30 يوم',
  'unit.minutesAgo': 'دقيقة',
};

const enTranslations: Translations = {
  // Brand
  'brand.name': 'CrediX',
  'brand.tagline': 'Credit Intelligence & Smart Financing',
  'brand.subtitle': 'Smart Financing & Credit Application Analysis Platform',
  'brand.poweredBy': 'AI Engine',
  'brand.aiStatus': 'Running at 98.4% efficiency',
  'brand.version': 'Version 2.4.0',
  'brand.copyright': '© 2026 CrediX',

  // Navigation
  'nav.mainMenu': 'Main menu',
  'nav.dashboard': 'Dashboard',
  'nav.applications': 'Applications',
  'nav.documentAnalysis': 'Document Analysis',
  'nav.creditAssessment': 'Credit Assessment',
  'nav.fraudDetection': 'Fraud Detection',
  'nav.aiAssistant': 'AI Assistant',
  'nav.caseManagement': 'Case Management',
  'nav.applicantPortal': 'Applicant Portal',
  'nav.logout': 'Sign Out',
  'nav.breadcrumb.root': 'Smart Financing & Credit Analysis',

  // Header & User
  'header.welcome': 'Welcome,',
  'header.officerTitle': 'Senior Credit Officer',
  'header.officerName': 'Mohamed Sami',
  'header.notifications': 'Notifications',
  'header.switchLang': 'العربية',
  'header.searchPlaceholder': 'Search by name, application ID, or national ID...',
  'header.encrypted': 'Your data is encrypted and secure',

  // Table Headers
  'table.appNumber': 'App ID',
  'table.clientName': 'Client Name',
  'table.loanType': 'Loan Type',
  'table.amount': 'Requested Amount',
  'table.creditScore': 'Credit Score',
  'table.status': 'Status',
  'table.actions': 'Actions',
  'table.showing': 'Showing',
  'table.of': 'of',
  'table.lastUpdated': 'Last updated 5 mins ago',

  // Common Actions
  'action.save': 'Save',
  'action.cancel': 'Cancel',
  'action.submit': 'Submit',
  'action.next': 'Next',
  'action.previous': 'Previous',
  'action.viewAll': 'View all',
  'action.viewDetails': 'View details',
  'action.viewApplication': 'View application',
  'action.backToApps': 'Back to applications',
  'action.export': 'Export data',
  'action.newApplication': 'New Application',
  'action.createCase': 'Create case',
  'action.addDocument': 'Add document',
  'action.preview': 'Preview',
  'action.send': 'Send',
  'action.filter': 'Filter',
  'action.advancedFilters': 'Advanced filters',
  'action.clear': 'Clear',
  'action.retry': 'Retry',
  'action.close': 'Close',

  // Client Portal & Tracking
  'portal.title': 'Financing Application Tracking Portal',
  'portal.welcome': 'Welcome back,',
  'portal.subtitle': 'Track your financing application status and AI verification stages step by step',
  'portal.activeApp': 'Active Application',
  'portal.trackSteps': 'Application Verification Stages',
  'portal.step1': 'Application & Document Ingestion',
  'portal.step2': 'Document OCR & Data Verification',
  'portal.step3': 'Credit Evaluation & Risk Assessment',
  'portal.step4': 'Final Review & Decision',
  'portal.step5': 'Disbursement & Contract Signing',
  'portal.estimatedTime': 'Estimated turnaround time: Under 2 hours',
  'portal.myDocuments': 'My Uploaded Documents',
  'portal.loanSummary': 'Financing Request Summary',
  'portal.monthlyInstallment': 'Estimated Monthly Installment',
  'portal.trackAction': 'Track Application Status',
  'portal.newLoanAction': 'Submit Another Application',
  'portal.submittedSuccess': 'Application Received Successfully!',
  'portal.submittedDesc': 'Your details have been saved. AI engines are currently extracting and auditing your documents.',

  // Officer Application Actions
  'application.approve': 'Approve Financing',
  'application.reject': 'Reject Application',
  'application.manualReview': 'Start Manual Review',
  'application.askAI': 'Ask AI Assistant',
  'application.recommendation': 'Initial Recommendation',
  'application.confidence': 'Confidence',
  'application.reasons': 'Recommendation Reasons',
  'application.detailsTitle': 'Financing Application Details',
  'application.officerAction': 'Officer Action:',

  // Dashboard Stats
  'dashboard.overviewSubtitle': "Here's a summary of financing portfolio performance today",
  'dashboard.totalApplications': 'Total Applications',
  'dashboard.approvalRate': 'Approval Rate',
  'dashboard.underReview': 'Applications Under Review',
  'dashboard.suspiciousFraud': 'Suspicious Fraud Cases',
  'dashboard.fromLastMonth': 'from last month',
  'dashboard.requireAttention': 'Cases requiring your attention',
  'dashboard.trendTitle': 'Applications Trend',
  'dashboard.trendSubtitle': 'Number of applications over the last 30 days',
  'dashboard.incomingRequests': 'Ingested Applications',
  'dashboard.statusDistribution': 'Application Status',
  'dashboard.statusDistributionSubtitle': 'Current financial breakdown',
  'dashboard.byLoanType': 'Applications by Financing Type',
  'dashboard.byLoanTypeSubtitle': 'Comparison of incoming requests this month',
  'dashboard.thisMonth': 'This Month',
  'dashboard.recentApplications': 'Recent Applications',
  'dashboard.recentSubtitle': 'Latest applications requiring action',

  // Loan Types
  'loanType.personal': 'Personal Financing',
  'loanType.sme': 'SME Financing',
  'loanType.auto': 'Auto Financing',
  'loanType.mortgage': 'Mortgage Financing',

  // Application Statuses
  'status.all': 'All Statuses',
  'status.approved': 'Approved',
  'status.underReview': 'Under Review',
  'status.suspicious': 'Suspicious',
  'status.rejected': 'Rejected',
  'status.completed': 'Completed',
  'status.processing': 'Under Processing',
  'status.humanReview': 'Human Review',

  // Risk Levels
  'risk.low': 'Low Risk',
  'risk.medium': 'Medium Risk',
  'risk.high': 'High Risk',
  'risk.critical': 'Critical Risk',
  'risk.requiresAttention': 'Requires Attention',
  'risk.highRiskCasesBadge': 'High-risk cases',

  // Application Details Tabs
  'tab.extractedData': 'Extracted Data',
  'tab.creditAssessment': 'Credit Assessment',
  'tab.fraudDetection': 'Fraud Detection',
  'tab.documents': 'Documents',
  'tab.auditLog': 'Application Log',

  // Extracted Data (OCR)
  'ocr.title': 'Automatically Extracted Data',
  'ocr.accuracy': 'Extraction Accuracy',
  'ocr.extractedFrom': 'Extracted from',
  'ocr.documentsCount': 'documents using OCR',
  'ocr.name': 'Full Name',
  'ocr.nationalId': 'National ID',
  'ocr.declaredIncome': 'Declared Monthly Income',
  'ocr.businessAge': 'Business Age / Applicant Age',
  'ocr.address': 'Business / Home Address',
  'ocr.purpose': 'Financing Purpose',

  // Bank Statement Analytics
  'bank.summaryTitle': 'Bank Account Summary',
  'bank.fromStatement': 'From last 3-month bank statement',
  'bank.totalDeposits': 'Total Deposits',
  'bank.monthlyAverage': 'Monthly Average',
  'bank.transactionsCount': 'Transactions Count',
  'bank.averageBalance': 'Average Balance',
  'bank.operation': 'transactions',

  // Pipeline Stepper
  'pipeline.title': 'Document Processing Status',
  'pipeline.step.ocr': 'Data Extraction',
  'pipeline.step.credit': 'Credit Assessment',
  'pipeline.step.fraud': 'Fraud Check',
  'pipeline.step.review': 'Final Review',
  'pipeline.progress': 'AI Analysis',
  'pipeline.ofCompleted': 'completed',

  // Credit Assessment
  'credit.scoreTitle': 'Credit Score',
  'credit.calculatedFrom': 'Calculated based on 18 factors',
  'credit.factorsTitle': 'Evaluation Factors',
  'credit.factorsSubtitle': 'Contribution of each factor to final score',
  'credit.dti': 'Debt-to-Income Ratio',
  'credit.paymentHistory': 'Payment & Repayment History',
  'credit.historyLength': 'Credit History Length',
  'credit.jobStability': 'Employment Stability & Nature',
  'credit.rating.good': 'Good',
  'credit.rating.medium': 'Average',
  'credit.rating.weak': 'Weak',

  // Fraud Detection
  'fraud.scoreTitle': 'Fraud Risk Score',
  'fraud.analyzedSignals': 'Analyzed 32 behavioral & documentary signals',
  'fraud.signalsTitle': 'Detection Signals',
  'fraud.signalsSubtitle': 'Signals that impacted this result',
  'fraud.actionRequiredAlert': '3 signals detected requiring human review before decision',
  'fraud.detectedBy': 'Flagged by automated detection model',
  'fraud.evidence': 'Evidence & Reason',
  'fraud.relatedDoc': 'Related Document',
  'fraud.action': 'Recommended Action',
  'fraud.modelConfidence': 'Model Confidence',

  // AI Assistant Chat
  'ai.assistantTitle': 'CrediX Assistant',
  'ai.assistantSubtitle': 'Credit Analysis Assistant — Powered by AI',
  'ai.onlineStatus': 'Online & Active',
  'ai.askAboutApp': 'Ask any details about financing applications — cited with documented sources',
  'ai.chatHistory': 'Conversations',
  'ai.inputPlaceholder': 'Type your question about this application...',
  'ai.suggestedAction': 'Suggested Action',
  'ai.prompt.contradictions': 'Are there any document discrepancies?',
  'ai.prompt.checkCredit': 'Inspect creditworthiness',
  'ai.prompt.cashFlow': 'Analyze applicant cash flow',

  // Case Management Kanban
  'cases.title': 'Case Management',
  'cases.subtitle': 'Organize and track financing workflow status',
  'cases.underProcessing': 'Under Processing',
  'cases.humanReview': 'Human Review',
  'cases.completed': 'Completed',
  'cases.moveTo': 'Move to',
  'cases.reviewAction': 'Review',
  'cases.approveAction': 'Approve',
  'cases.processAction': 'Process',
  'cases.reopenAction': 'Reopen',
  'cases.totalVolume': 'Total Volume',
  'cases.totalCases': 'Total Cases',

  // Applicant Portal & Wizard
  'apply.heroTitle': 'Apply for financing with confidence',
  'apply.heroSubtitle': 'Complete your application in a few simple steps. Your documents help us assess your request faster and more transparently.',
  'apply.step1': 'Personal Information',
  'apply.step2': 'Financing details',
  'apply.step3': 'Documents',
  'apply.step4': 'Review & submit',
  'apply.stepOf': 'Step',
  'apply.of': 'of',
  'apply.fullName': 'Full name',
  'apply.nationalId': 'National ID number',
  'apply.mobileNumber': 'Mobile number',
  'apply.saveAndReturn': 'Save and return later',
  'apply.nextFinancing': 'Next: financing details',
  'apply.fairAi': 'Fair AI-assisted assessment',
  'apply.authRequiredTitle': 'Sign In Required to Start Application',
  'apply.authRequiredDesc': 'To apply for financing, safeguard your banking data, and track approval stages, please sign in or create an account first.',
  'apply.authSignInBtn': 'Sign In to My Account',
  'apply.authSignUpBtn': 'Register New Client Account',

  // Landing Page
  'landing.badge': 'Next-Gen AI Credit & Financing Intelligence',
  'landing.heroTitle1': 'Intelligent Platform for',
  'landing.heroTitle2': 'Financing & Credit Risk Assessment',
  'landing.heroDesc': 'Full automation of document OCR data extraction, AI credit scoring, and instant fraud detection compliant with Central Bank of Egypt regulations.',
  'landing.ctaApplicant': 'Apply for Financing Now',
  'landing.ctaOfficer': 'Credit Officer Portal',
  'landing.stats.speed': '30% Faster Approvals',
  'landing.stats.accuracy': '>95% OCR Accuracy',
  'landing.stats.fraud': '15% Reduced Fraud Losses',
  'landing.stats.capacity': '1,000+ Daily Applications',
  'landing.cbeCompliance': 'Fully compliant with Central Bank of Egypt data protection & financial inclusion regulations',

  // Auth & Sign In / Sign Up
  'auth.signIn': 'Sign In',
  'auth.signUp': 'Create Account',
  'auth.signInDesc': 'Sign in to the Smart Credit & Financing Intelligence Portal',
  'auth.signUpDesc': 'Create a new account to access the intelligent platform',
  'auth.selectRole': 'Select Account Role',
  'auth.roleOfficer': 'Credit Officer',
  'auth.roleClient': 'Financing Client',
  'auth.fullName': 'Full Name',
  'auth.email': 'Email Address / Username',
  'auth.password': 'Password',
  'auth.confirmPassword': 'Confirm Password',
  'auth.nationalId': 'National ID / Employee Badge',
  'auth.mobileNumber': 'Mobile Number',
  'auth.rememberMe': 'Remember me',
  'auth.forgotPassword': 'Forgot password?',
  'auth.enterOfficerDashboard': 'Enter Credit Officer Dashboard',
  'auth.enterClientPortal': 'Enter Applicant Portal',
  'auth.registerOfficer': 'Register Credit Officer Account',
  'auth.registerClient': 'Register Financing Client Account',
  'auth.demoAccount': 'Demo Account',
  'auth.demoCredentialsPrefilled': 'Demo credentials are pre-filled for presentation',
  'auth.demoHint': '💡 Demo credentials prefilled: Click button directly to enter without typing',
  'auth.haveAccount': 'Already have an account?',
  'auth.dontHaveAccount': "Don't have an account?",
  'auth.termsNotice': 'By continuing, you agree to Central Bank of Egypt (CBE) data protection and compliance regulations.',

  // General Currency & Numbers
  'currency.egp': 'EGP',
  'currency.code': 'EGP',
  'unit.days': 'days',
  'unit.months': 'months',
  'unit.years': 'years',
  'unit.items': 'applications',
  'unit.last30days': 'last 30 days',
  'unit.minutesAgo': 'mins ago',
};

interface LanguageContextType {
  language: Language;
  direction: 'rtl' | 'ltr';
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
  formatCurrency: (amount: number) => string;
  formatNumber: (num: number) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ar');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('credix_lang') as Language;
    if (saved && (saved === 'ar' || saved === 'en')) {
      setLanguageState(saved);
      document.documentElement.lang = saved;
      document.documentElement.dir = saved === 'ar' ? 'rtl' : 'ltr';
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('credix_lang', lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  };

  const toggleLanguage = () => {
    const next = language === 'ar' ? 'en' : 'ar';
    setLanguage(next);
  };

  const t = (key: string, fallback?: string): string => {
    const dict = language === 'ar' ? arTranslations : enTranslations;
    return dict[key] || fallback || key;
  };

  const formatCurrency = (amount: number): string => {
    const formatted = new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US').format(amount);
    return `${formatted} ${t('currency.egp')}`;
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US').format(num);
  };

  const direction = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider
      value={{
        language,
        direction,
        setLanguage,
        toggleLanguage,
        t,
        formatCurrency,
        formatNumber,
      }}
    >
      <div dir={direction} className={language === 'ar' ? 'font-arabic' : 'font-sans'} key={language}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
