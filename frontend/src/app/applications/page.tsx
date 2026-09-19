'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Download,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  FilePlus,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { mockApplications } from '@/data/mockData';
import { ApplicationStatus } from '@/types';

export default function ApplicationsPage() {
  const { t, language, formatCurrency, formatNumber, direction } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loanTypeFilter, setLoanTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const ArrowPrev = direction === 'rtl' ? ChevronRight : ChevronLeft;
  const ArrowNext = direction === 'rtl' ? ChevronLeft : ChevronRight;

  // Filter logic
  const filteredApps = mockApplications.filter((app) => {
    const matchesSearch =
      app.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.applicantNameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.nationalId.includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesType = loanTypeFilter === 'all' || app.loanType === loanTypeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: ApplicationStatus) => {
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

  return (
    <AppLayout breadcrumbTitle={t('nav.applications')}>
      <div className="space-y-6">
        {/* Header with Title and "New Application" button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {t('nav.applications')}
            </h1>
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

        {/* Filter Toolbar */}
        <Card className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute inset-y-0 start-3.5 my-auto text-text-muted pointer-events-none" />
              <input
                type="text"
                placeholder={t('header.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full ps-10 pe-4 py-2 text-xs rounded-xl border border-border bg-surface-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-navy"
              />
            </div>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-navy"
            >
              <option value="all">{t('status.all')}</option>
              <option value="approved">{t('status.approved')}</option>
              <option value="under_review">{t('status.underReview')}</option>
              <option value="suspicious">{t('status.suspicious')}</option>
              <option value="rejected">{t('status.rejected')}</option>
            </select>

            {/* Loan Type Dropdown */}
            <select
              value={loanTypeFilter}
              onChange={(e) => setLoanTypeFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-navy"
            >
              <option value="all">{t('table.loanType')}</option>
              <option value="personal">{t('loanType.personal')}</option>
              <option value="sme">{t('loanType.sme')}</option>
              <option value="auto">{t('loanType.auto')}</option>
              <option value="mortgage">{t('loanType.mortgage')}</option>
            </select>

            {/* Date Range Button */}
            <button className="px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text-secondary hover:bg-surface-subtle transition-colors cursor-pointer">
              {t('unit.last30days')}
            </button>

            {/* Advanced Filters Button */}
            <Button variant="outline" size="sm" icon={<Filter className="w-3.5 h-3.5" />}>
              {t('action.advancedFilters')}
            </Button>
          </div>
        </Card>

        {/* Applications List Table Card */}
        <Card className="overflow-hidden">
          {/* Subheader with Total Count and Export */}
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                {language === 'ar' ? 'كل الطلبات' : 'All Applications'}{' '}
                <span className="text-text-muted font-normal">({formatNumber(filteredApps.length)} {t('unit.items')})</span>
              </h3>
              <p className="text-[11px] text-text-muted mt-0.5">
                {t('table.lastUpdated')}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => alert(language === 'ar' ? 'جاري تصدير التقرير بتنسيق Excel/CSV...' : 'Exporting Excel/CSV report...')}
            >
              {t('action.export')}
            </Button>
          </div>

          {filteredApps.length === 0 ? (
            <EmptyState
              title={language === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matching applications'}
              description={language === 'ar' ? 'جرّب تعديل عبارة البحث أو إزالة الفلاتر المحددة' : 'Try adjusting search query or clearing filters'}
              actionLabel={t('action.clear')}
              onAction={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setLoanTypeFilter('all');
              }}
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
                  {filteredApps.map((app) => (
                    <tr
                      key={app.id}
                      className="hover:bg-surface-subtle/60 transition-colors group"
                    >
                      <td className="py-4 px-6 font-semibold text-brand-navy hover:underline">
                        <Link href={`/applications/${app.id}`} className="hover:underline">
                          {app.id}
                        </Link>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-surface-subtle text-text-primary font-bold flex items-center justify-center text-xs border border-border">
                            {app.applicantName.slice(0, 1)}
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
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                            app.creditScore >= 80
                              ? 'bg-semantic-success-subtle text-semantic-success'
                              : app.creditScore >= 60
                              ? 'bg-[#E8EEF5] text-brand-navy border border-brand-navy/20'
                              : app.creditScore >= 50
                              ? 'bg-semantic-warning-subtle text-semantic-warning'
                              : 'bg-semantic-error-subtle text-semantic-error'
                          }`}
                        >
                          {app.creditScore}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">{getStatusBadge(app.status)}</td>
                      <td className="py-4 px-6 text-center">
                        <Link href={`/applications/${app.id}`}>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4 text-text-muted" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="p-4 border-t border-border flex items-center justify-between text-xs text-text-secondary">
            <span>
              {language === 'ar'
                ? `عرض 1 - ${filteredApps.length} من أصل 1,248`
                : `Showing 1 - ${filteredApps.length} of 1,248`}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-border hover:bg-surface-subtle disabled:opacity-40 cursor-pointer"
              >
                <ArrowPrev className="w-3.5 h-3.5" />
              </button>
              <button className="w-7 h-7 rounded-lg bg-brand-navy text-white font-bold text-xs flex items-center justify-center shadow-xs">
                1
              </button>
              <button className="w-7 h-7 rounded-lg border border-border hover:bg-surface-subtle text-text-primary text-xs flex items-center justify-center cursor-pointer">
                2
              </button>
              <button className="w-7 h-7 rounded-lg border border-border hover:bg-surface-subtle text-text-primary text-xs flex items-center justify-center cursor-pointer">
                3
              </button>
              <span className="px-1 text-text-muted">...</span>
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-border hover:bg-surface-subtle cursor-pointer"
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
