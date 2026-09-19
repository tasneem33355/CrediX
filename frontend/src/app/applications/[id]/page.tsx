'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
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

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, language, formatCurrency, formatNumber, direction } = useLanguage();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const appId = (params?.id as string) || 'APP-2026-0839';
  const application = mockApplications.find((a) => a.id === appId) || mockApplications[0];

  const [activeTab, setActiveTab] = useState('extractedData');
  const [previewDocModal, setPreviewDocModal] = useState<string | null>(null);
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>('fr_1');
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(true);

  const tabsList = [
    { id: 'extractedData', label: t('tab.extractedData') },
    { id: 'creditAssessment', label: t('tab.creditAssessment') },
    { id: 'fraudDetection', label: t('tab.fraudDetection'), badge: application.fraudSignals.length > 0 ? application.fraudSignals.length : undefined },
    { id: 'documents', label: t('tab.documents'), badge: application.documents.length },
    { id: 'auditLog', label: t('tab.auditLog') },
  ];

  const handleDecision = (type: 'approve' | 'reject' | 'manual') => {
    if (type === 'approve') {
      setActionSuccessToast(language === 'ar' ? 'تم اعتماد التمويل وإصدار الموافقة الائتمانية بنجاح.' : 'Financing application approved successfully.');
    } else if (type === 'reject') {
      setActionSuccessToast(language === 'ar' ? 'تم رفض الطلب وتوثيق السبب في السجل الائتماني.' : 'Application rejected and recorded in audit log.');
    } else {
      setActionSuccessToast(language === 'ar' ? 'تم تحويل الطلب إلى قائمة المراجعة البشرية وإخطار فريق الفحص.' : 'Transferred to human review queue.');
    }
    setTimeout(() => setActionSuccessToast(null), 4000);
  };

  return (
    <AppLayout breadcrumbTitle={application.id} breadcrumbParent={t('nav.applications')} breadcrumbParentHref="/applications">
      <div className="space-y-6 pb-28">
        {/* Top Bar: Back Link & Last Update */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {t('application.detailsTitle')}
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              {language === 'ar'
                ? `آخر تحديث ${application.lastUpdated} • ${application.id}`
                : `Last updated ${application.lastUpdated} • ${application.id}`}
            </p>
          </div>

          <Link href="/applications" className="text-xs font-semibold text-text-secondary hover:text-brand-navy flex items-center gap-1.5 transition-colors">
            <Arrow className="w-4 h-4" />
            <span>{t('action.backToApps')}</span>
          </Link>
        </div>

        {/* Action Alert Toast if triggered */}
        {actionSuccessToast && (
          <Alert
            type="success"
            title={language === 'ar' ? 'تم تنفيذ الإجراء بنجاح' : 'Action Processed Successfully'}
            message={actionSuccessToast}
            onClose={() => setActionSuccessToast(null)}
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
                    {language === 'ar' ? application.applicantName : application.applicantNameEn}
                  </h2>
                  <Badge variant="neutral" size="sm">
                    {language === 'ar' ? 'عميل حالي' : 'Existing Client'} - {application.nationalId}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-text-secondary">
                  <span>
                    <strong className="text-text-primary">{language === 'ar' ? 'نوع التمويل: ' : 'Type: '}</strong>
                    {language === 'ar' ? application.loanTypeLabel : application.loanTypeLabelEn}
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-text-primary">{language === 'ar' ? 'المبلغ المطلوب: ' : 'Amount: '}</strong>
                    <span className="font-bold text-brand-navy">{formatCurrency(application.requestedAmount)}</span>
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-text-primary">{language === 'ar' ? 'الوظيفة: ' : 'Job: '}</strong>
                    {language === 'ar' ? application.occupation : application.occupationEn}
                  </span>
                </div>
              </div>
            </div>

            {/* Explainable AI Recommendation Widget */}
            <div className="p-4 rounded-2xl bg-semantic-warning-subtle border border-semantic-warning/30 text-start min-w-[240px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-semantic-warning">
                  {t('application.recommendation')}
                </span>
                <span className="text-xs font-bold text-semantic-warning">
                  {t('application.confidence')} {application.aiConfidence}%
                </span>
              </div>
              <p className="text-sm font-bold text-semantic-warning flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {language === 'ar'
                    ? application.aiRecommendationLabel
                    : application.aiRecommendationLabelEn}
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
                    ? 'لماذا أوصى الذكاء الاصطناعي بالمراجعة البشرية؟ (Explainable AI Insights)'
                    : 'Why did AI recommend Manual Review? (Explainable AI Insights)'}
                </span>
              </div>
              {showExplanation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showExplanation && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2.5 animate-in fade-in duration-200">
                {application.recommendationReasons.map((reason, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-surface-subtle rounded-xl border border-border text-xs text-text-primary space-y-1 text-start"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-text-primary">
                      <span className="w-1.5 h-1.5 rounded-full bg-semantic-warning" />
                      <span>{language === 'ar' ? `السبب ${idx + 1}` : `Factor ${idx + 1}`}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-text-secondary">
                      {language === 'ar' ? reason.ar : reason.en}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* 5 Assessment Tabs */}
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
                      {t('ocr.extractedFrom')} {application.extractedFromDocCount} {t('ocr.documentsCount')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-[#E8EEF5] text-brand-navy rounded-full border border-brand-navy/20 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('ocr.accuracy')} {application.ocrAccuracy}%</span>
                  </div>
                </div>

                {/* 6 Data Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {application.extractedFields.map((field, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-surface-subtle border border-border space-y-1 text-start relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-text-muted font-medium">
                          {language === 'ar' ? field.label : field.labelEn}
                        </span>
                        <span className="text-[10px] text-brand-navy bg-[#E8EEF5] px-1.5 py-0.5 rounded font-mono font-bold border border-brand-navy/20">
                          {field.confidence}%
                        </span>
                      </div>
                      <p className="text-sm font-bold text-text-primary">{field.value}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Right Card: Bank Account Summary (1 col) */}
              <Card className="p-6 space-y-6">
                <div className="border-b border-border pb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-text-primary">{t('bank.summaryTitle')}</h3>
                    <CreditCard className="w-5 h-5 text-brand-navy" />
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{t('bank.fromStatement')}</p>
                </div>

                <div className="space-y-4 text-start">
                  <div className="space-y-1">
                    <p className="text-xs text-text-muted">{t('bank.totalDeposits')}</p>
                    <p className="text-3xl font-extrabold text-text-primary">
                      {formatCurrency(application.bankSummary.totalDeposits)}
                    </p>
                    <p className="text-xs text-semantic-success font-medium">
                      {language === 'ar' ? '↑ عن الفترة السابقة 12.4%' : '↑ 12.4% from previous period'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                    <div>
                      <p className="text-[11px] text-text-muted">{t('bank.transactionsCount')}</p>
                      <p className="text-sm font-bold text-text-primary mt-0.5">
                        {application.bankSummary.totalTransactions} {t('bank.operation')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-text-muted">{t('bank.averageBalance')}</p>
                      <p className="text-sm font-bold text-text-primary mt-0.5">
                        {formatCurrency(application.bankSummary.averageBalance)}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Document Processing Stepper Card */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-primary">{t('pipeline.title')}</h3>
                <span className="text-xs font-semibold text-brand-navy">
                  {t('pipeline.progress')}: {application.pipelineCompletedSteps}/{application.pipelineTotalSteps} {t('pipeline.ofCompleted')}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-semantic-success-subtle border border-semantic-success/20">
                  <CheckCircle2 className="w-5 h-5 text-semantic-success shrink-0" />
                  <div className="text-start">
                    <p className="text-xs font-bold text-text-primary">{t('pipeline.step.ocr')}</p>
                    <p className="text-[10px] text-semantic-success">{language === 'ar' ? 'اكتمل 97.4%' : 'Completed 97.4%'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-semantic-success-subtle border border-semantic-success/20">
                  <CheckCircle2 className="w-5 h-5 text-semantic-success shrink-0" />
                  <div className="text-start">
                    <p className="text-xs font-bold text-text-primary">{t('pipeline.step.credit')}</p>
                    <p className="text-[10px] text-semantic-success">{language === 'ar' ? 'احتساب 54/100' : 'Score 54/100'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-semantic-warning-subtle border border-semantic-warning/20">
                  <AlertTriangle className="w-5 h-5 text-semantic-warning shrink-0" />
                  <div className="text-start">
                    <p className="text-xs font-bold text-text-primary">{t('pipeline.step.fraud')}</p>
                    <p className="text-[10px] text-semantic-warning">{language === 'ar' ? '3 إشارات مرصودة' : '3 Signals Detected'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-subtle border border-border">
                  <Clock className="w-5 h-5 text-text-muted shrink-0" />
                  <div className="text-start">
                    <p className="text-xs font-bold text-text-primary">{t('pipeline.step.review')}</p>
                    <p className="text-[10px] text-text-muted">{language === 'ar' ? 'بانتظار الإجراء' : 'Pending Action'}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: Credit Assessment */}
        {activeTab === 'creditAssessment' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Circular Gauge Card */}
            <Card className="p-8 flex flex-col items-center justify-center text-center space-y-4">
              <h3 className="text-base font-bold text-text-primary">{t('credit.scoreTitle')}</h3>
              <p className="text-xs text-text-muted -mt-2">
                {t('credit.calculatedFrom')} ({application.calculatedFactorsCount} {t('unit.items')})
              </p>

              <div className="py-4">
                <CircularScoreGauge
                  score={application.creditScore}
                  maxScore={100}
                  label={language === 'ar' ? application.creditRiskLabel : application.creditRiskLabelEn}
                  sublabel={language === 'ar' ? 'تحتاج إلى مراجعة ائتمانية' : 'Requires credit review'}
                  size="lg"
                />
              </div>
            </Card>

            {/* Evaluation Factors Card (2 cols) */}
            <Card className="lg:col-span-2 p-6 space-y-6">
              <div className="border-b border-border pb-4 text-start">
                <h3 className="text-base font-bold text-text-primary">{t('credit.factorsTitle')}</h3>
                <p className="text-xs text-text-muted mt-0.5">{t('credit.factorsSubtitle')}</p>
              </div>

              <div className="space-y-6 text-start">
                {application.creditFactors.map((factor) => (
                  <div key={factor.id} className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-text-primary">
                        {language === 'ar' ? factor.name : factor.nameEn}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-text-secondary font-mono">{factor.percentage}%</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-bold ${
                            factor.rating === 'good'
                              ? 'text-semantic-success bg-semantic-success-subtle'
                              : factor.rating === 'medium'
                              ? 'text-semantic-warning bg-semantic-warning-subtle'
                              : 'text-semantic-error bg-semantic-error-subtle'
                          }`}
                        >
                          {language === 'ar' ? factor.ratingLabel : factor.ratingLabelEn}
                        </span>
                      </div>
                    </div>
                    <ProgressBar
                      value={factor.percentage}
                      color={factor.rating === 'good' ? 'emerald' : factor.rating === 'medium' ? 'amber' : 'rose'}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: Fraud Detection */}
        {activeTab === 'fraudDetection' && (
          <div className="space-y-6">
            {/* Top Score Linear Bar Card */}
            <Card className="p-6 space-y-3 text-start">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-text-primary">{t('fraud.scoreTitle')}</h3>
                  <p className="text-xs text-text-muted">{t('fraud.analyzedSignals')}</p>
                </div>
                <Badge variant="danger" dot>
                  {t('risk.requiresAttention')}
                </Badge>
              </div>

              <LinearFraudRiskBar
                score={application.fraudRiskScore}
                label={language === 'ar' ? application.fraudRiskLabel : application.fraudRiskLabelEn}
                sublabel={t('fraud.actionRequiredAlert')}
              />
            </Card>

            {/* Explainable Signals List */}
            <Card className="p-6 space-y-4 text-start">
              <div className="border-b border-border pb-3">
                <h3 className="text-base font-bold text-text-primary">{t('fraud.signalsTitle')}</h3>
                <p className="text-xs text-text-muted mt-0.5">{t('fraud.signalsSubtitle')}</p>
              </div>

              <div className="space-y-3">
                {application.fraudSignals.map((signal) => {
                  const isExpanded = expandedSignalId === signal.id;
                  return (
                    <div
                      key={signal.id}
                      className="rounded-2xl border border-semantic-error/30 bg-semantic-error-subtle/30 overflow-hidden transition-all"
                    >
                      <button
                        onClick={() => setExpandedSignalId(isExpanded ? null : signal.id)}
                        className="w-full p-4 flex items-center justify-between text-start hover:bg-semantic-error-subtle/60 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-semantic-error-subtle text-semantic-error flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-text-primary">
                              {language === 'ar' ? signal.title : signal.titleEn}
                            </p>
                            <p className="text-[11px] text-text-muted mt-0.5">{t('fraud.detectedBy')}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                              signal.severity === 'high'
                                ? 'bg-semantic-error-subtle text-semantic-error'
                                : 'bg-semantic-warning-subtle text-semantic-warning'
                            }`}
                          >
                            {language === 'ar' ? signal.severityLabel : signal.severityLabelEn}
                          </span>
                          <span className="text-xs text-text-muted font-mono">
                            {signal.confidence}% {t('fraud.modelConfidence')}
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                        </div>
                      </button>

                      {/* Expandable Evidence Details */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1 border-t border-semantic-error/20 space-y-3 text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            <div className="p-3 bg-surface rounded-xl border border-border space-y-1">
                              <span className="text-[11px] font-bold text-text-muted">{t('fraud.evidence')}:</span>
                              <p className="text-xs text-text-primary leading-relaxed">
                                {language === 'ar' ? signal.evidence : signal.evidenceEn}
                              </p>
                            </div>
                            <div className="p-3 bg-surface rounded-xl border border-border space-y-1">
                              <span className="text-[11px] font-bold text-text-muted">{t('fraud.action')}:</span>
                              <p className="text-xs text-semantic-success font-semibold leading-relaxed">
                                {language === 'ar' ? signal.recommendedAction : signal.recommendedActionEn}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-text-muted pt-1">
                            <span>
                              {t('fraud.relatedDoc')}: <strong>{language === 'ar' ? signal.relatedDocument : signal.relatedDocumentEn}</strong>
                            </span>
                            <span>{signal.timestamp}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 4: Documents */}
        {activeTab === 'documents' && (
          <Card className="p-6 space-y-4 text-start">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  {language === 'ar' ? 'المستندات المرفقة' : 'Attached Documents'}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {language === 'ar' ? '4 مستندات - تم الرفع في 04 سبتمبر 2026' : '4 Documents - Uploaded Sep 04, 2026'}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => alert(language === 'ar' ? 'نافذة إضافة مستند جديد' : 'Add document dialog')}
              >
                {t('action.addDocument')}
              </Button>
            </div>

            <div className="space-y-3">
              {application.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-surface-subtle rounded-2xl border border-border hover:border-border-strong transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#E8EEF5] text-brand-navy font-bold text-xs flex items-center justify-center border border-brand-navy/20">
                      {doc.code}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-primary">
                        {language === 'ar' ? doc.name : doc.nameEn}
                      </p>
                      <p className="text-[11px] text-text-muted">PDF • {doc.size}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Badge variant={doc.status === 'success' ? 'success' : 'warning'} dot>
                      {language === 'ar' ? doc.statusLabel : doc.statusLabelEn}
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

        {/* TAB 5: Audit Log / Timeline */}
        {activeTab === 'auditLog' && (
          <Card className="p-6 space-y-6 text-start">
            <div className="border-b border-border pb-4">
              <h3 className="text-base font-bold text-text-primary">
                {language === 'ar' ? 'سجل مراحل الطلب' : 'Application Stage Log'}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {language === 'ar' ? 'رحلة الطلب منذ الاستلام حتى اتخاذ القرار' : 'Application journey from ingestion to decision'}
              </p>
            </div>

            <div className="relative ps-6 space-y-8 border-s-2 border-border ms-3">
              {application.timeline.map((event) => (
                <div key={event.id} className="relative group text-start">
                  {/* Status Circle Node */}
                  <span
                    className={`absolute -start-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      event.status === 'completed'
                        ? 'bg-semantic-success text-white ring-4 ring-semantic-success-subtle'
                        : event.status === 'current'
                        ? 'bg-brand-navy text-white ring-4 ring-brand-navy/20 animate-pulse'
                        : 'bg-surface-subtle text-text-muted ring-4 ring-border'
                    }`}
                  >
                    {event.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3 h-3" />}
                  </span>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-text-primary">
                        {language === 'ar' ? event.title : event.titleEn}
                      </h4>
                      <span className="text-[11px] text-text-muted">{event.timestamp}</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {language === 'ar' ? event.description : event.descriptionEn}
                    </p>
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
                  ? 'مستعرض المستندات التفاعلي المباشر مع مربعات استخراج الـ OCR المحفوظة'
                  : 'Interactive Document Viewer with OCR Bounding Box Annotations'}
              </p>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setPreviewDocModal(null)}>
                {t('action.close')}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Sticky Bottom Action Bar */}
        <div className="fixed bottom-0 start-0 end-0 bg-surface/95 backdrop-blur-md border-t border-border p-4 z-40 shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text-primary">
                {t('application.officerAction')}
              </span>
              <span className="text-xs text-text-muted font-mono">{application.id}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Approve Button */}
              <Button
                variant="primary"
                size="md"
                className="bg-semantic-success hover:bg-semantic-success/90 text-white shadow-xs"
                onClick={() => handleDecision('approve')}
                icon={<CheckCircle2 className="w-4 h-4 text-white" />}
              >
                {t('application.approve')}
              </Button>

              {/* Reject Button */}
              <Button
                variant="danger"
                size="md"
                onClick={() => handleDecision('reject')}
                icon={<XCircle className="w-4 h-4 text-white" />}
              >
                {t('application.reject')}
              </Button>

              {/* Manual Review Button */}
              <Button
                variant="outline"
                size="md"
                onClick={() => handleDecision('manual')}
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
