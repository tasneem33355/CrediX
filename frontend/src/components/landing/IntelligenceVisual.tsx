'use client';

import { Activity, CheckCircle2, FileSearch, ShieldCheck } from 'lucide-react';
import { CredixSymbol } from './LandingLogo';

type IntelligenceVisualProps = {
  isArabic: boolean;
};

export function IntelligenceVisual({ isArabic }: IntelligenceVisualProps) {
  return (
    <div className="intelligence-visual" aria-label={isArabic ? 'إشارات تحليل الائتمان' : 'Credit intelligence signals'}>
      <div className="intelligence-visual__halo" aria-hidden="true" />
      <CredixSymbol className="intelligence-visual__symbol" />
      <div className="signal-chip signal-chip--ocr"><FileSearch size={16} aria-hidden="true" /><span>{isArabic ? 'استخراج الوثائق' : 'Document OCR'}</span><b>97.4%</b></div>
      <div className="signal-chip signal-chip--cash"><Activity size={16} aria-hidden="true" /><span>{isArabic ? 'تحليل السيولة' : 'Cash-flow analysis'}</span><b>18 factors</b></div>
      <div className="signal-chip signal-chip--fraud"><CheckCircle2 size={16} aria-hidden="true" /><span>{isArabic ? 'فحص الاحتيال' : 'Fraud screening'}</span><b>{isArabic ? 'متحقق' : 'Verified'}</b></div>
      <div className="intelligence-visual__caption"><ShieldCheck size={17} aria-hidden="true" /><span>{isArabic ? 'ذكاء ائتماني قابل للتفسير' : 'Explainable credit intelligence'}</span></div>
    </div>
  );
}

export default IntelligenceVisual;
