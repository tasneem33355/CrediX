'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Sparkles,
  TrendingUp,
  FilePlus,
  Eye,
  Sliders,
  ShieldCheck,
  Activity,
  Layers,
  Building,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressBar } from '@/components/ui/ProgressBar';

import {
  fetchPortfolioKpis,
  fetchPortfolioConcentration,
  fetchPortfolioDrift,
  runPortfolioStressTest,
  fetchDashboardStats,
  fetchDashboardTrends,
  fetchApplicationsList,
  type PortfolioKpis,
  type PortfolioConcentration,
  type PortfolioDrift,
  type StressTestResult,
} from '@/lib/api';

// Custom Theme-Adaptive Tooltip for Recharts
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    dataKey?: string;
  }>;
  label?: string;
  unit?: string;
}

const ChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, unit }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface/95 backdrop-blur-md border border-border rounded-xl p-3 shadow-fintech-lg text-xs z-50 pointer-events-none min-w-[120px]">
        {label && <p className="font-semibold text-text-primary mb-1">{label}</p>}
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-text-secondary">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: entry.color || '#1B3A5C' }}
              />
              <span className="font-medium text-text-primary">{entry.name || 'Count'}:</span>
            </div>
            <span className="font-bold text-text-primary">
              {entry.value} {unit || ''}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { t, language, formatCurrency, formatNumber, direction } = useLanguage();
  const { user, session } = useAuth();
  const token = session?.access_token;
  const router = useRouter();
  const [dashStats, setDashStats] = useState<{ suspiciousFraud: number; suspiciousAttentionCount: number } | null>(null);
  const [trendData, setTrendData] = useState<{ day: string; count: number }[]>([]);
  const [recentApps, setRecentApps] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    (async () => {
      try {
        const [stats, trends, apps] = await Promise.all([
          fetchDashboardStats(token),
          fetchDashboardTrends(token),
          fetchApplicationsList({ limit: 4 }, token),
        ]);
        if (!isMounted) return;
        if (stats) setDashStats(stats);
        setTrendData(trends);
        setRecentApps(apps as any[]);
      } catch {
        /* keep empty state */
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [token]);
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const officerName = user
    ? language === 'ar'
      ? user.name
      : user.nameEn
    : language === 'ar'
    ? 'محمد سامي'
    : 'Mohamed Sami';

  // Portfolio analytics (computed by the backend from the database)
  const [kpisData, setKpisData] = useState<PortfolioKpis | null>(null);
  const [concentrationData, setConcentrationData] = useState<PortfolioConcentration | null>(null);
  const [driftData, setDriftData] = useState<PortfolioDrift | null>(null);
  const [stressData, setStressData] = useState<StressTestResult | null>(null);

  // Stress test simulator controls
  const [pdMultiplier, setPdMultiplier] = useState(2.0);
  const [lgdMultiplier, setLgdMultiplier] = useState(1.3);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    async function loadPortfolioData() {
      const [kpis, conc, drift, stress] = await Promise.all([
        fetchPortfolioKpis(token),
        fetchPortfolioConcentration(token),
        fetchPortfolioDrift(token),
        runPortfolioStressTest(2.0, 1.3, token),
      ]);
      if (isMounted) {
        setKpisData(kpis);
        setConcentrationData(conc);
        setDriftData(drift);
        setStressData(stress);
      }
    }
    loadPortfolioData();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleRunStressSimulation = async (newPd: number, newLgd: number) => {
    setPdMultiplier(newPd);
    setLgdMultiplier(newLgd);
    const res = await runPortfolioStressTest(newPd, newLgd, token);
    if (res) setStressData(res);
  };

  // Empty values (zeros) when the portfolio has no data; never invented figures.
  const portfolioKpis: PortfolioKpis = kpisData ?? {
    total_loans_count: 0,
    total_portfolio_volume: 0,
    average_loan_size: 0,
    npl_ratio: 0,
    performing_loans_count: 0,
    npl_loans_count: 0,
    has_data: false,
    includes_demo_data: false,
  };
  const portfolioConcentration: PortfolioConcentration = concentrationData ?? {
    by_product: {},
    by_product_volume: {},
    by_status: {},
  };
  const sr = stressData?.scenario_results;
  const stressResult = {
    stressed_ecl: sr?.stressed_ecl ?? 0,
    ecl_delta: sr?.ecl_delta ?? 0,
    stressed_pd: sr?.stressed_pd ?? 0,
    baseline_ecl: sr?.baseline_ecl ?? 0,
    baseline_pd: sr?.baseline_pd ?? 0,
    sensitivity_curve: stressData?.sensitivity_curve ?? [],
  };

  const psiText = driftData?.max_psi_score != null ? driftData.max_psi_score.toFixed(3) : '-';
  const driftBadges = {
    HEALTHY: {
      healthy: true,
      className: 'bg-semantic-success-subtle border-semantic-success/30 text-semantic-success',
      ar: `النموذج مستقر (PSI: ${psiText})`,
      en: `Model Stable (PSI: ${psiText})`,
    },
    MONITOR: {
      healthy: false,
      className: 'bg-semantic-warning-subtle border-semantic-warning/30 text-semantic-warning',
      ar: `النموذج يحتاج مراقبة (PSI: ${psiText})`,
      en: `Model needs monitoring (PSI: ${psiText})`,
    },
    CRITICAL: {
      healthy: false,
      className: 'bg-semantic-error-subtle border-semantic-error/30 text-semantic-error',
      ar: `انحراف حرج، يوصى بإعادة التدريب (PSI: ${psiText})`,
      en: `Critical drift, retraining recommended (PSI: ${psiText})`,
    },
    INSUFFICIENT_DATA: {
      healthy: false,
      className: 'bg-surface-subtle border-border text-text-secondary',
      ar: 'بيانات غير كافية لقياس انحراف النموذج',
      en: 'Not enough data to measure model drift',
    },
  } as const;
  const driftBadge = driftBadges[driftData?.system_health ?? 'INSUFFICIENT_DATA'];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success" dot>{t('status.approved')}</Badge>;
      case 'under_review':
        return <Badge variant="warning" dot>{t('status.underReview')}</Badge>;
      case 'suspicious':
        return <Badge variant="danger" dot>{t('status.suspicious')}</Badge>;
      case 'rejected':
        return <Badge variant="danger" dot>{t('status.rejected')}</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 700) return 'bg-semantic-success-subtle text-semantic-success border-semantic-success/20';
    if (score >= 600) return 'bg-[#E8EEF5] text-brand-navy border-brand-navy/20';
    if (score >= 500) return 'bg-semantic-warning-subtle text-semantic-warning border-semantic-warning/20';
    return 'bg-semantic-error-subtle text-semantic-error border-semantic-error/20';
  };

  // Concentration product data for BarChart
  const concentrationChartData = [
    { type: 'قروض نقدية', typeEn: 'Cash Loans', count: portfolioConcentration.by_product.CASH_LOAN ?? 0 },
    { type: 'قروض سيارات', typeEn: 'Auto Loans', count: portfolioConcentration.by_product.CAR_LOAN ?? 0 },
    { type: 'بطاقات ائتمان', typeEn: 'Credit Cards', count: portfolioConcentration.by_product.CREDIT_CARD ?? 0 },
  ];

  return (
    <AppLayout breadcrumbTitle={t('nav.dashboard')}>
      <div className="space-y-6 pb-6">
        {/* ─── Executive Welcome Banner ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface rounded-2xl p-5 sm:p-6 border border-border shadow-fintech-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                {t('header.welcome')}{' '}
                <span className="text-brand-navy font-extrabold">{officerName}</span>
              </h1>
            </div>
            <p className="text-xs text-text-secondary">
              {language === 'ar'
                ? 'لوحة إدارة ومراقبة محفظة الائتمان الكلية والمؤشرات التنفيذية الموحدة'
                : 'Executive Macro Portfolio Management & Unified Risk Monitoring'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Model Health Drift Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${driftBadge.className}`}>
              {driftBadge.healthy ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
              <span>{language === 'ar' ? driftBadge.ar : driftBadge.en}</span>
            </div>

            <Link href="/apply">
              <Button variant="primary" size="sm" icon={<FilePlus className="w-4 h-4" />}>
                {t('action.newApplication')}
              </Button>
            </Link>
          </div>
        </div>

        {/* ─── 4 Macro Portfolio KPI Cards (from Portfolio Analytics) ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* 1. Total Portfolio Volume */}
          <Card className="p-5 space-y-3 transition-all duration-normal hover:shadow-fintech-md hover:border-brand-navy/40 group">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#E8EEF5] text-brand-navy ring-1 ring-brand-navy/20 flex items-center justify-center transition-transform duration-normal group-hover:scale-105">
                <Building className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">
                {language === 'ar' ? 'إجمالي محفظة التمويل النشطة' : 'Total Active Portfolio Volume'}
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight mt-1">
                {formatCurrency(portfolioKpis.total_portfolio_volume)}
              </p>
              <p className="text-[11px] text-text-muted mt-1">
                {language === 'ar'
                  ? `${portfolioKpis.total_loans_count} تسهيل ائتماني مسجل`
                  : `${portfolioKpis.total_loans_count} registered facilities`}
              </p>
              {portfolioKpis.includes_demo_data && (
                <p className="text-[11px] text-semantic-warning font-medium mt-0.5">
                  {language === 'ar' ? 'تتضمن بيانات تجريبية للعرض' : 'Includes demonstration data'}
                </p>
              )}
            </div>
          </Card>

          {/* 2. NPL Ratio (نسبة التعثر) */}
          <Card className="p-5 space-y-3 transition-all duration-normal hover:shadow-fintech-md hover:border-semantic-warning/30 group">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-semantic-warning-subtle text-semantic-warning ring-1 ring-semantic-warning/20 flex items-center justify-center transition-transform duration-normal group-hover:scale-105">
                <Activity className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-navy bg-[#E8EEF5] px-2 py-0.5 rounded-md border border-brand-navy/20">
                <span>الحد المستهدف &lt; 6.5%</span>
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">
                {language === 'ar' ? 'معدل التعثر في المحفظة (NPL Ratio)' : 'Portfolio NPL Ratio'}
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-semantic-warning tracking-tight mt-1">
                {(portfolioKpis.npl_ratio * 100).toFixed(1)}%
              </p>
              <p className="text-[11px] text-text-muted mt-1">
                {language === 'ar'
                  ? `${portfolioKpis.npl_loans_count} تسهيل متعثر مقابل ${portfolioKpis.performing_loans_count} منتظم`
                  : `${portfolioKpis.npl_loans_count} NPL loans vs ${portfolioKpis.performing_loans_count} performing`}
              </p>
            </div>
          </Card>

          {/* 3. Average Loan Size */}
          <Card className="p-5 space-y-3 transition-all duration-normal hover:shadow-fintech-md hover:border-semantic-success/30 group">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-semantic-success-subtle text-semantic-success ring-1 ring-semantic-success/20 flex items-center justify-center transition-transform duration-normal group-hover:scale-105">
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">
                {language === 'ar' ? 'متوسط حجم التسهيل الائتماني' : 'Average Facility Exposure'}
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight mt-1">
                {formatCurrency(portfolioKpis.average_loan_size)}
              </p>
            </div>
          </Card>

          {/* 4. Suspicious & Fraud Flags */}
          <Card className="p-5 space-y-3 transition-all duration-normal hover:shadow-fintech-md hover:border-semantic-error/30 group">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-semantic-error-subtle text-semantic-error ring-1 ring-semantic-error/20 flex items-center justify-center transition-transform duration-normal group-hover:scale-105">
                <ShieldAlert className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">{t('dashboard.suspiciousFraud')}</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight mt-1">
                {formatNumber(dashStats?.suspiciousFraud ?? 0)}
              </p>
              <p className="text-[11px] text-semantic-error font-medium mt-1">
                {dashStats?.suspiciousAttentionCount ?? 0} {t('dashboard.requireAttention')}
              </p>
            </div>
          </Card>
        </div>

        {/* ─── Macro Portfolio Stress Test Simulator ─── */}
        <Card className="p-6 space-y-6 text-start border-brand-navy/30 bg-surface shadow-fintech-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-brand-navy" />
                <h2 className="text-base font-bold text-text-primary">
                  {language === 'ar'
                    ? 'محاكي اختبارات الضغط الكلية للمحفظة (Macroeconomic Stress Testing)'
                    : 'Macro Portfolio Stress Testing Simulator'}
                </h2>
              </div>
              <p className="text-xs text-text-secondary">
                {language === 'ar'
                  ? 'محاكاة تأثير الصدمات الاقتصادية وصعود الفائدة ومعدلات التعثر على المخصصات ورأس المال'
                  : 'Simulate economic shocks, interest hikes, and default rate multipliers on bank capital'}
              </p>
            </div>

            <Badge variant="neutral">
              {language === 'ar' ? 'متوافق مع معايير IFRS 9' : 'IFRS 9 Compliant'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Controls (5 cols) */}
            <div className="lg:col-span-5 space-y-5 bg-surface-subtle p-4 rounded-xl border border-border">
              {/* PD Multiplier Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>{language === 'ar' ? 'مضاعف التعثر (PD Multiplier):' : 'PD Multiplier:'}</span>
                  <span className="text-brand-navy font-mono text-sm">{pdMultiplier}x</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="3.0"
                  step="0.1"
                  value={pdMultiplier}
                  onChange={(e) => handleRunStressSimulation(parseFloat(e.target.value), lgdMultiplier)}
                  className="w-full accent-brand-navy cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-text-muted">
                  <span>1.0x (طبيعي)</span>
                  <span>2.0x (ركود معتدل)</span>
                  <span>3.0x (أزمة حادة)</span>
                </div>
              </div>

              {/* LGD Multiplier Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>{language === 'ar' ? 'مضاعف فقدان التعافي (LGD Multiplier):' : 'LGD Multiplier:'}</span>
                  <span className="text-brand-navy font-mono text-sm">{lgdMultiplier}x</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="2.0"
                  step="0.05"
                  value={lgdMultiplier}
                  onChange={(e) => handleRunStressSimulation(pdMultiplier, parseFloat(e.target.value))}
                  className="w-full accent-brand-navy cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-text-muted">
                  <span>1.0x (مستقر)</span>
                  <span>1.5x (هبوط ضمانات)</span>
                  <span>2.0x (انهيار سيولة)</span>
                </div>
              </div>
            </div>

            {/* Results Display (7 cols) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#E8EEF5] border border-brand-navy/20 space-y-1">
                <span className="text-[11px] text-text-muted font-medium">الخسارة الائتمانية المضغوطة (Stressed ECL)</span>
                <p className="text-xl font-extrabold text-brand-navy tracking-tight">
                  {formatCurrency(stressResult.stressed_ecl)}
                </p>
                <span className="text-[10px] text-text-secondary">
                  {language === 'ar' ? 'الأساس' : 'Baseline'}: {formatCurrency(stressResult.baseline_ecl)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-semantic-warning-subtle border border-semantic-warning/30 space-y-1">
                <span className="text-[11px] text-semantic-warning font-medium">فارق المخصصات (ECL Delta)</span>
                <p className="text-xl font-extrabold text-semantic-warning tracking-tight">
                  +{formatCurrency(stressResult.ecl_delta)}
                </p>
                <span className="text-[10px] text-text-secondary">مخصصات إضافية مطلوبة</span>
              </div>

              <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-1">
                <span className="text-[11px] text-text-muted font-medium">احتمالية التعثر المضغوطة</span>
                <p className="text-xl font-extrabold text-text-primary tracking-tight">
                  {(stressResult.stressed_pd * 100).toFixed(2)}%
                </p>
                <span className="text-[10px] text-text-secondary">
                  {language === 'ar' ? 'الأساس' : 'Baseline'}: {(stressResult.baseline_pd * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* ─── Charts Row: 30-Day Trend & Product Concentration ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Area Chart (2 Cols on Desktop) */}
          <Card className="lg:col-span-2 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-navy" aria-hidden="true" />
                  <span>{t('dashboard.trendTitle')}</span>
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">{t('dashboard.trendSubtitle')}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-secondary font-medium bg-surface-subtle px-3 py-1 rounded-xl border border-border">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-navy shrink-0" />
                <span>{t('dashboard.incomingRequests')}</span>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="credixAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1B3A5C" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#1B3A5C" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D7E2E8" vertical={false} />
                  <XAxis dataKey="day" stroke="#788A9B" fontSize={11} tickLine={false} axisLine={{ stroke: '#D7E2E8' }} />
                  <YAxis stroke="#788A9B" fontSize={11} tickLine={false} axisLine={{ stroke: '#D7E2E8' }} />
                  <Tooltip content={<ChartTooltip unit={t('unit.items')} />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name={t('dashboard.incomingRequests')}
                    stroke="#1B3A5C"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#credixAreaGradient)"
                    activeDot={{ r: 6, fill: '#1B3A5C', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Product Concentration Bar Chart (1 Col) */}
          <Card className="p-5 sm:p-6 space-y-4 flex flex-col justify-between text-start">
            <div className="pb-2 border-b border-border">
              <h2 className="text-sm sm:text-base font-bold text-text-primary">
                {language === 'ar' ? 'تركز المنتجات التمويلية' : 'Product Concentration'}
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                {language === 'ar' ? 'توزيع التسهيلات في المحفظة' : 'Portfolio facility distribution'}
              </p>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={concentrationChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D7E2E8" vertical={false} />
                  <XAxis dataKey={language === 'ar' ? 'type' : 'typeEn'} stroke="#788A9B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#788A9B" fontSize={11} tickLine={false} />
                  <Tooltip content={<ChartTooltip unit={t('unit.items')} />} />
                  <Bar dataKey="count" fill="#1B3A5C" radius={[8, 8, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-3 border-t border-border">
              {concentrationChartData.map((p) => (
                <div key={p.typeEn} className="bg-surface-subtle p-2 rounded-xl border border-border">
                  <span className="font-bold text-brand-navy">{formatNumber(p.count)}</span>
                  <p className="text-[10px] text-text-muted">{language === 'ar' ? p.type : p.typeEn}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ─── Recent Applications Data Table ─── */}
        <Card className="overflow-hidden shadow-fintech-sm text-start">
          <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-text-primary">
                {t('dashboard.recentApplications')}
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">{t('dashboard.recentSubtitle')}</p>
            </div>
            <Link
              href="/applications"
              className="text-xs font-semibold text-brand-navy hover:text-brand-navy-light flex items-center gap-1 transition-colors group"
            >
              <span>{t('action.viewAll')}</span>
              <Arrow className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start" role="table">
              <thead className="bg-surface-subtle text-text-secondary font-semibold border-b border-border">
                <tr>
                  <th scope="col" className="py-3.5 px-5 text-start">{t('table.appNumber')}</th>
                  <th scope="col" className="py-3.5 px-5 text-start">{t('table.clientName')}</th>
                  <th scope="col" className="py-3.5 px-5 text-start">{t('table.loanType')}</th>
                  <th scope="col" className="py-3.5 px-5 text-start">{t('table.amount')}</th>
                  <th scope="col" className="py-3.5 px-5 text-center">{t('table.creditScore')}</th>
                  <th scope="col" className="py-3.5 px-5 text-center">{t('table.status')}</th>
                  <th scope="col" className="py-3.5 px-5 text-center">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentApps.map((app) => (
                  <tr
                    key={app.id}
                    tabIndex={0}
                    role="link"
                    onClick={() => router.push(`/applications/${app.id}`)}
                    className="hover:bg-surface-subtle/60 transition-colors duration-fast cursor-pointer"
                  >
                    {/* App ID */}
                    <td className="py-3.5 px-5 font-semibold text-brand-navy hover:underline">
                      <Link href={`/applications/${app.id}`} onClick={(e) => e.stopPropagation()}>
                        {app.id}
                      </Link>
                    </td>

                    {/* Applicant */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={language === 'ar' ? app.applicantName : app.applicantNameEn} size="sm" />
                        <div className="min-w-0">
                          <span className="font-semibold text-text-primary block truncate max-w-[140px] sm:max-w-[200px]">
                            {language === 'ar' ? app.applicantName : app.applicantNameEn}
                          </span>
                          <span className="text-[11px] text-text-muted font-mono">{app.nationalId}</span>
                        </div>
                      </div>
                    </td>

                    {/* Loan Type */}
                    <td className="py-3.5 px-5 text-text-secondary">
                      {language === 'ar' ? app.loanTypeLabel : app.loanTypeLabelEn}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-5 font-bold text-text-primary">
                      {formatCurrency(app.requestedAmount)}
                    </td>

                    {/* Credit Score */}
                    <td className="py-3.5 px-5 text-center">
                      {app.creditScore != null ? (
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${getScoreColorClass(app.creditScore)}`}>
                          {app.creditScore}
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-5 text-center">{getStatusBadge(app.status)}</td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/applications/${app.id}`}>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-text-muted hover:text-brand-navy hover:bg-surface-subtle transition-colors"
                          title={t('action.viewDetails')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
