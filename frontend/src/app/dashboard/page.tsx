'use client';

import React, { useState } from 'react';
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
  MoreHorizontal,
  ChevronDown,
  Sparkles,
  TrendingUp,
  FilePlus,
  Eye,
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
} from 'recharts';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import {
  mockDashboardStats,
  mockTrendData,
  mockStatusDonutData,
  mockLoanTypeData,
  mockApplications,
} from '@/data/mockData';

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
  const { user } = useAuth();
  const router = useRouter();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'month' | 'quarter' | 'year'>('month');

  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const officerName = user
    ? language === 'ar'
      ? user.name
      : user.nameEn
    : language === 'ar'
      ? 'محمد سامي'
      : 'Mohamed Sami';

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
    if (score >= 80) return 'bg-semantic-success-subtle text-semantic-success border-semantic-success/20';
    if (score >= 60) return 'bg-[#E8EEF5] text-brand-navy border-brand-navy/20';
    if (score >= 50) return 'bg-semantic-warning-subtle text-semantic-warning border-semantic-warning/20';
    return 'bg-semantic-error-subtle text-semantic-error border-semantic-error/20';
  };

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
            <p className="text-xs text-text-secondary">{t('dashboard.overviewSubtitle')}</p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link href="/apply">
              <Button variant="primary" size="sm" icon={<FilePlus className="w-4 h-4" />}>
                {t('action.newApplication')}
              </Button>
            </Link>
            <Link href="/applications">
              <Button variant="outline" size="sm" icon={<Arrow className="w-4 h-4" />}>
                {t('action.viewAll')}
              </Button>
            </Link>
          </div>
        </div>

        {/* ─── 4 Restrained Fintech KPI Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* 1. Total Applications */}
          <Card className="p-5 space-y-3 transition-all duration-normal hover:shadow-fintech-md hover:border-brand-navy/40 group">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#E8EEF5] text-brand-navy ring-1 ring-brand-navy/20 flex items-center justify-center transition-transform duration-normal group-hover:scale-105">
                <FileText className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-semantic-success bg-semantic-success-subtle px-2 py-0.5 rounded-md border border-semantic-success/20">
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                <span>+{mockDashboardStats.totalGrowth}%</span>
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">{t('dashboard.totalApplications')}</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight mt-1">
                {formatNumber(mockDashboardStats.totalApplications)}
              </p>
              <p className="text-[11px] text-text-muted mt-1">
                {t('dashboard.fromLastMonth')}
              </p>
            </div>
          </Card>

          {/* 2. Approval Rate */}
          <Card className="p-5 space-y-3 transition-all duration-normal hover:shadow-fintech-md hover:border-semantic-success/30 group">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-semantic-success-subtle text-semantic-success ring-1 ring-semantic-success/20 flex items-center justify-center transition-transform duration-normal group-hover:scale-105">
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-semantic-success bg-semantic-success-subtle px-2 py-0.5 rounded-md border border-semantic-success/20">
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                <span>+{mockDashboardStats.approvalGrowth}%</span>
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">{t('dashboard.approvalRate')}</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight mt-1">
                {mockDashboardStats.approvalRate}%
              </p>
              <p className="text-[11px] text-text-muted mt-1">
                {t('dashboard.fromLastMonth')}
              </p>
            </div>
          </Card>

          {/* 3. Under Review */}
          <Card className="p-5 space-y-3 transition-all duration-normal hover:shadow-fintech-md hover:border-semantic-warning/30 group">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-semantic-warning-subtle text-semantic-warning ring-1 ring-semantic-warning/20 flex items-center justify-center transition-transform duration-normal group-hover:scale-105">
                <Clock className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-semantic-warning bg-semantic-warning-subtle px-2 py-0.5 rounded-md border border-semantic-warning/20">
                <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{mockDashboardStats.underReviewChange}%</span>
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">{t('dashboard.underReview')}</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight mt-1">
                {formatNumber(mockDashboardStats.underReview)}
              </p>
              <p className="text-[11px] text-text-muted mt-1">
                {t('dashboard.fromLastMonth')}
              </p>
            </div>
          </Card>

          {/* 4. Suspicious Fraud */}
          <Card className="p-5 space-y-3 transition-all duration-normal hover:shadow-fintech-md hover:border-semantic-error/30 group">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-semantic-error-subtle text-semantic-error ring-1 ring-semantic-error/20 flex items-center justify-center transition-transform duration-normal group-hover:scale-105">
                <ShieldAlert className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-semantic-error bg-semantic-error-subtle px-2 py-0.5 rounded-md border border-semantic-error/20">
                <span className="w-1.5 h-1.5 rounded-full bg-semantic-error animate-pulse" aria-hidden="true" />
                <span>{mockDashboardStats.suspiciousAttentionCount}</span>
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">{t('dashboard.suspiciousFraud')}</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight mt-1">
                {formatNumber(mockDashboardStats.suspiciousFraud)}
              </p>
              <p className="text-[11px] text-semantic-error font-medium mt-1">
                {mockDashboardStats.suspiciousAttentionCount} {t('dashboard.requireAttention')}
              </p>
            </div>
          </Card>
        </div>

        {/* ─── Charts Row 1: 30-Day Trend & Status Breakdown ─── */}
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
                <AreaChart data={mockTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="credixAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1B3A5C" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#1B3A5C" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D7E2E8" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="#788A9B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#D7E2E8' }}
                  />
                  <YAxis
                    stroke="#788A9B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#D7E2E8' }}
                  />
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

          {/* Status Donut Chart (1 Col on Desktop) */}
          <Card className="p-5 sm:p-6 space-y-4 flex flex-col justify-between">
            <div className="pb-2 border-b border-border">
              <h2 className="text-sm sm:text-base font-bold text-text-primary">
                {t('dashboard.statusDistribution')}
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">{t('dashboard.statusDistributionSubtitle')}</p>
            </div>

            <div className="relative h-48 w-full flex items-center justify-center my-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockStatusDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {mockStatusDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip unit="%" />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-extrabold text-text-primary tracking-tight">
                  {formatNumber(mockDashboardStats.totalApplications)}
                </span>
                <span className="text-[11px] font-medium text-text-muted">{t('unit.items')}</span>
              </div>
            </div>

            {/* Clean Segmented Legend */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-3 border-t border-border">
              {mockStatusDonutData.map((item) => (
                <div key={item.name} className="space-y-1 bg-surface-subtle/60 rounded-xl p-2 border border-border/50">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-bold text-text-primary">{item.value}%</span>
                  </div>
                  <p className="text-[11px] text-text-secondary truncate">
                    {language === 'ar' ? item.name : item.nameEn}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ─── Bar Chart: Financing by Type ─── */}
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-text-primary">
                {t('dashboard.byLoanType')}
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">{t('dashboard.byLoanTypeSubtitle')}</p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border bg-surface text-text-primary">
              <span>{t('dashboard.thisMonth')}</span>
            </div>
          </div>

          <div className="h-60 sm:h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockLoanTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D7E2E8" vertical={false} />
                <XAxis
                  dataKey={language === 'ar' ? 'type' : 'typeEn'}
                  stroke="#788A9B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#D7E2E8' }}
                />
                <YAxis
                  stroke="#788A9B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#D7E2E8' }}
                />
                <Tooltip content={<ChartTooltip unit={t('unit.items')} />} />
                <Bar
                  dataKey="count"
                  name={t('dashboard.byLoanType')}
                  fill="#1B3A5C"
                  radius={[8, 8, 0, 0]}
                  barSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ─── Recent Applications Data Table ─── */}
        <Card className="overflow-hidden shadow-fintech-sm">
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
                {mockApplications.slice(0, 4).map((app) => (
                  <tr
                    key={app.id}
                    tabIndex={0}
                    role="link"
                    aria-label={`View application ${app.id} for ${language === 'ar' ? app.applicantName : app.applicantNameEn}`}
                    onClick={() => router.push(`/applications/${app.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/applications/${app.id}`);
                      }
                    }}
                    className="hover:bg-surface-subtle/60 transition-colors duration-fast cursor-pointer focus:outline-none focus-visible:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy/30 group"
                  >
                    {/* App ID */}
                    <td className="py-3.5 px-5 font-semibold text-brand-navy hover:underline transition-colors">
                      <Link
                        href={`/applications/${app.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline focus:outline-none focus-visible:underline"
                      >
                        {app.id}
                      </Link>
                    </td>

                    {/* Applicant */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          name={language === 'ar' ? app.applicantName : app.applicantNameEn}
                          size="sm"
                        />
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
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${getScoreColorClass(app.creditScore)}`}>
                        {app.creditScore}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-5 text-center">{getStatusBadge(app.status)}</td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/applications/${app.id}`}>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-text-muted hover:text-brand-navy hover:bg-surface-subtle transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 cursor-pointer"
                          aria-label={`${t('action.viewDetails')} ${app.id}`}
                          title={t('action.viewDetails')}
                        >
                          <Eye className="w-4 h-4" aria-hidden="true" />
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
