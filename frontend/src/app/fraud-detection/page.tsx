'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { mockApplications } from '@/data/mockData';

export default function FraudDetectionPage() {
  const { t, language, direction } = useLanguage();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const fraudCases = [
    {
      id: 'APP-2026-0839',
      clientName: 'أحمد فؤاد',
      clientNameEn: 'Ahmed Fouad',
      initial: 'أ',
      type: 'تمويل مشروعات صغيرة',
      typeEn: 'SME Financing',
      severity: 'high',
      severityLabel: 'مرتفع',
      severityLabelEn: 'High',
      confidence: 94,
      mismatch: 'تناقض في البيانات المالية (الدخل المعلن vs كشف الحساب)',
      mismatchEn: 'Financial Data Discrepancy (Declared vs Bank Statement)',
    },
    {
      id: 'APP-2026-0832',
      clientName: 'نورهان عادل',
      clientNameEn: 'Nourhan Adel',
      initial: 'ن',
      type: 'تمويل سيارات',
      typeEn: 'Auto Financing',
      severity: 'medium',
      severityLabel: 'متوسط',
      severityLabelEn: 'Medium',
      confidence: 78,
      mismatch: 'تناقض في البيانات المالية وسجل الائتمان i-Score',
      mismatchEn: 'Discrepancy in financial records and i-Score history',
    },
    {
      id: 'APP-2026-0839-DUP',
      clientName: 'أحمد فؤاد',
      clientNameEn: 'Ahmed Fouad',
      initial: 'أ',
      type: 'تمويل مشروعات صغيرة',
      typeEn: 'SME Financing',
      severity: 'medium',
      severityLabel: 'متوسط',
      severityLabelEn: 'Medium',
      confidence: 78,
      mismatch: 'تطابق رقم هاتف وسجل تجاري مع طلب مرفوض سابقاً',
      mismatchEn: 'Matched phone and registry number with previously rejected case',
    },
    {
      id: 'APP-2026-0838',
      clientName: 'مريم وائل',
      clientNameEn: 'Maryam Wael',
      initial: 'م',
      type: 'تمويل عقاري',
      typeEn: 'Mortgage Financing',
      severity: 'medium',
      severityLabel: 'متوسط',
      severityLabelEn: 'Medium',
      confidence: 78,
      mismatch: 'تناقض في تقييم عقد الوحدة العقارية المرفقة',
      mismatchEn: 'Valuation discrepancy in attached real estate contract',
    },
    {
      id: 'APP-2026-0835',
      clientName: 'يوسف خالد',
      clientNameEn: 'Youssef Khaled',
      initial: 'ي',
      type: 'تمويل شخصي',
      typeEn: 'Personal Financing',
      severity: 'medium',
      severityLabel: 'متوسط',
      severityLabelEn: 'Medium',
      confidence: 78,
      mismatch: 'تحركات بنكية غير اعتيادية قبل تقديم الطلب مباشرة',
      mismatchEn: 'Unusual rapid turnover spikes right before submission',
    },
  ];

  return (
    <AppLayout breadcrumbTitle={t('nav.fraudDetection')}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {t('nav.fraudDetection')}
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              {language === 'ar'
                ? 'مراقبة الحالات المشبوهة التي تحتاج إلى انتباهك'
                : 'Monitor suspicious cases requiring your review and attention'}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-semantic-error-subtle border border-semantic-error/30 text-semantic-error text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-semantic-error" />
            <span>
              {t('risk.highRiskCasesBadge')} 3
            </span>
          </div>
        </div>

        {/* Fraud Cases Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fraudCases.map((c, idx) => (
            <Card key={idx} className="p-6 space-y-4 hover:border-border-strong transition-all flex flex-col justify-between">
              <div className="space-y-4">
                {/* Card Top: Severity Badge and Menu */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      c.severity === 'high'
                        ? 'bg-semantic-error-subtle text-semantic-error'
                        : 'bg-semantic-warning-subtle text-semantic-warning'
                    }`}
                  >
                    {language === 'ar' ? c.severityLabel : c.severityLabelEn}
                  </span>

                  <button className="text-text-muted hover:text-text-primary cursor-pointer">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* Client Avatar & Name */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-surface-subtle text-text-primary font-bold flex items-center justify-center text-sm shrink-0 border border-border">
                    {c.initial}
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-text-primary">
                      {language === 'ar' ? c.clientName : c.clientNameEn}
                    </h3>
                    <p className="text-[11px] text-text-muted font-mono">
                      {language === 'ar' ? c.type : c.typeEn} • {c.id}
                    </p>
                  </div>
                </div>

                {/* Mismatch Alert Box */}
                <div className="p-3 bg-semantic-warning-subtle rounded-xl border border-semantic-warning/30 flex items-start gap-2.5 text-xs text-semantic-warning">
                  <AlertTriangle className="w-4 h-4 text-semantic-warning shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">
                    {language === 'ar' ? c.mismatch : c.mismatchEn}
                  </span>
                </div>
              </div>

              {/* Card Footer: Model Confidence & View Application Link */}
              <div className="pt-4 border-t border-border flex items-center justify-between text-xs">
                <span className="text-text-muted font-medium">
                  {c.confidence}% {language === 'ar' ? 'ثقة النموذج' : 'Model Confidence'}
                </span>

                <Link
                  href={`/applications/${c.id.replace('-DUP', '')}`}
                  className="font-semibold text-brand-navy hover:text-brand-navy-light flex items-center gap-1 group transition-colors"
                >
                  <span>{t('action.viewApplication')}</span>
                  <Arrow className="w-3.5 h-3.5 group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
