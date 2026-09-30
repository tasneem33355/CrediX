'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  FileText,
  CreditCard,
  Building2,
  ArrowRight,
  ArrowLeft,
  Download,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CredixLogo } from '@/components/ui/CredixLogo';
import { RequireRole } from '@/components/auth/RequireRole';
import { mockApplications } from '@/data/mockData';

export default function ClientPortalPage() {
  const { t, language, formatCurrency, toggleLanguage, direction } = useLanguage();
  const { logout } = useAuth();
  const router = useRouter();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const myApp = mockApplications[0]; // Ahmed Fouad application

  const trackingSteps = [
    {
      id: 1,
      title: t('portal.step1'),
      status: 'completed',
      date: '04 سبتمبر 2026 - 09:42 ص',
      desc: language === 'ar' ? 'تم استلام كافة بيانات التمويل وملفاتك بنجاح' : 'Application data & documents received successfully',
    },
    {
      id: 2,
      title: t('portal.step2'),
      status: 'completed',
      date: '04 سبتمبر 2026 - 09:43 ص',
      desc: language === 'ar' ? 'تم استخراج البيانات الرقمية بدقة 97.4% ومطابقتها' : 'Digital data extracted with 97.4% OCR accuracy',
    },
    {
      id: 3,
      title: t('portal.step3'),
      status: 'completed',
      date: '04 سبتمبر 2026 - 09:45 ص',
      desc: language === 'ar' ? 'اكتملت مرحلة التقييم الآلي لحساب الجدارة وسجل الدفع' : 'Automated creditworthiness assessment complete',
    },
    {
      id: 4,
      title: t('portal.step4'),
      status: 'current',
      date: language === 'ar' ? 'قيد التنفيذ الآن' : 'In Progress',
      desc: language === 'ar' ? 'يقوم فريق الائتمان حالياً بمراجعة أوراق التمويل لإصدار القرار' : 'Credit team is currently reviewing documents to issue decision',
    },
    {
      id: 5,
      title: t('portal.step5'),
      status: 'pending',
      date: language === 'ar' ? 'الخطوة القادمة' : 'Next Step',
      desc: language === 'ar' ? 'سيتم إشعارك فور اعتماد التمويل لتوقيع العقود البنكية واستلام المبلغ' : 'You will be notified once approved to sign banking contracts',
    },
  ];

  return (
    <RequireRole allowedRole="client">
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans relative overflow-x-hidden selection:bg-brand-navy selection:text-white">
      {/* Ambient background glow mesh */}
      <div className="fixed inset-0 pointer-events-none z-0 ambient-glow-mesh opacity-40" />

      {/* Top Header for Client */}
      <header className="border-b border-border bg-surface/85 backdrop-blur-xl sticky top-0 z-30 min-h-[76px] flex items-center">
        <div className="landing-container flex items-center justify-between w-full">
          <CredixLogo href="/" size="md" />

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-secondary">
              <ShieldCheck className="w-4 h-4 text-brand-navy" />
              <span>{t('header.encrypted')}</span>
            </div>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-subtle text-xs font-semibold text-text-secondary hover:text-text-primary transition-all cursor-pointer shadow-xs active:scale-95"
            >
              {language === 'ar' ? 'English' : 'العربية'}
            </button>

            <Button type="button" onClick={() => void handleLogout()} variant="ghost" size="sm" icon={<LogOut className="w-4 h-4" />}>
              {t('nav.logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 space-y-8 text-start relative z-10">
        {/* Welcome & Active Application Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-3xl bg-brand-navy border border-brand-navy-light text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 end-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-2 z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white bg-white/15 px-2.5 py-1 rounded-full border border-white/20">
                {t('portal.activeApp')}: {myApp.id}
              </span>
              <span className="text-xs text-white/80 font-mono">04 سبتمبر 2026</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {t('portal.welcome')}{' '}
              <span className="text-[#E8EEF5]">
                {language === 'ar' ? myApp.applicantName : myApp.applicantNameEn}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
              {t('portal.subtitle')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 z-10">
            <Link href="/apply">
              <Button variant="secondary" size="sm" className="bg-white hover:bg-[#E8EEF5] text-brand-navy font-bold shadow-xs" icon={<Arrow className="w-4 h-4" />}>
                {t('portal.newLoanAction')}
              </Button>
            </Link>
          </div>
        </div>

        {/* 2-Column Grid: Left (Timeline Stepper) & Right (Loan Specs & Documents) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Application Lifecycle Tracker (7 Cols) */}
          <Card className="lg:col-span-7 p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-base font-bold text-text-primary">{t('portal.trackSteps')}</h2>
                <p className="text-xs text-text-muted mt-0.5">{t('portal.estimatedTime')}</p>
              </div>
              <Badge variant="warning" dot>
                {language === 'ar' ? 'قيد المراجعة' : 'Under Review'}
              </Badge>
            </div>

            {/* Stepper Nodes */}
            <div className="relative ps-6 space-y-8 border-s-2 border-border ms-3">
              {trackingSteps.map((step) => {
                const isCompleted = step.status === 'completed';
                const isCurrent = step.status === 'current';

                return (
                  <div key={step.id} className="relative group text-start">
                    {/* Circle Status Icon */}
                    <span
                      className={`absolute -start-[33px] top-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCompleted
                          ? 'bg-semantic-success text-white ring-4 ring-semantic-success-subtle'
                          : isCurrent
                          ? 'bg-brand-navy text-white ring-4 ring-brand-navy/20 animate-pulse'
                          : 'bg-surface-subtle text-text-muted ring-4 ring-border'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isCurrent ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <span>{step.id}</span>
                      )}
                    </span>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3
                          className={`text-sm font-bold ${
                            isCurrent
                              ? 'text-brand-navy'
                              : isCompleted
                              ? 'text-text-primary'
                              : 'text-text-muted'
                          }`}
                        >
                          {step.title}
                        </h3>
                        <span className="text-[11px] text-text-muted font-mono">{step.date}</span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Right Column: Loan Summary & Uploaded Documents (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Loan Request Summary Card */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-bold text-text-primary">{t('portal.loanSummary')}</h3>
                <CreditCard className="w-4 h-4 text-brand-navy" />
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-text-muted">{language === 'ar' ? 'نوع التمويل' : 'Loan Type'}:</span>
                  <span className="font-bold text-text-primary">
                    {language === 'ar' ? myApp.loanTypeLabel : myApp.loanTypeLabelEn}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-text-muted">{language === 'ar' ? 'المبلغ المطلوب' : 'Amount'}:</span>
                  <span className="font-extrabold text-brand-navy text-sm">
                    {formatCurrency(myApp.requestedAmount)}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-text-muted">{language === 'ar' ? 'فترة السداد' : 'Tenure'}:</span>
                  <span className="font-bold text-text-primary">36 {t('unit.months')}</span>
                </div>

                <div className="flex justify-between py-1.5">
                  <span className="text-text-muted">{t('portal.monthlyInstallment')}:</span>
                  <span className="font-bold text-text-primary">~ 41,200 {t('currency.egp')}</span>
                </div>
              </div>
            </Card>

            {/* My Uploaded Documents */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-bold text-text-primary">{t('portal.myDocuments')}</h3>
                <span className="text-xs text-text-muted">4 مستندات</span>
              </div>

              <div className="space-y-2.5 text-xs">
                {myApp.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-subtle border border-border"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-brand-navy shrink-0" />
                      <div>
                        <p className="font-semibold text-text-primary">
                          {language === 'ar' ? doc.name : doc.nameEn}
                        </p>
                        <p className="text-[10px] text-text-muted">PDF • {doc.size}</p>
                      </div>
                    </div>

                    <Badge variant={doc.status === 'success' ? 'success' : 'warning'} size="sm">
                      {doc.status === 'success' ? (language === 'ar' ? 'تم الفحص' : 'Verified') : (language === 'ar' ? 'قيد التدقيق' : 'Auditing')}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>

    </div>
    </RequireRole>
  );
}
