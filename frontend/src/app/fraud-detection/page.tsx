'use client';

import React, { useEffect, useState } from 'react';
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
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { fetchFraudCases, type FraudCase } from '@/lib/api';

export default function FraudDetectionPage() {
  const { t, language, direction } = useLanguage();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const { session } = useAuth();
  const token = session?.access_token;
  const [fraudCases, setFraudCases] = useState<FraudCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetchFraudCases(token)
      .then((data) => { if (!cancelled) setFraudCases(data); })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const highRiskCount = fraudCases.filter((c) => c.severity === 'high' || c.severity === 'critical').length;

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
              {t('risk.highRiskCasesBadge')} {highRiskCount}
            </span>
          </div>
        </div>

        {/* Fraud Cases Cards Grid */}
        {loading ? (
          <p className="text-xs text-text-muted text-center py-12">
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        ) : loadError ? (
          <EmptyState
            title={language === 'ar' ? 'تعذر تحميل الحالات' : 'Could not load cases'}
            description={language === 'ar' ? 'حدث خطأ أثناء الاتصال بالخادم.' : 'An error occurred while contacting the server.'}
            actionLabel={t('action.retry')}
            onAction={() => window.location.reload()}
          />
        ) : fraudCases.length === 0 ? (
          <EmptyState
            title={language === 'ar' ? 'لا توجد حالات مشبوهة' : 'No suspicious cases'}
            description={language === 'ar' ? 'لم يتم رصد أي طلب يحتاج مراجعة احتيال حالياً.' : 'No application currently needs a fraud review.'}
          />
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fraudCases.map((c) => (
            <Card key={c.id} className="p-6 space-y-4 hover:border-border-strong transition-all flex flex-col justify-between">
              <div className="space-y-4">
                {/* Card Top: Severity Badge and Menu */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      (c.severity === 'high' || c.severity === 'critical')
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
                  {c.confidence !== null
                    ? `${c.confidence}% ${language === 'ar' ? 'درجة خطر الاحتيال' : 'Fraud risk score'}`
                    : language === 'ar' ? 'بانتظار التقييم الذكي' : 'Awaiting AI scoring'}                  
                </span>

                <Link
                  href={`/applications/${c.id}`}               
                  className="font-semibold text-brand-navy hover:text-brand-navy-light flex items-center gap-1 group transition-colors"
                >
                  <span>{t('action.viewApplication')}</span>
                  <Arrow className="w-3.5 h-3.5 group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
        )}
      </div>
    </AppLayout>
  );
}
     
