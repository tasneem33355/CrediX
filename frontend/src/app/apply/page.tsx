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
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FileUploader } from '@/components/ui/FileUploader';
import { CredixLogo } from '@/components/ui/CredixLogo';
import { createApplication } from '@/lib/api';
import { isDemoMode } from '@/lib/config';
import { RequireRole } from '@/components/auth/RequireRole';

export default function ApplyPage() {
  const { t, language, toggleLanguage, direction } = useLanguage();
  const { user } = useAuth();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const ArrowBack = direction === 'rtl' ? ArrowRight : ArrowLeft;

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: user?.name || 'أحمد فؤاد عبد الله',
    nationalId: '28501151001234',
    mobileNumber: '01012345678',
    loanType: 'sme',
    requestedAmount: '1250000',
    tenureMonths: '36',
    purpose: 'توسعة نشاط تجاري وشراء معدات وبضائع',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState<string>('APP-2026-0839');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { session } = useAuth();

  const steps = [
    { num: 1, title: language === 'ar' ? 'المعلومات الشخصية' : 'Personal Information' },
    { num: 2, title: language === 'ar' ? 'تفاصيل التمويل' : 'Financing details' },
    { num: 3, title: language === 'ar' ? 'المستندات' : 'Documents' },
    { num: 4, title: language === 'ar' ? 'المراجعة والإرسال' : 'Review & submit' },
  ];

  const handleNext = async () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        if (!isDemoMode && session?.access_token) {
          const created = await createApplication(
            {
              applicantName: formData.fullName,
              nationalId: formData.nationalId,
              mobileNumber: formData.mobileNumber,
              loanType: formData.loanType,
              requestedAmount: Number(formData.requestedAmount),
              tenureMonths: Number(formData.tenureMonths),
              purpose: formData.purpose,
            },
            session.access_token
          );
          if (created && created.id) {
            setSubmittedAppId(created.id);
          }
        }
        setIsSubmitted(true);
      } catch (err: any) {
        setSubmitError(err.message || (language === 'ar' ? 'حدث خطأ أثناء إرسال الطلب، يرجى المحاولة ثانية.' : 'Failed to submit application.'));
      } finally {
        setIsSubmitting(false);
      }
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
                  <div className="space-y-4">
                    <FileUploader />
                  </div>
                )}

                {/* STEP 4: Review & Submit */}
                {currentStep === 4 && (
                  <div className="space-y-4 text-xs">
                    <div className="p-4 rounded-2xl bg-surface-subtle space-y-2 text-start">
                      <div className="flex justify-between py-1 border-b border-border">
                        <span className="text-text-muted">{language === 'ar' ? 'الاسم بالكامل:' : 'Full Name:'}</span>
                        <span className="font-bold text-text-primary">{formData.fullName}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border">
                        <span className="text-text-muted">{language === 'ar' ? 'الرقم القومي:' : 'National ID:'}</span>
                        <span className="font-bold text-text-primary font-mono">{formData.nationalId}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border">
                        <span className="text-text-muted">{language === 'ar' ? 'رقم الموبايل:' : 'Mobile Number:'}</span>
                        <span className="font-bold text-text-primary font-mono">{formData.mobileNumber}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border">
                        <span className="text-text-muted">{language === 'ar' ? 'نوع التمويل:' : 'Loan Type:'}</span>
                        <span className="font-bold text-text-primary">
                          {formData.loanType === 'personal' ? 'تمويل شخصي' : formData.loanType === 'sme' ? 'تمويل مشروعات صغيرة' : formData.loanType === 'auto' ? 'تمويل سيارات' : 'تمويل عقاري'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-text-muted">{language === 'ar' ? 'المبلغ المطلوب:' : 'Requested Amount:'}</span>
                        <span className="font-bold text-brand-navy">{Number(formData.requestedAmount || 0).toLocaleString()} ج.م</span>
                      </div>
                    </div>

                    {submitError && (
                      <div className="p-3 rounded-xl bg-semantic-error-subtle border border-semantic-error/30 text-semantic-error text-xs text-start">
                        {submitError}
                      </div>
                    )}
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
                    disabled={isSubmitting}
                    className="shadow-xs"
                    icon={<Arrow className="w-4 h-4" />}
                  >
                    {isSubmitting
                      ? (language === 'ar' ? 'جاري الإرسال...' : 'Submitting...')
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
