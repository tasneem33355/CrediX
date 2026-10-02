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
import { fetchApplicationsList } from '@/lib/api';
import { isDemoMode } from '@/lib/config';

export default function ClientPortalPage() {
  const { t, language, formatCurrency, toggleLanguage, direction } = useLanguage();
  const { logout, session } = useAuth();
  const router = useRouter();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const [appData, setAppData] = React.useState<any>(isDemoMode ? mockApplications[0] : null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (isDemoMode) {
      setIsLoading(false);
      return;
    }
    if (!session?.access_token) return;
    let isMounted = true;
    async function loadClientApp() {
      try {
        // The backend returns only this client's own applications, newest first.
        const apps = await fetchApplicationsList({ limit: 1 }, session?.access_token);
        if (isMounted && Array.isArray(apps) && apps.length > 0) {
          const raw = apps[0] as any;
          setAppData({
            id: raw.id,
            applicantName: raw.applicant_name ?? raw.applicantName ?? '',
            applicantNameEn: raw.applicant_name_en ?? raw.applicantNameEn ?? raw.applicant_name ?? '',
            requestedAmount: Number(raw.requested_amount ?? raw.requestedAmount ?? 0),
            loanTypeLabel: raw.loan_type_label ?? raw.loanTypeLabel ?? '',
            loanTypeLabelEn: raw.loan_type_label_en ?? raw.loanTypeLabelEn ?? '',
            status: raw.status ?? 'under_review',
            tenureMonths: raw.tenure_months ?? raw.tenureMonths ?? 36,
            documents: raw.documents ?? [],
          });
        } else if (isMounted) {
          setAppData(null);
        }
      } catch {
        if (isMounted) setAppData(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    void loadClientApp();
    return () => {
      isMounted = false;
    };
  }, [session]);

  const myApp = appData ?? {
    id: '', status: 'under_review', tenureMonths: 36, requestedAmount: 0, documents: [],
    applicantName: '', applicantNameEn: '', loanTypeLabel: '', loanTypeLabelEn: '',
  };
  const isApproved = myApp.status === 'approved';
  const isRejected = myApp.status === 'rejected';

  // Calculate monthly installment estimate
  const tenure = Number(myApp.tenureMonths) || 36;
  const monthlyEst = Math.round((Number(myApp.requestedAmount) / tenure) * 1.18);

  const trackingSteps = [
    {
      id: 1,
      title: t('portal.step1'),
      status: 'completed',
      date: language === 'ar' ? 'تم الاعتماد والاستلام' : 'Received & Logged',
      desc: language === 'ar' ? 'تم استلام كافة بيانات التمويل ومستنداتك بنجاح' : 'Application data & documents received successfully',
    },
    {
      id: 2,
      title: t('portal.step2'),
      status: 'completed',
      date: language === 'ar' ? 'مكتمل' : 'Completed',
      desc: language === 'ar' ? 'تم استخراج البيانات الرقمية وفحص جودة المستندات آلياً' : 'Digital data extracted and document quality verified',
    },
    {
      id: 3,
      title: t('portal.step3'),
      status: 'completed',
      date: language === 'ar' ? 'مكتمل' : 'Completed',
      desc: language === 'ar' ? 'اكتملت مرحلة التقييم الآلي لاحتساب الملاءة المالية' : 'Automated creditworthiness assessment complete',
    },
    {
      id: 4,
      title: t('portal.step4'),
      status: (isApproved || isRejected) ? 'completed' : 'current',
      date: (isApproved || isRejected) ? (language === 'ar' ? 'اكتملت المراجعة' : 'Review completed') : (language === 'ar' ? 'قيد التنفيذ الآن' : 'In Progress'),
      desc: isApproved
        ? (language === 'ar' ? 'تمت مراجعة الطلب بنجاح من مسؤولي الائتمان' : 'Credit review completed successfully')
        : isRejected
        ? (language === 'ar' ? 'تم الانتهاء من المراجعة الائتمانية' : 'Credit assessment finished')
        : (language === 'ar' ? 'يقوم فريق الائتمان حالياً بفحص ومراجعة أوراق التمويل' : 'Credit team is currently reviewing documents'),
    },
    {
      id: 5,
      title: t('portal.step5'),
      status: isApproved ? 'completed' : isRejected ? 'failed' : 'pending',
      date: isApproved ? (language === 'ar' ? 'تم الاعتماد بنجاح' : 'Approved') : isRejected ? (language === 'ar' ? 'طلب مرفوض' : 'Declined') : (language === 'ar' ? 'الخطوة القادمة' : 'Next Step'),
      desc: isApproved
        ? (language === 'ar' ? 'تهانينا! تم اعتماد التمويل، برجاء التوجه للفرع لتوقيع العقود واستلام المبلغ' : 'Congratulations! Your loan is approved. Visit branch for contract signing.')
        : isRejected
        ? (language === 'ar' ? 'نعتذر، لم يستوفِ الطلب الشروط الائتمانية المطلوبة حالياً' : 'We regret to inform that the application did not meet criteria.')
        : (language === 'ar' ? 'سيتم إشعارك فور إصدار القرار النهائي لاستكمال إجراءات التعاقد' : 'You will be notified once decision is finalized'),
    },
  ];

  if (isLoading || !appData) {
    return (
      <RequireRole allowedRole="client">
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-text-primary text-sm p-6 text-center">
          {isLoading ? (
            <p>{language === 'ar' ? 'جاري تحميل طلبك...' : 'Loading your application...'}</p>
          ) : (
            <>
              <p>{language === 'ar' ? 'لا يوجد طلب تمويل مسجّل بعد.' : 'You have no financing application yet.'}</p>
              <button
                type="button"
                onClick={() => router.push('/apply')}
                className="px-5 py-2.5 rounded-xl bg-brand-navy text-white text-xs font-bold cursor-pointer"
              >
                {language === 'ar' ? 'قدّم طلب تمويل' : 'Apply for financing'}
              </button>
              <button type="button" onClick={handleLogout} className="text-xs text-text-muted underline cursor-pointer">
                {language === 'ar' ? 'تسجيل الخروج' : 'Log out'}
              </button>
            </>
          )}
        </div>
      </RequireRole>
    );
  }

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
                  <span className="font-bold text-text-primary">{tenure} {t('unit.months')}</span>
                </div>

                <div className="flex justify-between py-1.5">
                  <span className="text-text-muted">{t('portal.monthlyInstallment')}:</span>
                  <span className="font-bold text-brand-navy">~ {formatCurrency(monthlyEst)}</span>
                </div>
              </div>
            </Card>

            {/* My Uploaded Documents */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-bold text-text-primary">{t('portal.myDocuments')}</h3>
                <span className="text-xs text-text-muted">
                  {(myApp.documents || []).length} {language === 'ar' ? 'مستندات' : 'documents'}
                </span>               
              </div>

              <div className="space-y-2.5 text-xs">
                {(myApp.documents || []).map((doc: any) => (
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
