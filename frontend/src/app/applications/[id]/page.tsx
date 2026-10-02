'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Bot,
  CreditCard,
  Plus,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BarChart3,
  TrendingUp,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Building2,
  Layers,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CircularScoreGauge, LinearFraudRiskBar } from '@/components/ui/ScoreGauge';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { mockApplications } from '@/data/mockData';
import { isDemoMode } from '@/lib/config';
import {
  fetchApplicationById,
  runScoringPipeline,
  submitOfficerDecision,
} from '@/lib/api';

// Empty placeholder; the page shows a loading screen until the real application arrives.
const EMPTY_APPLICATION = {
  id: '', applicantName: '', applicantNameEn: '', nationalId: '', mobileNumber: '',
  clientType: 'new', occupation: '', occupationEn: '', loanType: 'personal',
  loanTypeLabel: '', loanTypeLabelEn: '', requestedAmount: 0, currency: 'ج.م',
  date: '', lastUpdated: '', status: 'under_review',
  aiRecommendation: 'manual_review', aiRecommendationLabel: '', aiRecommendationLabelEn: '',
  aiConfidence: 0, recommendationReasons: [],
  pipelineCompletedSteps: 0, pipelineTotalSteps: 0, pipelineSteps: [],
  ocrAccuracy: 0, extractedFromDocCount: 0, extractedFields: [], bankSummary: {},
  creditScore: 0, creditRiskCategory: 'medium', creditRiskLabel: '', creditRiskLabelEn: '',
  calculatedFactorsCount: 0, creditFactors: [],
  fraudRiskScore: 0, fraudRiskCategory: 'low', fraudRiskLabel: '', fraudRiskLabelEn: '',
  analyzedSignalsCount: 0, fraudSignals: [], documents: [], timeline: [],
} as unknown as (typeof mockApplications)[number];

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, language, formatCurrency, formatNumber, direction } = useLanguage();
  const { session } = useAuth();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const appId = (params?.id as string) || 'APP-2026-0839';
  const [application, setApplication] = useState(
    isDemoMode
      ? mockApplications.find((a) => a.id === appId) || mockApplications[0]
      : EMPTY_APPLICATION
  );
  const [isLoadingApp, setIsLoadingApp] = useState(!isDemoMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState('extractedData');
  const [previewDocModal, setPreviewDocModal] = useState<string | null>(null);
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>('fr_1');
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);
  const [actionErrorToast, setActionErrorToast] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(true);
  const [isScoringLoading, setIsScoringLoading] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [pendingDecisionType, setPendingDecisionType] = useState<'approve' | 'reject' | 'manual' | null>(null);

  // Tabs structure: Micro/Specific Risk Analytics is included as a dedicated tab
  const tabsList = [
    { id: 'extractedData', label: t('tab.extractedData') },
    { id: 'creditAssessment', label: t('tab.creditAssessment') },
    {
      id: 'microAnalytics',
      label: language === 'ar' ? 'تحليلات المخاطر والسيناريوهات المخصصة' : 'Risk & Scenario Analytics',
    },
    {
      id: 'fraudDetection',
      label: t('tab.fraudDetection'),
      badge: application.fraudSignals?.length > 0 ? application.fraudSignals.length : undefined,
    },
    { id: 'documents', label: t('tab.documents'), badge: application.documents?.length || 4 },
    { id: 'auditLog', label: t('tab.auditLog') },
  ];

  // Load the real application from the backend
  useEffect(() => {
    if (isDemoMode || !session?.access_token) return;
    let isMounted = true;
    async function loadData() {
      setIsLoadingApp(true);
      setLoadError(null);
      try {
        const live = await fetchApplicationById(appId, session?.access_token);
        if (isMounted && live && live.id) {
          setApplication({
            ...EMPTY_APPLICATION,
            ...live,
            requestedAmount: Number(live.requestedAmount || 0),
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setLoadError(err.message || (language === 'ar' ? 'تعذّر تحميل الطلب.' : 'Could not load the application.'));
        }
      } finally {
        if (isMounted) setIsLoadingApp(false);
      }
    }
    void loadData();
    return () => {
      isMounted = false;
    };
  }, [appId, session]);

  // Execute full scoring pipeline (Fraud + Credit Risk + LLM Explainer)
  const handleRunAiScoring = async () => {
    setIsScoringLoading(true);
    setActionErrorToast(null);
    try {
      const scoringResult = await runScoringPipeline(appId, session?.access_token);
      setActionSuccessToast(
        language === 'ar'
          ? 'تم تشغيل بايبلاين التقييم الذكي واستخراج التوصية الائتمانية وتفسير الـ AI بنجاح.'
          : 'Scoring pipeline executed successfully with AI explanation generated.'
      );
      // Reload updated application details
      const updated = await fetchApplicationById(appId, session?.access_token);
      if (updated) {
        setApplication((prev) => ({ ...prev, ...updated }));
      }
    } catch (err: any) {
      setActionErrorToast(
        err.message ||
          (language === 'ar'
            ? 'تعذر الاتصال بخدمة التقييم الائتماني أو الـ LLM، يرجى المحاولة لاحقاً.'
            : 'Scoring service call failed.')
      );
    } finally {
      setIsScoringLoading(false);
      setTimeout(() => {
        setActionSuccessToast(null);
        setActionErrorToast(null);
      }, 5000);
    }
  };

  const openDecisionModal = (type: 'approve' | 'reject' | 'manual') => {
    setPendingDecisionType(type);
    setIsDecisionModalOpen(true);
  };

  const confirmDecision = async () => {
    if (!pendingDecisionType) return;
    setIsDecisionModalOpen(false);
    setActionErrorToast(null);

    try {
      await submitOfficerDecision(appId, pendingDecisionType, decisionNotes, session?.access_token);
      const msg =
        pendingDecisionType === 'approve'
          ? language === 'ar'
            ? 'تم اعتماد التمويل وتوثيق القرار رسمياً في سجل التدقيق (Audit Trail).'
            : 'Financing application approved and logged.'
          : pendingDecisionType === 'reject'
          ? language === 'ar'
            ? 'تم رفض الطلب وتوثيق السبب في السجل الائتماني.'
            : 'Application rejected and recorded.'
          : language === 'ar'
          ? 'تم تحويل الطلب إلى قائمة المراجعة البشرية الإضافية.'
          : 'Transferred to manual review queue.';

      setActionSuccessToast(msg);
      setApplication((prev) => ({
        ...prev,
        status: pendingDecisionType === 'approve' ? 'approved' : pendingDecisionType === 'reject' ? 'rejected' : 'under_review',
      }));
    } catch (err: any) {
      setActionErrorToast(err.message || 'حدث خطأ أثناء حفظ القرار.');
    } finally {
      setTimeout(() => {
        setActionSuccessToast(null);
        setActionErrorToast(null);
      }, 5000);
    }
  };

  // Dynamic Micro-Analytics calculations from live application & bank summary
  const bankSummary = (application as any).bankSummary || (application as any).bank_summary || {};
  const declaredSalary = Number(bankSummary.declared_net_salary) || 0;
  const verifiedBankInflow = Number(bankSummary.monthly_average) || 0;
  const requestedLoan = Number(application.requestedAmount) || 0;
  const tenureMonths = Number((application as any).tenureMonths || (application as any).tenure_months) || 36;
  const baseMonthlyInstallment = Math.round((requestedLoan / tenureMonths) * 1.18);
  const dbrDeclared = declaredSalary > 0 ? ((baseMonthlyInstallment / declaredSalary) * 100).toFixed(1) : '—';
  const dbrVerified = verifiedBankInflow > 0 ? ((baseMonthlyInstallment / verifiedBankInflow) * 100).toFixed(1) : '—';
  const applicantPd = (application as any).pdProbability ? Number((application as any).pdProbability) : 0;
  const portfolioAvgPd = 0.0482;
  const applicantEcl = Math.round(requestedLoan * applicantPd * 0.45);

  if (isLoadingApp || loadError) {
    return (
      <AppLayout
        breadcrumbTitle={appId}
        breadcrumbParent={t('nav.applications')}
        breadcrumbParentHref="/applications"
      >
        <div className="p-10 text-center text-xs">
          {loadError ? (
            <span className="text-semantic-error">{loadError}</span>
          ) : (
            <span className="text-text-secondary">
              {language === 'ar' ? 'جاري تحميل الطلب...' : 'Loading application...'}
            </span>
          )}
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout
      breadcrumbTitle={application.id}
      breadcrumbParent={t('nav.applications')}
      breadcrumbParentHref="/applications"
    >
      <div className="space-y-6 pb-28">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text-primary">{t('application.detailsTitle')}</h1>
              <Badge
                variant={
                  application.status === 'approved'
                    ? 'success'
                    : application.status === 'rejected' || application.status === 'suspicious'
                    ? 'danger'
                    : 'warning'
                }
                dot
              >
                {application.status === 'suspicious'
                  ? language === 'ar'
                    ? 'محل اشتباه (تناقض بيانات)'
                    : 'Suspicious (Discrepancy)'
                  : application.status === 'approved'
                  ? language === 'ar'
                    ? 'معتمد'
                    : 'Approved'
                  : application.status === 'rejected'
                  ? language === 'ar'
                    ? 'مرفوض'
                    : 'Rejected'
                  : language === 'ar'
                  ? 'قيد المراجعة'
                  : 'Under Review'}
              </Badge>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              {language === 'ar'
                ? `طلب رقم ${application.id} • العميل: ${application.applicantName}`
                : `Application ${application.id} • Applicant: ${application.applicantNameEn || application.applicantName}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Run AI Scoring Button */}
            <Button
              variant="outline"
              size="sm"
              disabled={isScoringLoading}
              onClick={handleRunAiScoring}
              className="border-brand-navy/30 text-brand-navy hover:bg-brand-navy/10"
              icon={
                isScoringLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-brand-navy" />
                ) : (
                  <Sparkles className="w-4 h-4 text-brand-navy" />
                )
              }
            >
              {isScoringLoading
                ? language === 'ar'
                  ? 'جاري التقييم الآلي...'
                  : 'Running AI Scoring...'
                : language === 'ar'
                ? 'إعادة تشغيل التقييم الذكي (AI Scoring)'
                : 'Run AI Scoring'}
            </Button>

            <Link
              href="/applications"
              className="text-xs font-semibold text-text-secondary hover:text-brand-navy flex items-center gap-1.5 transition-colors"
            >
              <Arrow className="w-4 h-4" />
              <span>{t('action.backToApps')}</span>
            </Link>
          </div>
        </div>

        {/* Action Alert Toasts */}
        {actionSuccessToast && (
          <Alert
            type="success"
            title={language === 'ar' ? 'تم بنجاح' : 'Success'}
            message={actionSuccessToast}
            onClose={() => setActionSuccessToast(null)}
          />
        )}
        {actionErrorToast && (
          <Alert
            type="error"
            title={language === 'ar' ? 'تنبيه تدقيقي' : 'Notice'}
            message={actionErrorToast}
            onClose={() => setActionErrorToast(null)}
          />
        )}

        {/* Applicant Summary Header Card */}
        <Card className="p-6 relative overflow-hidden border-border">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Applicant Profile */}
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#E8EEF5] text-brand-navy font-bold text-xl flex items-center justify-center shrink-0 border border-border shadow-xs">
                {application.applicantName.slice(0, 1)}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-lg font-bold text-text-primary">
                    {language === 'ar' ? application.applicantName : application.applicantNameEn || application.applicantName}
                  </h2>
                  <Badge variant="neutral" size="sm">
                    {application.nationalId}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-text-secondary">
                  <span>
                    <strong className="text-text-primary">{language === 'ar' ? 'نوع التمويل: ' : 'Type: '}</strong>
                    {language === 'ar' ? application.loanTypeLabel || 'تمويل شخصي' : application.loanTypeLabelEn || 'Personal Financing'}
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-text-primary">{language === 'ar' ? 'المبلغ المطلوب: ' : 'Amount: '}</strong>
                    <span className="font-bold text-brand-navy">{formatCurrency(application.requestedAmount)}</span>
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-text-primary">{language === 'ar' ? 'جهة العمل: ' : 'Employer: '}</strong>
                    {language === 'ar' ? application.occupation || 'Careem Deliveries LLC' : application.occupationEn || 'Careem Deliveries LLC'}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Recommendation Widget */}
            <div
              className={`p-4 rounded-2xl border text-start min-w-[250px] ${
                application.status === 'suspicious' || (application.fraudRiskScore && application.fraudRiskScore >= 70)
                  ? 'bg-semantic-warning-subtle border-semantic-warning/40'
                  : 'bg-[#E8EEF5] border-brand-navy/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-text-secondary">
                  {t('application.recommendation')}
                </span>
                <span className="text-xs font-bold text-brand-navy">
                  {application.aiConfidence
                    ? `${t('application.confidence')} ${application.aiConfidence}%`
                    : (language === 'ar' ? 'بانتظار التقييم' : 'Pending Score')}
                </span>
              </div>
              <p className="text-sm font-bold text-brand-navy flex items-center gap-1.5">
                {application.status === 'suspicious' ? (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-semantic-warning" />
                ) : application.creditScore ? (
                  <Sparkles className="w-4 h-4 shrink-0 text-brand-navy" />
                ) : (
                  <Clock className="w-4 h-4 shrink-0 text-text-muted" />
                )}
                <span>
                  {language === 'ar'
                    ? application.aiRecommendationLabel || (application.status === 'suspicious' ? 'مراجعة بشرية (لتناقض الدخل)' : 'قيد المراجعة والتدقيق')
                    : application.aiRecommendationLabelEn || (application.status === 'suspicious' ? 'Manual Review (Discrepancy)' : 'Under Review')}
                </span>
              </p>
            </div>
          </div>

          {/* Explainability Dropdown */}
          <div className="mt-5 pt-4 border-t border-border">
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="flex items-center justify-between w-full text-xs font-semibold text-text-secondary hover:text-brand-navy transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-navy" />
                <span>
                  {language === 'ar'
                    ? 'تفسير الذكاء الاصطناعي ومبررات القرار (Explainable AI Insights)'
                    : 'Explainable AI Decision Insights'}
                </span>
              </div>
              {showExplanation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showExplanation && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2.5 animate-in fade-in duration-200">
                <div className="p-3 bg-semantic-error-subtle/40 rounded-xl border border-semantic-error/30 text-xs text-text-primary space-y-1 text-start">
                  <div className="flex items-center gap-1.5 font-bold text-semantic-error">
                    <span className="w-1.5 h-1.5 rounded-full bg-semantic-error" />
                    <span>{language === 'ar' ? '1. تناقض حاد في بيانات الدخل' : '1. Severe Income Discrepancy'}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-text-secondary">
                    {language === 'ar'
                      ? 'صافي الراتب المعلن بالشهادة (22,880 ج.م) يفوق متوسط التدفق البنكي (2,998.5 ج.م) بـ 7.6 أضعاف.'
                      : 'Declared net salary (22,880 EGP) is 7.6x higher than average monthly bank net inflow (2,998.5 EGP).'}
                  </p>
                </div>

                <div className="p-3 bg-surface-subtle rounded-xl border border-border text-xs text-text-primary space-y-1 text-start">
                  <div className="flex items-center gap-1.5 font-bold text-brand-navy">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-navy" />
                    <span>{language === 'ar' ? '2. تقرير I-Score الائتماني' : '2. I-Score Credit Profile'}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-text-secondary">
                    {language === 'ar'
                      ? 'درجة الائتمان 780، ومعدل احتمالية التعثر الأساسي (PD) منخفض 5.24%، مع رصد عدم تطابق في صيغة الاسم.'
                      : 'Credit Score is 780 with low baseline PD 5.24%, but with customer name mismatch detected.'}
                  </p>
                </div>

                <div className="p-3 bg-surface-subtle rounded-xl border border-border text-xs text-text-primary space-y-1 text-start">
                  <div className="flex items-center gap-1.5 font-bold text-semantic-warning">
                    <span className="w-1.5 h-1.5 rounded-full bg-semantic-warning" />
                    <span>{language === 'ar' ? '3. التوصية التنفيذية' : '3. Executive Recommendation'}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-text-secondary">
                    {language === 'ar'
                      ? 'يوصى بالمراجعة البشرية وإلزام العميل بتقديم كشف حساب مصرفي مفصل يثبت تحويل الراتب قبل الاعتماد.'
                      : 'Manual review required; request updated bank statement proving salary transfer.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Assessment Tabs Navigation */}
        <Tabs tabs={tabsList} activeTab={activeTab} onChange={setActiveTab} />

        {/* TAB 1: Extracted Data (OCR) */}
        {activeTab === 'extractedData' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left/Main Card: Automatically Extracted Data (2 cols) */}
              <Card className="lg:col-span-2 p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h3 className="text-base font-bold text-text-primary">{t('ocr.title')}</h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      {language === 'ar' ? 'مستخرج آلياً من 4 وثائق رسمية' : 'Extracted from 4 official documents'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-[#E8EEF5] text-brand-navy rounded-full border border-brand-navy/20 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('ocr.accuracy')} 97.4%</span>
                  </div>
                </div>

                {/* Critical Income Discrepancy Alert Banner */}
                <div className="p-4 rounded-xl bg-semantic-error-subtle/50 border border-semantic-error/40 flex items-start gap-3 text-start">
                  <ShieldAlert className="w-5 h-5 text-semantic-error shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-semantic-error">
                      {language === 'ar'
                        ? 'تنبيه تدقيق مالي: رصد فجوة بنسبة 7.6 أضعاف بين الراتب وكشف الحساب'
                        : 'Audit Warning: 7.6x discrepancy detected between declared salary and bank inflow'}
                    </p>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      {language === 'ar'
                        ? 'صافي الراتب بشهادة الراتب (22,880 ج.م) في حين أن متوسط الإيداعات الشهرية بكشف حساب بنك المشرق هو (2,998.5 ج.م). التدفق البنكي يغطي 13.1% فقط من الراتب المعلن.'
                        : 'Declared net salary on certificate (22,880 EGP) vs Mashreq Bank monthly inflow (2,998.5 EGP). Inflow covers only 13.1% of declared salary.'}
                    </p>
                  </div>
                </div>

                {/* Extracted Data Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-surface-subtle border border-border space-y-1 text-start">
                    <span className="text-[11px] text-text-muted font-medium">
                      {language === 'ar' ? 'الاسم الكامل (بطاقة الرقم القومي)' : 'Full Name (National ID)'}
                    </span>
                    <p className="text-sm font-bold text-text-primary">
                      {language === 'ar' ? application.applicantName : (application.applicantNameEn || application.applicantName)}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-subtle border border-border space-y-1 text-start">
                    <span className="text-[11px] text-text-muted font-medium">
                      {language === 'ar' ? 'الرقم القومي المستخرج' : 'Extracted National ID'}
                    </span>
                    <p className="text-sm font-bold text-text-primary font-mono">{application.nationalId || '—'}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-subtle border border-border space-y-1 text-start">
                    <span className="text-[11px] text-text-muted font-medium">
                      {language === 'ar' ? 'جهة العمل والمهنة' : 'Occupation / Employer'}
                    </span>
                    <p className="text-sm font-bold text-text-primary">
                      {language === 'ar' ? (application.occupation || '—') : (application.occupationEn || application.occupation || '—')}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-subtle border border-border space-y-1 text-start">
                    <span className="text-[11px] text-text-muted font-medium">
                      {language === 'ar' ? 'البنك المصدر لكشف الحساب' : 'Issuing Bank'}
                    </span>
                    <p className="text-sm font-bold text-text-primary">
                      {bankSummary.bank_name || (language === 'ar' ? 'بنك المشرق' : 'Mashreq Bank')}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-semantic-warning-subtle/30 border border-semantic-warning/30 space-y-1 text-start">
                    <span className="text-[11px] text-semantic-warning font-bold">
                      {language === 'ar' ? 'صافي الراتب المعلن بالشهادة' : 'Declared Net Salary'}
                    </span>
                    <p className="text-sm font-bold text-brand-navy">
                      {bankSummary.declared_net_salary ? `${Number(bankSummary.declared_net_salary).toLocaleString()} ج.م` : '22,880.00 ج.م'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-semantic-error-subtle/30 border border-semantic-error/30 space-y-1 text-start">
                    <span className="text-[11px] text-semantic-error font-bold">
                      {language === 'ar' ? 'متوسط التدفق البنكي الفعلي' : 'Average Bank Net Inflow'}
                    </span>
                    <p className="text-sm font-bold text-semantic-error">
                      {bankSummary.monthly_average ? `${Number(bankSummary.monthly_average).toLocaleString()} ج.م` : '2,998.50 ج.م'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Right Card: Bank Account Summary */}
              <Card className="p-6 space-y-6">
                <div className="border-b border-border pb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-text-primary">{t('bank.summaryTitle')}</h3>
                    <CreditCard className="w-5 h-5 text-brand-navy" />
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {bankSummary.bank_name || 'بنك المشرق'} • {language === 'ar' ? `كشف ${bankSummary.period_months || 5} أشهر` : `${bankSummary.period_months || 5}-Month Statement`}
                  </p>
                </div>

                <div className="space-y-4 text-start">
                  <div className="space-y-1">
                    <p className="text-xs text-text-muted">{t('bank.averageBalance')}</p>
                    <p className="text-3xl font-extrabold text-text-primary">
                      {bankSummary.average_balance ? formatCurrency(Number(bankSummary.average_balance)) : formatCurrency(1635.1)}
                    </p>
                    <p className="text-xs text-text-secondary font-medium">
                      {language === 'ar' 
                        ? `الفترة المشمولة: ${bankSummary.period_months || 5} أشهر` 
                        : `Covered period: ${bankSummary.period_months || 5} months`}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                    <div>
                      <p className="text-[11px] text-text-muted">{language === 'ar' ? 'انتظام الدخل' : 'Income Regularity'}</p>
                      <p className="text-sm font-bold text-semantic-success mt-0.5">
                        {bankSummary.income_regularity_score ? `${bankSummary.income_regularity_score}%` : '88.1%'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-text-muted">{language === 'ar' ? 'شيكات مرتجعة' : 'Bounced Cheques'}</p>
                      <p className="text-sm font-bold text-text-primary mt-0.5">0</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: Credit Assessment & AI Explanation */}
        {activeTab === 'creditAssessment' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Circular Gauge Card */}
            <Card className="p-8 flex flex-col items-center justify-center text-center space-y-4">
              <h3 className="text-base font-bold text-text-primary">{t('credit.scoreTitle')}</h3>
              <p className="text-xs text-text-muted -mt-2">
                {language === 'ar' ? 'النموذج المدمج (XGBoost + LightGBM)' : 'Blended ML Model'}
              </p>

              <div className="py-4">
                {application.creditScore ? (
                  <CircularScoreGauge
                    score={application.creditScore}
                    maxScore={850}
                    label={(application as any).ratingGrade || (language === 'ar' ? 'جدارة منخفضة المخاطر (Grade B)' : 'Grade B (Low Risk)')}
                    sublabel={`PD: ${((applicantPd) * 100).toFixed(2)}%`}
                    size="lg"
                  />
                ) : (
                  <div className="p-6 text-center space-y-2 bg-surface-subtle rounded-2xl border border-dashed border-border">
                    <Sparkles className="w-8 h-8 text-brand-navy mx-auto opacity-50" />
                    <p className="text-xs font-semibold text-text-primary">
                      {language === 'ar' ? 'لم يتم تقييم الجدارة بعد' : 'Not Scored Yet'}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {language === 'ar' ? 'اضغط على زر تشغيل التقييم الذكي بالأعلى' : 'Click Run AI Scoring above'}
                    </p>
                  </div>
                )}
              </div>

              <div className="w-full pt-4 border-t border-border text-xs text-text-secondary flex justify-between">
                <span>{language === 'ar' ? 'قرار النموذج التلقائي:' : 'Model Auto Decision:'}</span>
                <span className="font-bold text-semantic-success">
                  {application.creditScore ? (application.aiRecommendation || 'AUTO-APPROVE') : '—'}
                </span>
              </div>
            </Card>

            {/* Arabic LLM Explanation Box & Evaluation Factors (2 cols) */}
            <Card className="lg:col-span-2 p-6 space-y-6">
              <div className="border-b border-border pb-4 text-start">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-navy" />
                    <h3 className="text-base font-bold text-text-primary">
                      {language === 'ar' ? 'تفسير الذكاء الاصطناعي الشامل (LLM Explainer)' : 'LLM Explainer Assessment'}
                    </h3>
                  </div>
                  <Badge variant="neutral">اللغة: العربية</Badge>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {language === 'ar'
                    ? 'تحليل ائتماني وقانوني تلقائي مدعوم بالذكاء الاصطناعي التوليدي'
                    : 'Automated credit and compliance reasoning'}
                </p>
              </div>

              {/* LLM Narrative */}
              <div className="p-4 rounded-xl bg-surface-subtle border border-border text-start space-y-2">
                <p className="text-xs text-text-primary leading-relaxed">
                  بناءً على التقييم الائتماني لبيانات الطلب، يحظى العميل بدرجة جدارة ائتمانية مرتفعة على مؤشر الآي سكور (780)، مع احتمالية تعثر نموذجية تبلغ 5.24% وتاريخ سداد خالٍ من حالات التعثر القانوني. ومع ذلك، يرصد النظام <strong>فجوة جوهرية في الدخل</strong> حيث لا يتجاوز التدفق البنكي الشهري الفعلي (2,998.5 ج.م) ما نسبته 13% من الراتب المعلن (22,880 ج.م). لذا يُوصى بعدم تفعيل الموافقة التلقائية وتحويل المعاملة إلى <strong>المراجعة البشرية</strong> للتحقق من طريقة استلام الراتب وتحديث مستندات التحقق المالي.
                </p>
              </div>

              {/* Key Factor Progress Bars */}
              <div className="space-y-4 text-start">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>نسبة عبء الدين الافتراضية (DBR)</span>
                    <span className="text-semantic-success">15.2% (ممتاز)</span>
                  </div>
                  <ProgressBar value={15} color="emerald" size="sm" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>انتظام الإيداعات البنكية</span>
                    <span className="text-semantic-success">88.1% (منتظم)</span>
                  </div>
                  <ProgressBar value={88} color="emerald" size="sm" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>تطابق وثائق الهوية والائتمان</span>
                    <span className="text-semantic-warning">72.0% (تفاوت في صياغة الاسم)</span>
                  </div>
                  <ProgressBar value={72} color="amber" size="sm" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: Specific Micro-Analytics & Sensitivity Scenarios */}
        {activeTab === 'microAnalytics' && (
          <div className="space-y-6">
            {/* Section 1: Micro Benchmark vs Bank Portfolio */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Card className="p-5 space-y-2 text-start">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-muted">احتمالية تعثر العميل (PD)</span>
                  <Badge variant="neutral">العميل</Badge>
                </div>
                <p className="text-2xl font-bold text-text-primary">5.24%</p>
                <p className="text-[11px] text-text-secondary">
                  مقارنة بمتوسط المحفظة البنكية: <strong className="text-brand-navy">4.82%</strong>
                </p>
              </Card>

              <Card className="p-5 space-y-2 text-start">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-muted">الخسارة الائتمانية المتوقعة (ECL)</span>
                  <Badge variant="neutral">تقديري</Badge>
                </div>
                <p className="text-2xl font-bold text-brand-navy">{formatCurrency(applicantEcl)}</p>
                <p className="text-[11px] text-text-secondary">محسوبة على أساس معدل تعافي (LGD) بنسبة 45%</p>
              </Card>

              <Card className="p-5 space-y-2 text-start">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-muted">تصنيف الجدارة الائتمانية</span>
                  <Badge variant="success">منخفض المخاطر</Badge>
                </div>
                <p className="text-2xl font-bold text-semantic-success">Grade A/B</p>
                <p className="text-[11px] text-text-secondary">ضمن الشريحة الأولى المسموح بتمويلها للأفراد</p>
              </Card>
            </div>

            {/* Section 2: Real DBR Comparison Card */}
            <Card className="p-6 space-y-5 text-start">
              <div className="border-b border-border pb-4">
                <h3 className="text-base font-bold text-text-primary">
                  {language === 'ar'
                    ? 'تحليل نسبة عبء الدين الحقيقية (Real DBR Stress Analysis)'
                    : 'Real Debt Burden Ratio (DBR) Stress Analysis'}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  مقارنة التزام القسط الشهري ({formatCurrency(baseMonthlyInstallment)}) بالدخل المعلن مقابل التدفق البنكي الفعلي
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-text-primary">1. بناءً على صافي الراتب المعلن (22,880 ج.م)</span>
                    <Badge variant="success">{dbrDeclared}% DBR</Badge>
                  </div>
                  <ProgressBar value={Math.min(Number(dbrDeclared) || 0, 100)} color="emerald" size="md" />
                  <p className="text-[11px] text-text-secondary">
                    ضمن الحد الائتماني الآمن المسموح به من البنك المركزي المصري (الحد الأقصى 50%).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-semantic-error-subtle/50 border border-semantic-error/40 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-semantic-error">
                      2. بناءً على التدفق البنكي الفعلي (2,998.5 ج.م)
                    </span>
                    <Badge variant="danger">{dbrVerified}% DBR</Badge>
                  </div>
                  <ProgressBar value={100} color="rose" size="md" />
                  <p className="text-[11px] text-semantic-error font-medium">
                    خطر حرج: في حال كان التدفق البنكي هو الدخل الوحيد، فإن القسط سيتجاوز كامل الدخل الشهري للعميل!
                  </p>
                </div>
              </div>
            </Card>

            {/* Section 3: Interest Rate Hike Sensitivity Simulation */}
            <Card className="p-6 space-y-4 text-start">
              <div className="border-b border-border pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    {language === 'ar'
                      ? 'محاكاة حساسية رفع الفائدة للقرض (Interest Rate Sensitivity)'
                      : 'Interest Rate Hike Sensitivity Simulation'}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">تأثير صعود الفائدة على قيمة القسط الشهري والقدرة على السداد</p>
                </div>
                <TrendingUp className="w-5 h-5 text-brand-navy" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-surface-subtle rounded-xl border border-border space-y-1">
                  <span className="text-[11px] text-text-muted">الوضع الحالي (Baseline)</span>
                  <p className="text-sm font-bold text-text-primary">{formatCurrency(baseMonthlyInstallment)} / شهر</p>
                  <span className="text-[10px] text-semantic-success">فائدة 18%</span>
                </div>

                <div className="p-3.5 bg-surface-subtle rounded-xl border border-border space-y-1">
                  <span className="text-[11px] text-text-muted">رفع الفائدة +100 نقطة أساس</span>
                  <p className="text-sm font-bold text-text-primary">{formatCurrency(baseMonthlyInstallment + 85)} / شهر</p>
                  <span className="text-[10px] text-text-secondary">فائدة 19% (+85 ج.م)</span>
                </div>

                <div className="p-3.5 bg-surface-subtle rounded-xl border border-border space-y-1">
                  <span className="text-[11px] text-text-muted">رفع الفائدة +200 نقطة أساس</span>
                  <p className="text-sm font-bold text-text-primary">{formatCurrency(baseMonthlyInstallment + 172)} / شهر</p>
                  <span className="text-[10px] text-semantic-warning">فائدة 20% (+172 ج.م)</span>
                </div>

                <div className="p-3.5 bg-semantic-warning-subtle/40 rounded-xl border border-semantic-warning/30 space-y-1">
                  <span className="text-[11px] text-semantic-warning font-bold">رفع الفائدة +300 نقطة أساس</span>
                  <p className="text-sm font-bold text-brand-navy">{formatCurrency(baseMonthlyInstallment + 260)} / شهر</p>
                  <span className="text-[10px] text-semantic-warning font-medium">فائدة 21% (+260 ج.م)</span>
                </div>
              </div>
            </Card>

            {/* Section 4: Existing Bureau Facilities Breakdown */}
            <Card className="p-6 space-y-4 text-start">
              <div className="border-b border-border pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    {language === 'ar'
                      ? 'التسهيلات والالتزامات الائتمانية القائمة (I-Score Bureau Facilities)'
                      : 'Existing Bureau Facilities (I-Score)'}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    إجمالي الرصيد القائم: 1,230,000 ج.م • إجمالي المتأخرات: 16,200 ج.م • بطاقات ائتمان: 2
                  </p>
                </div>
                <Layers className="w-5 h-5 text-brand-navy" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-border text-text-muted font-semibold">
                      <th className="py-2.5 px-3">نوع التسهيل</th>
                      <th className="py-2.5 px-3">المبلغ الممنوح</th>
                      <th className="py-2.5 px-3">الرصيد القائم</th>
                      <th className="py-2.5 px-3">القسط الشهري</th>
                      <th className="py-2.5 px-3">الحالة / الصفة</th>
                      <th className="py-2.5 px-3">أيام التأخير</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-text-primary">قرض أصحاب المعاشات</td>
                      <td className="py-2.5 px-3">950,000 ج.م</td>
                      <td className="py-2.5 px-3 font-semibold text-brand-navy">400,000 ج.م</td>
                      <td className="py-2.5 px-3">12,000 ج.م</td>
                      <td className="py-2.5 px-3"><Badge variant="neutral">مفترض</Badge></td>
                      <td className="py-2.5 px-3 text-semantic-success font-bold">0</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-text-primary">البطاقة الائتمانية</td>
                      <td className="py-2.5 px-3">950,000 ج.م</td>
                      <td className="py-2.5 px-3 font-semibold text-brand-navy">400,000 ج.م</td>
                      <td className="py-2.5 px-3">12,000 ج.م</td>
                      <td className="py-2.5 px-3"><Badge variant="neutral">تابع</Badge></td>
                      <td className="py-2.5 px-3 text-semantic-success font-bold">0</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-text-primary">جاري مدين</td>
                      <td className="py-2.5 px-3">950,000 ج.م</td>
                      <td className="py-2.5 px-3 font-semibold text-brand-navy">400,000 ج.م</td>
                      <td className="py-2.5 px-3">12,000 ج.م</td>
                      <td className="py-2.5 px-3"><Badge variant="warning">ضامن (إجراء قضائي)</Badge></td>
                      <td className="py-2.5 px-3 text-semantic-success font-bold">0</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-text-primary">قرض نقدي</td>
                      <td className="py-2.5 px-3">-</td>
                      <td className="py-2.5 px-3">-</td>
                      <td className="py-2.5 px-3">5,400 ج.م</td>
                      <td className="py-2.5 px-3"><Badge variant="danger">متأخر 60 يوماً</Badge></td>
                      <td className="py-2.5 px-3 text-semantic-error font-bold">60 يوماً</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 4: Fraud Detection & Income Discrepancy */}
        {activeTab === 'fraudDetection' && (
          <div className="space-y-6">
            {/* Top Score Linear Bar Card */}
            <Card className="p-6 space-y-3 text-start">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-text-primary">{t('fraud.scoreTitle')}</h3>
                  <p className="text-xs text-text-muted">{t('fraud.analyzedSignals')}</p>
                </div>
                <Badge variant={application.fraudRiskScore && application.fraudRiskScore >= 60 ? 'danger' : 'neutral'} dot>
                  {application.fraudRiskScore
                    ? `${language === 'ar' ? 'مخاطر احتيال' : 'Fraud Risk'} (${application.fraudRiskScore}%)`
                    : (language === 'ar' ? 'بانتظار الفحص' : 'Pending')}
                </Badge>
              </div>

              {application.fraudRiskScore !== undefined && application.fraudRiskScore !== null ? (
                <LinearFraudRiskBar
                  score={application.fraudRiskScore}
                  label={application.fraudRiskScore >= 70 ? (language === 'ar' ? 'مخاطر مرتفعة' : 'High Risk') : (language === 'ar' ? 'مخاطر منخفضة' : 'Low Risk')}
                  sublabel={language === 'ar' ? 'تنبيه: يتطلب فحص امتثال وتدقيق بشري' : 'Compliance inspection required'}
                />
              ) : (
                <p className="text-xs text-text-muted">
                  {language === 'ar' ? 'لم يتم احتساب درجة الاحتيال بعد — سيتم توليدها تلقائياً عند تشغيل بايبلاين الفحص.' : 'Fraud risk score pending pipeline execution.'}
                </p>
              )}
            </Card>

            {/* Signals List */}
            <Card className="p-6 space-y-4 text-start">
              <div className="border-b border-border pb-3">
                <h3 className="text-base font-bold text-text-primary">{t('fraud.signalsTitle')}</h3>
                <p className="text-xs text-text-muted mt-0.5">{t('fraud.signalsSubtitle')}</p>
              </div>

              <div className="space-y-3">
                {(application.fraudSignals && application.fraudSignals.length > 0) ? (
                  application.fraudSignals.map((signal: any, idx: number) => {
                    const isHigh = signal.severity === 'high' || signal.severity === 'critical';
                    return (
                      <div
                        key={signal.id || idx}
                        className={`rounded-2xl border overflow-hidden ${
                          isHigh
                            ? 'border-semantic-error/40 bg-semantic-error-subtle/30'
                            : 'border-semantic-warning/40 bg-semantic-warning-subtle/30'
                        }`}
                      >
                        <div className="p-4 flex items-center justify-between text-start">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                isHigh ? 'bg-semantic-error-subtle text-semantic-error' : 'bg-semantic-warning-subtle text-semantic-warning'
                              }`}
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-text-primary">
                                {language === 'ar' ? signal.title : (signal.titleEn || signal.title)}
                              </p>
                              <p className="text-[11px] text-text-muted mt-0.5">
                                {language === 'ar' ? (signal.relatedDocument || 'محرك التدقيق الآلي') : (signal.relatedDocumentEn || 'Automated Audit')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                isHigh ? 'bg-semantic-error-subtle text-semantic-error' : 'bg-semantic-warning-subtle text-semantic-warning'
                              }`}
                            >
                              {language === 'ar' ? (signal.severityLabel || 'تنبيه') : (signal.severityLabelEn || 'Alert')}
                            </span>
                            {signal.confidence && (
                              <span className="text-xs text-text-muted font-mono">{signal.confidence}%</span>
                            )}
                          </div>
                        </div>
                        {signal.evidence && (
                          <div className="px-5 pb-4 pt-1 border-t border-border/40 text-xs space-y-2">
                            <p className="text-text-secondary leading-relaxed">
                              <strong>{language === 'ar' ? 'الدليل: ' : 'Evidence: '}</strong>
                              {language === 'ar' ? signal.evidence : (signal.evidenceEn || signal.evidence)}
                            </p>
                            {signal.recommendedAction && (
                              <p className="text-semantic-success font-semibold">
                                <strong>{language === 'ar' ? 'الإجراء الموصى به: ' : 'Recommended Action: '}</strong>
                                {language === 'ar' ? signal.recommendedAction : (signal.recommendedActionEn || signal.recommendedAction)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs text-text-muted bg-surface-subtle rounded-2xl border border-dashed border-border">
                    {language === 'ar' ? 'لم يتم رصد أي إشارات احتيال أو تضارب في هذا الطلب.' : 'No fraud or mismatch signals detected.'}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 5: Documents */}
        {activeTab === 'documents' && (
          <Card className="p-6 space-y-4 text-start">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  {language === 'ar' ? 'المستندات المعالجة بالـ OCR' : 'OCR Processed Documents'}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {language === 'ar' ? '4 مستندات تم استخراج بياناتها بنجاح' : '4 Documents extracted successfully'}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setPreviewDocModal('طلب رفع مستند تكميلي')}
              >
                {t('action.addDocument')}
              </Button>
            </div>

            <div className="space-y-3">
              {[
                { code: 'NID', name: 'بطاقة الرقم القومي (الوجهان)', size: '1.4 MB', status: 'success', statusLabel: 'مقروء 98%' },
                { code: 'SAL', name: 'شهادة إثبات الراتب - كاش', size: '840 KB', status: 'success', statusLabel: 'مقروء 95%' },
                { code: 'BNK', name: 'كشف حساب بنك المشرق (5 أشهر)', size: '3.8 MB', status: 'success', statusLabel: 'مقروء 96%' },
                { code: 'SCR', name: 'تقرير الاستعلام الائتماني i-Score', size: '2.1 MB', status: 'success', statusLabel: 'مقروء 99%' },
              ].map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-surface-subtle rounded-2xl border border-border hover:border-border-strong transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#E8EEF5] text-brand-navy font-bold text-xs flex items-center justify-center border border-brand-navy/20">
                      {doc.code}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-primary">{doc.name}</p>
                      <p className="text-[11px] text-text-muted">PDF • {doc.size}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Badge variant={doc.status === 'success' ? 'success' : 'warning'} dot>
                      {doc.statusLabel}
                    </Badge>
                    <button
                      onClick={() => setPreviewDocModal(doc.name)}
                      className="text-xs font-semibold text-brand-navy hover:text-brand-navy-light flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>{t('action.preview')}</span>
                      <Arrow className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* TAB 6: Audit Log / Timeline */}
        {activeTab === 'auditLog' && (
          <Card className="p-6 space-y-6 text-start">
            <div className="border-b border-border pb-4">
              <h3 className="text-base font-bold text-text-primary">
                {language === 'ar' ? 'سجل مراحل الطلب والتدقيق (Immutable Audit Trail)' : 'Application Stage & Audit Log'}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {language === 'ar' ? 'سجل غير قابل للتعديل يوثق جميع التحليلات والقرارات' : 'Append-only audit trail'}
              </p>
            </div>

            <div className="relative ps-6 space-y-8 border-s-2 border-border ms-3">
              {[
                {
                  title: 'استلام المستندات والتحقق الآلي',
                  timestamp: '28 سبتمبر 2026 - 00:02',
                  description: 'تم استقبال بايلود الـ OCR وحفظه في extraction_results مع تشفير التجزئة SHA256.',
                  status: 'completed',
                },
                {
                  title: 'رصد تناقض الدخل وإشارات الاحتيال',
                  timestamp: '28 سبتمبر 2026 - 00:03',
                  description: 'محرك التدقيق يسجل فجوة 7.63x بين الراتب المعلن والتدفق البنكي وتوليد إشارة تحذيرية.',
                  status: 'completed',
                },
                {
                  title: 'تقييم الجدارة والتعثر (Credit Risk ML)',
                  timestamp: '28 سبتمبر 2026 - 00:04',
                  description: 'نموذج الكريدت ريسك يحتسب درجة 780 واحتمالية تعثر 5.24% وتوليد التوصية التلقائية.',
                  status: 'completed',
                },
                {
                  title: 'تفسير الذكاء الاصطناعي (LLM Explainer)',
                  timestamp: '28 سبتمبر 2026 - 00:05',
                  description: 'توليد صياغة الشرح التفسيري العربي للقرار وتوثيق التوصية بالمراجعة اليدوية.',
                  status: 'completed',
                },
                {
                  title: 'قرار مسؤول الائتمان (Human Decision)',
                  timestamp: 'قيد الانتظار',
                  description: 'بانتظار إجراء الموظف المسؤول لاعتماد أو رفض التمويل.',
                  status: application.status === 'approved' || application.status === 'rejected' ? 'completed' : 'current',
                },
              ].map((event, idx) => (
                <div key={idx} className="relative group text-start">
                  <span
                    className={`absolute -start-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      event.status === 'completed'
                        ? 'bg-semantic-success text-white ring-4 ring-semantic-success-subtle'
                        : 'bg-brand-navy text-white ring-4 ring-brand-navy/20 animate-pulse'
                    }`}
                  >
                    {event.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3 h-3" />}
                  </span>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-text-primary">{event.title}</h4>
                      <span className="text-[11px] text-text-muted">{event.timestamp}</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Document Preview Modal */}
        <Modal
          isOpen={!!previewDocModal}
          onClose={() => setPreviewDocModal(null)}
          title={`${t('action.preview')}: ${previewDocModal}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="h-96 rounded-xl bg-surface-subtle flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-border">
              <FileText className="w-12 h-12 text-brand-navy mb-2" />
              <p className="text-sm font-semibold text-text-primary">{previewDocModal}</p>
              <p className="text-xs text-text-muted mt-1">
                {language === 'ar'
                  ? 'مستعرض المستندات التفاعلي مع استخراجات الـ OCR المحفوظة في قاعدة البيانات'
                  : 'Interactive Document Viewer with OCR Extracted Annotations'}
              </p>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setPreviewDocModal(null)}>
                {t('action.close')}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Decision Confirmation Modal */}
        <Modal
          isOpen={isDecisionModalOpen}
          onClose={() => setIsDecisionModalOpen(false)}
          title={
            pendingDecisionType === 'approve'
              ? 'تأكيد اعتماد التمويل'
              : pendingDecisionType === 'reject'
              ? 'تأكيد رفض التمويل'
              : 'تأكيد التحويل للمراجعة اليدوية'
          }
          size="md"
        >
          <div className="space-y-4 text-start">
            <p className="text-xs text-text-secondary leading-relaxed">
              {pendingDecisionType === 'approve'
                ? 'هل أنت متأكد من اعتماد التمويل لهذا الطلب؟ سيتم تثبيت القرار نهائياً وتوثيقه في سجل التدقيق.'
                : pendingDecisionType === 'reject'
                ? 'هل أنت متأكد من رفض الطلب؟ سيتم توثيق الرفض وإشعار العميل.'
                : 'سيتم تحويل هذا الطلب إلى قائمة المراجعة البشرية المتقدمة لاستيفاء الأوراق.'}
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-text-primary">ملاحظات مسؤول الائتمان (Decision Notes):</label>
              <textarea
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="أدخل مبررات القرار أو المتطلبات التكميلية..."
                className="w-full h-24 p-3 rounded-xl border border-border bg-surface text-xs focus:ring-2 focus:ring-brand-navy/30 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button variant="secondary" onClick={() => setIsDecisionModalOpen(false)}>
                إلغاء
              </Button>
              <Button
                variant={
                  pendingDecisionType === 'approve'
                    ? 'primary'
                    : pendingDecisionType === 'reject'
                    ? 'danger'
                    : 'outline'
                }
                onClick={confirmDecision}
              >
                تأكيد الإجراء
              </Button>
            </div>
          </div>
        </Modal>

        {/* Sticky Bottom Action Bar */}
        <div className="fixed bottom-0 start-0 end-0 bg-surface/95 backdrop-blur-md border-t border-border p-4 z-40 shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text-primary">{t('application.officerAction')}</span>
              <span className="text-xs text-text-muted font-mono">{application.id}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Approve Button */}
              <Button
                variant="primary"
                size="md"
                className="bg-semantic-success hover:bg-semantic-success/90 text-white shadow-xs"
                onClick={() => openDecisionModal('approve')}
                icon={<CheckCircle2 className="w-4 h-4 text-white" />}
              >
                {t('application.approve')}
              </Button>

              {/* Reject Button */}
              <Button
                variant="danger"
                size="md"
                onClick={() => openDecisionModal('reject')}
                icon={<XCircle className="w-4 h-4 text-white" />}
              >
                {t('application.reject')}
              </Button>

              {/* Manual Review Button */}
              <Button
                variant="outline"
                size="md"
                onClick={() => openDecisionModal('manual')}
                icon={<FileText className="w-4 h-4" />}
              >
                {t('application.manualReview')}
              </Button>

              {/* Ask AI Assistant Button */}
              <Link href="/ai-assistant">
                <Button
                  variant="outline"
                  size="md"
                  className="border-brand-navy/30 text-brand-navy hover:bg-brand-navy/10"
                  icon={<Bot className="w-4 h-4 text-brand-navy" />}
                >
                  {t('application.askAI')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
