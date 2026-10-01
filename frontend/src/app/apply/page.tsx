'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Globe,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileText,
  UploadCloud,
  Check,
  Lock,
  UserCheck,
  Paperclip,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CredixLogo } from '@/components/ui/CredixLogo';
import { uploadAndProcessDocuments } from '@/lib/api';
import { isDemoMode } from '@/lib/config';
import { RequireRole } from '@/components/auth/RequireRole';

const SLOT_DEFS = [
  { key: 'nationalIdFront', ar: 'بطاقة الرقم القومي (الوجه)', en: 'National ID (front)' },
  { key: 'nationalIdBack', ar: 'بطاقة الرقم القومي (الظهر)', en: 'National ID (back)' },
  { key: 'salaryCertificate', ar: 'شهادة الراتب', en: 'Salary certificate' },
  { key: 'bankStatement', ar: 'كشف الحساب البنكي', en: 'Bank statement' },
  { key: 'iscore', ar: 'تقرير الآي سكور', en: 'I-Score report' },
] as const;

type SlotKey = (typeof SLOT_DEFS)[number]['key'];

const EMPTY_SLOTS: Record<SlotKey, File | null> = {
  nationalIdFront: null,
  nationalIdBack: null,
  salaryCertificate: null,
  bankStatement: null,
  iscore: null,
};

