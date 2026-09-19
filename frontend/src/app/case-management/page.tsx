'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Plus,
  MoreHorizontal,
  FilePlus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Sparkles,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { mockCaseCards } from '@/data/mockData';
import { CaseCard } from '@/types';

export default function CaseManagementPage() {
  const { t, language, formatCurrency } = useLanguage();
  const [cases, setCases] = useState<CaseCard[]>(mockCaseCards);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newStage, setNewStage] = useState('استخراج البيانات');

  // Summary Metrics
  const totalAmount = cases.reduce((sum, c) => sum + c.amount, 0);
  const reviewCount = cases.filter((c) => c.columnId === 'human_review').length;
  const completedCount = cases.filter((c) => c.columnId === 'completed').length;

  const columns = [
    {
      id: 'processing',
      title: t('cases.underProcessing'),
      count: cases.filter((c) => c.columnId === 'processing').length,
      icon: Clock,
    },
    {
      id: 'human_review',
      title: t('cases.humanReview'),
      count: cases.filter((c) => c.columnId === 'human_review').length,
      icon: AlertTriangle,
    },
    {
      id: 'completed',
      title: t('cases.completed'),
      count: cases.filter((c) => c.columnId === 'completed').length,
      icon: CheckCircle2,
    },
  ];

  const getStageBadgeProps = (stageTag: string) => {
    switch (stageTag) {
      case 'إشارة احتيال':
      case 'Fraud Flag':
        return {
          bg: 'bg-[#FEE2E2] text-[#991B1B] border-[#F87171]',
          icon: <AlertTriangle className="w-3 h-3 text-[#DC2626] shrink-0" />,
        };
      case 'تم الاعتماد':
      case 'Approved':
        return {
          bg: 'bg-[#DCFCE7] text-[#14532D] border-[#4ADE80]',
          icon: <CheckCircle2 className="w-3 h-3 text-[#16A34A] shrink-0" />,
        };
      case 'درجة ائتمانية':
      case 'Credit Score':
        return {
          bg: 'bg-[#F3E8FF] text-[#581C87] border-[#C084FC]',
          icon: <Sparkles className="w-3 h-3 text-[#9333EA] shrink-0" />,
        };
      case 'تقييم المستندات':
      case 'Document Evaluation':
        return {
          bg: 'bg-[#FEF3C7] text-[#78350F] border-[#FBBF24]',
          icon: <FileText className="w-3 h-3 text-[#D97706] shrink-0" />,
        };
      case 'استخراج البيانات':
      case 'Data Extraction':
      default:
        return {
          bg: 'bg-[#E0F2FE] text-[#075985] border-[#38BDF8]',
          icon: <Clock className="w-3 h-3 text-[#0284C7] shrink-0" />,
        };
    }
  };

  const getClientInitials = (c: CaseCard, lang: string) => {
    if (lang === 'en') {
      const nameEn = c.clientNameEn || c.clientName;
      const parts = nameEn.trim().split(/\s+/);
      if (parts.length >= 2 && parts[0] && parts[1]) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return nameEn.slice(0, 2).toUpperCase();
    }
    // Arabic mode
    if (c.initials) return c.initials;
    const nameAr = c.clientName || '';
    return nameAr.trim().slice(0, 1) || 'ع';
  };

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newAmount) return;

    const newCase: CaseCard = {
      id: `case_${Date.now()}`,
      applicationId: `APP-2026-0${Math.floor(Math.random() * 800 + 100)}`,
      clientName: newClientName,
      clientNameEn: newClientName,
      initials: newClientName.trim().slice(0, 1) || 'ع',
      amount: parseFloat(newAmount) || 100000,
      currency: 'ج.م',
      stageTag: newStage,
      stageTagEn: newStage,
      columnId: 'processing',
    };

    setCases((prev) => [newCase, ...prev]);
    setIsCreateModalOpen(false);
    setNewClientName('');
    setNewAmount('');
  };

  const moveCase = (caseId: string, targetCol: 'processing' | 'human_review' | 'completed') => {
    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, columnId: targetCol } : c))
    );
  };

  return (
    <AppLayout breadcrumbTitle={t('nav.caseManagement')}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {t('cases.title')}
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              {t('cases.subtitle')}
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            icon={<FilePlus className="w-4 h-4" />}
          >
            {t('action.createCase')}
          </Button>
        </div>

        {/* Top Summary Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-3.5 px-4 flex items-center gap-3.5 border border-border bg-surface">
            <div className="w-10 h-10 rounded-xl bg-[#E8EEF5] text-brand-navy flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-text-muted font-medium">{t('cases.totalCases')}</p>
              <p className="text-base font-extrabold text-text-primary mt-0.5">
                {cases.length} {language === 'ar' ? 'حالات' : 'Cases'}
              </p>
            </div>
          </Card>

          <Card className="p-3.5 px-4 flex items-center gap-3.5 border border-border bg-surface">
            <div className="w-10 h-10 rounded-xl bg-[#E8EEF5] text-brand-navy flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-text-muted font-medium">{t('cases.humanReview')}</p>
              <p className="text-base font-extrabold text-text-primary mt-0.5">
                {reviewCount} {language === 'ar' ? 'حالة فحص' : 'Under Review'}
              </p>
            </div>
          </Card>

          <Card className="p-3.5 px-4 flex items-center gap-3.5 border border-border bg-surface">
            <div className="w-10 h-10 rounded-xl bg-[#E8EEF5] text-brand-navy flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-text-muted font-medium">{t('cases.totalVolume')}</p>
              <p className="text-base font-extrabold text-brand-navy mt-0.5">{formatCurrency(totalAmount)}</p>
            </div>
          </Card>
        </div>

        {/* 3 Kanban Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {columns.map((col) => {
            const columnCases = cases.filter((c) => c.columnId === col.id);
            const ColumnIcon = col.icon;

            return (
              <div key={col.id} className="space-y-4">
                {/* Column Header */}
                <div className="flex items-center justify-between p-3 px-3.5 rounded-2xl bg-surface border border-border">
                  <div className="flex items-center gap-2">
                    <ColumnIcon className="w-4 h-4 text-text-secondary" />
                    <span className="text-xs font-bold text-text-primary">
                      {col.title}
                    </span>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-surface-subtle text-text-primary text-xs font-bold flex items-center justify-center border border-border">
                    {col.count}
                  </span>
                </div>

                {/* Cases List */}
                <div className="space-y-3">
                  {columnCases.map((c) => {
                    const badgeProps = getStageBadgeProps(c.stageTag);
                    const clientInitials = getClientInitials(c, language);

                    return (
                      <Card
                        key={c.id}
                        className="p-4 space-y-3.5 hover:border-brand-navy/30 hover:shadow-md transition-all text-start group bg-surface border border-border/80 rounded-2xl relative"
                      >
                        {/* Card Top */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs bg-[#E8EEF5] text-brand-navy border border-border shrink-0 shadow-2xs">
                              {clientInitials}
                            </div>
                            <div>
                              <Link
                                href={`/applications/${c.applicationId}`}
                                className="text-xs font-bold text-text-primary hover:text-brand-navy transition-colors block"
                              >
                                {language === 'ar' ? c.clientName : c.clientNameEn}
                              </Link>
                              <span className="text-[10px] text-text-muted font-mono bg-surface-subtle px-1.5 py-0.2 rounded border border-border/60">
                                {c.applicationId}
                              </span>
                            </div>
                          </div>

                          <Link
                            href={`/applications/${c.applicationId}`}
                            className="p-1 rounded-lg text-text-muted hover:text-brand-navy hover:bg-surface-subtle transition-colors cursor-pointer"
                            title={language === 'ar' ? 'عرض تفاصيل الطلب' : 'View Application Details'}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Link>
                        </div>

                        {/* Loan Amount */}
                        <div className="text-lg font-black text-brand-navy tracking-tight">
                          {formatCurrency(c.amount)}
                        </div>

                        {/* Stage Tag & Always-Visible Quick Actions */}
                        <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs">
                          {/* Stage Tag with Color & Icon */}
                          <span
                            className={clsx(
                              'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md border shadow-2xs',
                              badgeProps.bg
                            )}
                          >
                            {badgeProps.icon}
                            <span>{language === 'ar' ? c.stageTag : c.stageTagEn}</span>
                          </span>

                          {/* Quick Column Move Actions (Solid & Completely Opaque) */}
                          <div className="flex items-center gap-1.5">
                            {col.id !== 'processing' && (
                              <button
                                onClick={() => moveCase(c.id, 'processing')}
                                title={language === 'ar' ? 'إعادة إلى قيد المعالجة' : 'Move to Under Processing'}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#0284C7] text-white hover:bg-[#0369A1] transition-all cursor-pointer active:scale-95 shadow-xs"
                              >
                                <Clock className="w-3 h-3 text-white" />
                                <span>{col.id === 'completed' ? t('cases.reopenAction') : t('cases.processAction')}</span>
                              </button>
                            )}
                            {col.id !== 'human_review' && (
                              <button
                                onClick={() => moveCase(c.id, 'human_review')}
                                title={language === 'ar' ? 'نقل للمراجعة البشرية' : 'Move to Human Review'}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#D97706] text-white hover:bg-[#B45309] transition-all cursor-pointer active:scale-95 shadow-xs"
                              >
                                <AlertTriangle className="w-3 h-3 text-white" />
                                <span>{t('cases.reviewAction')}</span>
                              </button>
                            )}
                            {col.id !== 'completed' && (
                              <button
                                onClick={() => moveCase(c.id, 'completed')}
                                title={language === 'ar' ? 'اعتماد ونقل إلى مكتملة' : 'Approve & Complete'}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#16A34A] text-white hover:bg-[#15803D] transition-all cursor-pointer active:scale-95 shadow-xs"
                              >
                                <CheckCircle2 className="w-3 h-3 text-white" />
                                <span>{t('cases.approveAction')}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Create Case Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title={t('action.createCase')}
          description="إضافة حالة تمويل جديدة إلى جدول العمليات والمتابعة"
        >
          <form onSubmit={handleCreateCase} className="space-y-4 text-start">
            <Input
              label={language === 'ar' ? 'اسم العميل' : 'Client Name'}
              placeholder={language === 'ar' ? 'مثال: كريم محمد' : 'e.g. Karim Mohamed'}
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              required
            />
            <Input
              label={language === 'ar' ? 'مبلغ التمويل المطلوب (ج.م)' : 'Requested Amount (EGP)'}
              type="number"
              placeholder="350000"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              required
            />
            <Select
              label={language === 'ar' ? 'المرحلة الأولية' : 'Initial Stage'}
              value={newStage}
              onChange={(e) => setNewStage(e.target.value)}
              options={[
                { value: 'استخراج البيانات', label: 'استخراج البيانات بالـ OCR' },
                { value: 'تقييم المستندات', label: 'تقييم المستندات والائتمان' },
                { value: 'إشارة احتيال', label: 'فحص إشارات الاحتيال' },
              ]}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                {t('action.cancel')}
              </Button>
              <Button type="submit" variant="primary">
                {t('action.save')}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
