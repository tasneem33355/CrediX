'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Download,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  FilePlus,
  RefreshCw,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { mockApplications } from '@/data/mockData';
import { fetchApplicationsList, deleteApplication } from '@/lib/api';
import { isDemoMode } from '@/lib/config';
import type { ApplicationStatus } from '@/types';

const PAGE_SIZE = 20;

// ─── Skeleton row ──────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-border animate-pulse">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="py-4 px-6">
          <div className="h-3 bg-surface-subtle rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ─── Normalise: backend snake_case → camelCase UI shape ──────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalise(raw: any) {
  return {
    id: raw.id,
    applicantName: raw.applicant_name ?? raw.applicantName ?? '—',
    applicantNameEn: raw.applicant_name_en ?? raw.applicantNameEn ?? raw.applicant_name ?? '—',
    nationalId: raw.national_id ?? raw.nationalId ?? '',
    loanType: raw.loan_type ?? raw.loanType ?? '',
    loanTypeLabel: raw.loan_type_label ?? raw.loanTypeLabel ?? raw.loan_type ?? '',
    loanTypeLabelEn: raw.loan_type_label_en ?? raw.loanTypeLabelEn ?? raw.loan_type ?? '',
    requestedAmount: Number(raw.requested_amount ?? raw.requestedAmount ?? 0),
    creditScore: Number(raw.ai_score ?? raw.credit_score ?? raw.creditScore ?? 0),
    status: (raw.status ?? 'pending') as ApplicationStatus,
    submittedAt: raw.submitted_at ?? raw.submittedAt ?? null,
  };
}