export default function ApplyPage() {
  const { t, language, toggleLanguage, direction } = useLanguage();
  const { user } = useAuth();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const ArrowBack = direction === 'rtl' ? ArrowRight : ArrowLeft;

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    nationalId: '',
    mobileNumber: '',
    loanType: 'personal',
    requestedAmount: '',
    tenureMonths: '36',
    purpose: '',
  });
  const [slots, setSlots] = useState<Record<SlotKey, File | null>>(EMPTY_SLOTS);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { session } = useAuth();

  const steps = [
    { num: 1, title: language === 'ar' ? 'المعلومات الشخصية' : 'Personal Information' },
    { num: 2, title: language === 'ar' ? 'تفاصيل التمويل' : 'Financing details' },
    { num: 3, title: language === 'ar' ? 'المستندات' : 'Documents' },
    { num: 4, title: language === 'ar' ? 'المراجعة والإرسال' : 'Review & submit' },
  ];

  const nidValid = /^\d{14}$/.test(formData.nationalId);
  const mobileValid = /^01[0125]\d{8}$/.test(formData.mobileNumber);
  const filesReady = SLOT_DEFS.every((s) => slots[s.key] !== null);
  const canProceed =
    currentStep === 1
      ? formData.fullName.trim().length > 1 && nidValid && mobileValid
      : currentStep === 2
      ? Number(formData.requestedAmount) > 0
      : currentStep === 3
      ? filesReady
      : true;

  const handleNext = async () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (isDemoMode) {
        setSubmittedAppId('APP-DEMO');
        setIsSubmitted(true);
        return;
      }
      const token = session?.access_token;
      if (!token) {
        throw new Error(language === 'ar' ? 'سجّل الدخول أولاً ثم اعد المحاولة.' : 'Please sign in first.');
      }
      const result = await uploadAndProcessDocuments(
        {
          nationalIdFront: slots.nationalIdFront as File,
          nationalIdBack: slots.nationalIdBack as File,
          salaryCertificate: slots.salaryCertificate as File,
          bankStatement: slots.bankStatement as File,
          iscore: slots.iscore as File,
        },
        {
          loanType: formData.loanType,
          requestedAmount: Number(formData.requestedAmount),
          tenureMonths: Number(formData.tenureMonths),
          purpose: formData.purpose || undefined,
          mobileNumber: formData.mobileNumber,
        },
        token
      );
      setSubmittedAppId(result.application_id);
      setIsSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || (language === 'ar' ? 'حدث خطأ أثناء رفع المستندات، حاول مرة أخرى.' : 'Failed to process documents.'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <RequireRole allowedRole="client">
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans relative overflow-x-hidden selection:bg-brand-navy selection:text-white">
      {/* Ambient background glow mesh */}
      <div className="fixed inset-0 pointer-events-none z-0 ambient-glow-mesh opacity-40" />

      {/* Top Header */}
      <header className="border-b border-border bg-surface/85 backdrop-blur-xl sticky top-0 z-30 min-h-[76px] flex items-center">
        <div className="landing-container flex items-center justify-between w-full">
          <CredixLogo href="/" size="md" />

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-secondary">
              <ShieldCheck className="w-4 h-4 text-brand-navy" />
              <span>{t('header.encrypted')}</span>
            </div>

            <button
              onClick={toggleLanguage}
              className="px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-subtle text-xs font-semibold text-text-secondary hover:text-text-primary transition-all cursor-pointer shadow-xs active:scale-95"
            >
              {language === 'ar' ? 'English' : 'العربية'}
            </button>
          </div>
        </div>
      </header>

      {/* Main 2-Column Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start relative z-10">
        {/* Left Column: Hero & Stepper List */}
        <div className="lg:col-span-5 space-y-8 text-start">
          <div className="space-y-4">
            <span className="text-xs font-bold text-brand-navy tracking-wide uppercase">
              CrediX secure applicant portal
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary leading-tight">
              {t('apply.heroTitle')}
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              {t('apply.heroSubtitle')}
            </p>
          </div>

          {/* Steps List */}
          <div className="space-y-4 pt-4">
            {steps.map((s) => {
              const isActive = currentStep === s.num;
              const isPast = currentStep > s.num;

              return (
                <div key={s.num} className="flex items-center gap-4">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-brand-navy text-white shadow-xs'
                        : isPast
                        ? 'bg-semantic-success text-white'
                        : 'border border-border text-text-muted bg-surface'
                    }`}
                  >
                    {isPast ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span
                    className={`text-sm font-semibold transition-colors ${
                      isActive
                        ? 'text-brand-navy font-bold'
                        : isPast
                        ? 'text-semantic-success'
                        : 'text-text-muted'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Step Form Box */}
        <div className="lg:col-span-7 space-y-6">
          {!user || user.role !== 'client' ? (
            <div className="bg-surface rounded-3xl p-8 md:p-10 border border-border text-center space-y-6 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-[#E8EEF5] border border-border text-brand-navy flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8 stroke-[2.2]" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-text-primary">
                  {t('apply.authRequiredTitle')}
                </h2>
                <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
                  {t('apply.authRequiredDesc')}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
                <Link href="/auth/login?role=client&mode=signin&redirect=/apply" className="w-full sm:w-auto">
                  <Button variant="primary" size="lg" className="w-full shadow-xs" icon={<Arrow className="w-4 h-4" />}>
                    {t('apply.authSignInBtn')}
                  </Button>
                </Link>
                <Link href="/auth/login?role=client&mode=signup&redirect=/apply" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full border-border">
                    {t('apply.authSignUpBtn')}
                  </Button>
                </Link>
              </div>

            </div>
          ) : isSubmitted ? (
            <div className="bg-surface rounded-3xl p-10 border border-border text-center space-y-6 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-semantic-success-subtle text-semantic-success flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-text-primary">
                  {t('portal.submittedSuccess')}
                </h3>
                <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
                  {t('portal.submittedDesc')}
                </p>
                <div className="inline-block mt-2 px-3 py-1 bg-[#E8EEF5] border border-border rounded-full text-xs font-bold text-brand-navy font-mono">
                  {language === 'ar' ? `رقم الطلب المرجعي: ${submittedAppId}` : `Application Ref: ${submittedAppId}`}
                </div>
              </div>
              <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-3">
                <Link href="/portal">
                  <Button variant="primary" size="md" className="shadow-xs" icon={<Arrow className="w-4 h-4" />}>
                    {t('portal.trackAction')}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setIsSubmitted(false);
                    setCurrentStep(1);
                  }}
                >
                  {t('portal.newLoanAction')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-start">
              {/* Step indicator header */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-brand-navy">
                  {t('apply.stepOf')} {currentStep} {t('apply.of')} 4
                </span>
                <h2 className="text-xl font-bold text-text-primary">
                  {steps[currentStep - 1].title}
                </h2>
                <p className="text-xs text-text-muted">
                  {currentStep === 1 && (language === 'ar' ? 'ستحتاج إلى بطاقة الرقم القومي وكشف حساب بنكي حديث.' : 'You will need your national ID and a recent bank statement.')}
                  {currentStep === 2 && (language === 'ar' ? 'حدد مبلغ التمويل والغرض وفترة السداد المناسبة.' : 'Specify requested loan amount, duration, and purpose.')}
                  {currentStep === 3 && (language === 'ar' ? 'ارفع نسخ الوثائق المطلوبة بصيغة PDF أو صور واضحة.' : 'Upload the required documents in PDF or clear image format.')}
                  {currentStep === 4 && (language === 'ar' ? 'راجع بياناتك بعناية قبل الإرسال النهائي للتقييم.' : 'Review all your details carefully before final submission.')}
                </p>
              </div>

              {/* Progress Navy Line */}
              <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-navy transition-all duration-300"
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                />
              </div>

              {/* Step Form Card */}
              <div className="bg-surface rounded-3xl p-8 border border-border space-y-6 shadow-sm">
                {/* STEP 1: Personal Info */}
                {currentStep === 1 && (
                  <div className="space-y-5">
                    <Input
                      label={t('apply.fullName')}
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label={t('apply.nationalId')}
                        value={formData.nationalId}
                        onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                        placeholder="28501151001234"
                        required
                      />
                      <Input
                        label={t('apply.mobileNumber')}
                        value={formData.mobileNumber}
                        onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                        placeholder="01XXXXXXXXX"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* STEP 2: Financing Details */}
                {currentStep === 2 && (
                  <div className="space-y-5">
                    <Select
                      label={language === 'ar' ? 'نوع التمويل' : 'Financing Type'}
                      value={formData.loanType}
                      onChange={(e) => setFormData({ ...formData, loanType: e.target.value })}
                      options={[
                        { value: 'personal', label: t('loanType.personal') },
                        { value: 'sme', label: t('loanType.sme') },
                        { value: 'auto', label: t('loanType.auto') },
                        { value: 'mortgage', label: t('loanType.mortgage') },
                      ]}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label={language === 'ar' ? 'المبلغ المطلوب (ج.م)' : 'Requested Amount (EGP)'}
                        type="number"
                        value={formData.requestedAmount}
                        onChange={(e) => setFormData({ ...formData, requestedAmount: e.target.value })}
                        required
                      />
                      <Select
                        label={language === 'ar' ? 'مدة السداد' : 'Repayment Period'}
                        value={formData.tenureMonths}
                        onChange={(e) => setFormData({ ...formData, tenureMonths: e.target.value })}
                        options={[
                          { value: '12', label: '12 شهراً (سنة واحدة)' },
                          { value: '24', label: '24 شهراً (سنتان)' },
                          { value: '36', label: '36 شهراً (3 سنوات)' },
                          { value: '60', label: '60 شهراً (5 سنوات)' },
                        ]}
                      />
                    </div>

                    <Input
                      label={language === 'ar' ? 'الغرض من التمويل' : 'Financing Purpose'}
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    />
                  </div>
                )}

                {/* STEP 3: Document Uploads */}
                {currentStep === 3 && (
                  <div className="space-y-2">
                    {SLOT_DEFS.map((slot) => (
                      <div
                        key={slot.key}
                        className="flex items-center justify-between gap-3 p-3 bg-surface-subtle border border-border rounded-xl"
                      >
                        <div className="min-w-0 text-start">
                          <p className="text-xs font-semibold text-text-primary">{language === 'ar' ? slot.ar : slot.en}</p>
                          <p className="text-[11px] text-text-muted truncate">
                            {slots[slot.key]?.name ?? (language === 'ar' ? 'لم يتم اختيار ملف' : 'No file selected')}
                          </p>
                        </div>
                        <label className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-navy bg-[#E8EEF5] hover:bg-[#E8EEF5]/80 rounded-xl cursor-pointer border border-brand-navy/20 transition-colors">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'اختيار' : 'Choose'}</span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              setSlots((prev) => ({ ...prev, [slot.key]: file }));
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bottom Wizard Actions */}
                <div className="pt-4 border-t border-border flex items-center justify-between">
                  {currentStep > 1 ? (
                    <Button variant="ghost" size="sm" onClick={handleBack} icon={<ArrowBack className="w-3.5 h-3.5" />}>
                      {t('action.previous')}
                    </Button>
                  ) : (
                    <span className="text-xs text-text-muted hover:underline cursor-pointer">
                      {t('apply.saveAndReturn')}
                    </span>
                  )}

                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => void handleNext()}
                    disabled={isSubmitting || !canProceed}
                    className="shadow-xs"
                    icon={<Arrow className="w-4 h-4" />}
                  >
                    {isSubmitting
                      ? (language === 'ar' ? 'جاري رفع المستندات وفحصها...' : 'Submitting...')
                      : currentStep === 4
                      ? (language === 'ar' ? 'إرسال الطلب للتقييم' : 'Submit Application')
                      : t('action.next')}
                  </Button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
    </RequireRole>
  );
}