export default function ApplicationsPage() {
  const { t, language, formatCurrency, formatNumber, direction } = useLanguage();
  const { session } = useAuth();
  const token = session?.access_token;

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loanTypeFilter, setLoanTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ArrowPrev = direction === 'rtl' ? ChevronRight : ChevronLeft;
  const ArrowNext = direction === 'rtl' ? ChevronLeft : ChevronRight;

  const skip = (currentPage - 1) * PAGE_SIZE;

  // ── Fetch ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (isDemoMode) {
      // Client-side filter on mock data
      const filtered = mockApplications.filter((app) => {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          !q ||
          app.applicantName.toLowerCase().includes(q) ||
          app.applicantNameEn.toLowerCase().includes(q) ||
          app.id.toLowerCase().includes(q) ||
          app.nationalId.includes(q);
        const matchStatus = statusFilter === 'all' || app.status === statusFilter;
        const matchType = loanTypeFilter === 'all' || app.loanType === loanTypeFilter;
        return matchSearch && matchStatus && matchType;
      });
      const page = filtered.slice(skip, skip + PAGE_SIZE);
      setApps(page.map(normalise));
      setHasMore(filtered.length > skip + PAGE_SIZE);
      setLoading(false);
      return;
    }

    try {
      const data = await fetchApplicationsList(
        {
          skip,
          limit: PAGE_SIZE,
          status: statusFilter,
          loanType: loanTypeFilter,
          search: searchQuery || undefined,
        },
        token
      );
      const normalised = (data as unknown[]).map(normalise);
      setApps(normalised);
      setHasMore(normalised.length === PAGE_SIZE);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ في التحميل';
      setError(msg);
      setApps([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [skip, statusFilter, loanTypeFilter, searchQuery, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (appId: string) => {
    const confirmed = window.confirm(
      language === 'ar'
        ? `هل أنت متأكد من حذف الطلب ${appId} نهائياً؟ سيتم مسح كل بياناته من النظام ولا يمكن التراجع.`
        : `Delete application ${appId} permanently? All its data will be removed and this cannot be undone.`
    );
    if (!confirmed) return;
    setDeletingId(appId);
    try {
      await deleteApplication(appId, token);
      if (apps.length === 1 && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else {
        await load();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : language === 'ar' ? 'تعذر حذف الطلب' : 'Could not delete the application');
    } finally {
      setDeletingId(null);
    }
  };
  
  // Debounce search input → searchQuery
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setCurrentPage(1);
      setSearchQuery(searchInput);
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchInput]);

  // Reset page when filters change
  const handleStatusChange = (val: string) => { setStatusFilter(val); setCurrentPage(1); };
  const handleTypeChange = (val: string) => { setLoanTypeFilter(val); setCurrentPage(1); };

  // ── Status badge ──────────────────────────────────────────────────────
  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'approved':   return <Badge variant="success" dot>{t('status.approved')}</Badge>;
      case 'under_review': return <Badge variant="warning" dot>{t('status.underReview')}</Badge>;
      case 'suspicious': return <Badge variant="danger" dot>{t('status.suspicious')}</Badge>;
      case 'rejected':   return <Badge variant="danger" dot>{t('status.rejected')}</Badge>;
      default:           return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const scoreColor = (s: number) =>
    s >= 80 ? 'bg-semantic-success-subtle text-semantic-success'
    : s >= 60 ? 'bg-[#E8EEF5] text-brand-navy border border-brand-navy/20'
    : s >= 50 ? 'bg-semantic-warning-subtle text-semantic-warning'
    : s > 0   ? 'bg-semantic-error-subtle text-semantic-error'
    : 'bg-surface-subtle text-text-muted';

  return (
    <AppLayout breadcrumbTitle={t('nav.applications')}>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{t('nav.applications')}</h1>
            <p className="text-xs text-text-secondary mt-1">
              {language === 'ar'
                ? 'إدارة ومتابعة جميع طلبات التمويل الواردة'
                : 'Manage and monitor all incoming financing applications'}
            </p>
          </div>
          <Link href="/apply">
            <Button variant="primary" size="sm" icon={<FilePlus className="w-4 h-4" />}>
              {t('action.newApplication')}
            </Button>
          </Link>
        </div>

        {/* ── Filter toolbar ── */}
        <Card className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute inset-y-0 start-3.5 my-auto text-text-muted pointer-events-none" />
              <input
                type="text"
                placeholder={t('header.searchPlaceholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full ps-10 pe-4 py-2 text-xs rounded-xl border border-border bg-surface-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-navy"
              />
            </div>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-navy"
            >
              <option value="all">{t('status.all')}</option>
              <option value="approved">{t('status.approved')}</option>
              <option value="under_review">{t('status.underReview')}</option>
              <option value="suspicious">{t('status.suspicious')}</option>
              <option value="rejected">{t('status.rejected')}</option>
            </select>

            {/* Loan Type */}
            <select
              value={loanTypeFilter}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-navy"
            >
              <option value="all">{t('table.loanType')}</option>
              <option value="personal">{t('loanType.personal')}</option>
              <option value="sme">{t('loanType.sme')}</option>
              <option value="auto">{t('loanType.auto')}</option>
              <option value="mortgage">{t('loanType.mortgage')}</option>
            </select>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              onClick={() => void load()}
            >
              {language === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>

            <Button variant="outline" size="sm" icon={<Filter className="w-3.5 h-3.5" />}>
              {t('action.advancedFilters')}
            </Button>
          </div>
        </Card>

        {/* ── Error banner ── */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-semantic-error-subtle border border-semantic-error/20 text-xs text-semantic-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {language === 'ar' ? 'تعذر الاتصال بالخادم — يُعرض بيانات تجريبية.' : 'Could not reach the server — showing demo data.'}{' '}
              <span className="font-mono text-[10px] opacity-70">{error}</span>
            </span>
          </div>
        )}

        {/* ── Table Card ── */}
        <Card className="overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                {language === 'ar' ? 'كل الطلبات' : 'All Applications'}
                {!loading && (
                  <span className="text-text-muted font-normal ms-1">
                    ({formatNumber(apps.length)} {t('unit.items')})
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-text-muted mt-0.5">
                {isDemoMode
                  ? (language === 'ar' ? 'وضع تجريبي — بيانات محاكاة' : 'Demo mode — simulated data')
                  : t('table.lastUpdated')}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => alert(language === 'ar' ? 'جاري تصدير التقرير...' : 'Exporting report...')}
            >
              {t('action.export')}
            </Button>
          </div>

          {loading ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-subtle text-text-muted font-semibold border-b border-border">
                  <tr>
                    <th className="py-4 px-6 text-start">{t('table.appNumber')}</th>
                    <th className="py-4 px-6 text-start">{t('table.clientName')}</th>
                    <th className="py-4 px-6 text-start">{t('table.loanType')}</th>
                    <th className="py-4 px-6 text-start">{t('table.amount')}</th>
                    <th className="py-4 px-6 text-center">{t('table.creditScore')}</th>
                    <th className="py-4 px-6 text-center">{t('table.status')}</th>
                    <th className="py-4 px-6 text-center">{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...Array(8)].map((_, i) => <SkeletonRow key={i} />)}
                </tbody>
              </table>
            </div>
          ) : apps.length === 0 ? (
            <EmptyState
              title={language === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matching applications'}
              description={language === 'ar' ? 'جرّب تعديل عبارة البحث أو إزالة الفلاتر' : 'Try adjusting search query or clearing filters'}
              actionLabel={t('action.clear')}
              onAction={() => { setSearchInput(''); setSearchQuery(''); setStatusFilter('all'); setLoanTypeFilter('all'); setCurrentPage(1); }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-surface-subtle text-text-muted font-semibold border-b border-border">
                  <tr>
                    <th className="py-4 px-6 text-start">{t('table.appNumber')}</th>
                    <th className="py-4 px-6 text-start">{t('table.clientName')}</th>
                    <th className="py-4 px-6 text-start">{t('table.loanType')}</th>
                    <th className="py-4 px-6 text-start">{t('table.amount')}</th>
                    <th className="py-4 px-6 text-center">{t('table.creditScore')}</th>
                    <th className="py-4 px-6 text-center">{t('table.status')}</th>
                    <th className="py-4 px-6 text-center">{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {apps.map((app) => (
                    <tr key={app.id} className="hover:bg-surface-subtle/60 transition-colors group">
                      <td className="py-4 px-6 font-semibold text-brand-navy">
                        <Link href={`/applications/${app.id}`} className="hover:underline">
                          {app.id}
                        </Link>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-surface-subtle text-text-primary font-bold flex items-center justify-center text-xs border border-border">
                            {(language === 'ar' ? app.applicantName : app.applicantNameEn).slice(0, 1)}
                          </div>
                          <div>
                            <span className="font-semibold text-text-primary block">
                              {language === 'ar' ? app.applicantName : app.applicantNameEn}
                            </span>
                            <span className="text-[11px] text-text-muted font-mono">{app.nationalId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-text-secondary">
                        {language === 'ar' ? app.loanTypeLabel : app.loanTypeLabelEn}
                      </td>
                      <td className="py-4 px-6 font-bold text-text-primary">
                        {formatCurrency(app.requestedAmount)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {app.creditScore > 0 ? (
                          <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${scoreColor(app.creditScore)}`}>
                            {app.creditScore}
                          </span>
                        ) : (
                          <span className="text-text-muted text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">{getStatusBadge(app.status)}</td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Link href={`/applications/${app.id}`}>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4 text-text-muted" />
                            </Button>
                          </Link>
                          {!isDemoMode && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(app.id)}
                              disabled={deletingId === app.id}
                              title={language === 'ar' ? 'حذف الطلب' : 'Delete application'}
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination ── */}
          <div className="p-4 border-t border-border flex items-center justify-between text-xs text-text-secondary">
            <span>
              {language === 'ar'
                ? `صفحة ${formatNumber(currentPage)} — ${formatNumber(apps.length)} نتيجة`
                : `Page ${formatNumber(currentPage)} — ${formatNumber(apps.length)} results`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-border hover:bg-surface-subtle disabled:opacity-40 cursor-pointer"
              >
                <ArrowPrev className="w-3.5 h-3.5" />
              </button>
              <button className="w-7 h-7 rounded-lg bg-brand-navy text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {currentPage}
              </button>
              {hasMore && (
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="w-7 h-7 rounded-lg border border-border hover:bg-surface-subtle text-text-primary text-xs flex items-center justify-center cursor-pointer"
                >
                  {currentPage + 1}
                </button>
              )}
              <button
                disabled={!hasMore || loading}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-border hover:bg-surface-subtle disabled:opacity-40 cursor-pointer"
              >
                <ArrowNext className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
