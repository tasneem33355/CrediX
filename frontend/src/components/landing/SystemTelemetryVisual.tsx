'use client';

import React from 'react';
import { 
  FileText, 
  ShieldCheck, 
  Zap, 
  Lock, 
  Check, 
  ArrowUpRight,
  Layers
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

type HeroIntelligencePreviewProps = {
  isArabic?: boolean;
};

export default function SystemTelemetryVisual({ isArabic: propIsArabic }: HeroIntelligencePreviewProps) {
  const { language } = useLanguage();
  const isArabic = propIsArabic !== undefined ? propIsArabic : language === 'ar';

  return (
    <div 
      className="relative w-full max-w-[550px] select-none mx-auto"
      dir={isArabic ? 'rtl' : 'ltr'}
      aria-label={isArabic ? 'منظومة كريدكس الذكية' : 'CrediX Intelligent System Preview'}
    >

      {/* Main Crisp Institutional Card with Bold CrediX Signature Navy Border */}
      <div className="relative rounded-2xl bg-white border-[2px] border-[#102a3d] p-4 sm:p-5 shadow-[0_24px_50px_-12px_rgba(16,42,61,0.18),0_4px_16px_rgba(16,42,61,0.08)] credix-hero-float">
        
        {/* Top Product Header */}
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[#174a66]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#e8eef5] border border-[#174a66]/25 flex items-center justify-center text-[#174a66] shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#102a3d] tracking-tight">
                {isArabic ? 'محرك كريدكس للقرارات الذكية' : 'CrediX Decision Engine'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isArabic ? 'النظام متصل وجاهز' : 'System Ready'}</span>
          </div>
        </div>

        {/* Stepper Flow Header */}
        <div className="rounded-xl bg-[#f5f8fa] border border-[#174a66]/15 p-3 mb-3.5 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-medium text-[#294457] mb-2.5 px-1">
            <span className="text-[#102a3d] font-bold">
              {isArabic ? 'مسار المعالجة الآلية' : 'Automated Workflow'}
            </span>
            <span className="text-[#174a66] text-[11px] font-bold flex items-center gap-1">
              <span>{isArabic ? 'معالجة مباشرة' : 'Real-time pipeline'}</span>
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          </div>

          {/* Stepper bar */}
          <div className="relative flex items-center justify-between px-1">
            <div className="absolute top-3 inset-x-4 h-[2px] bg-[#d7e2e8] -translate-y-1/2 z-0">
              <div className="h-full bg-gradient-to-r from-[#102a3d] via-[#174a66] to-[#247b68] w-full credix-stepper-progress" />
            </div>

            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-[#102a3d] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                1
              </div>
              <span className="text-[10px] font-bold text-[#102a3d] mt-1">
                {isArabic ? 'استلام الوثائق' : 'Intake'}
              </span>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-[#174a66] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                2
              </div>
              <span className="text-[10px] font-bold text-[#102a3d] mt-1">
                {isArabic ? 'الفحص والاستخراج' : 'OCR & Audit'}
              </span>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-[#247b68] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                3
              </div>
              <span className="text-[10px] font-bold text-[#102a3d] mt-1">
                {isArabic ? 'اعتماد القرار' : 'Decision'}
              </span>
            </div>
          </div>
        </div>

        {/* Split Grid: Live Telemetry & Document Scan Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          
          {/* Card 1: Document Verification Scanner */}
          <div className="relative rounded-xl bg-white border border-[#174a66]/20 p-3 overflow-hidden shadow-xs hover:border-[#174a66]/40 transition-colors">
            {/* Subtle laser sweep beam */}
            <div className="absolute inset-x-0 z-20 pointer-events-none credix-doc-scanner-line">
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#174a66] to-transparent shadow-[0_0_8px_rgba(23,74,102,0.5)]" />
              <div className="h-6 w-full bg-gradient-to-b from-[#174a66]/10 to-transparent" />
            </div>

            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#eef3f6] text-[11px]">
              <div className="flex items-center gap-1.5 text-[#102a3d] font-bold">
                <FileText className="w-3.5 h-3.5 text-[#174a66]" />
                <span>{isArabic ? 'تدقيق المستندات الآلي' : 'Document Ingestion'}</span>
              </div>
              <span className="text-[9px] font-bold text-[#174a66] bg-[#e8eef5] px-2 py-0.5 rounded border border-[#cfdee5]">
                ACTIVE
              </span>
            </div>

            {/* Document Extraction Checkpoints */}
            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#f8fafc] border border-[#e8eff5]">
                <span className="text-[#102a3d] font-semibold">{isArabic ? 'مطابقة الهوية والسجل' : 'Identity & Registry'}</span>
                <span className="text-[#247b68] font-bold flex items-center gap-0.5">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>{isArabic ? 'تم التحقق' : 'Verified'}</span>
                </span>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#f8fafc] border border-[#e8eff5]">
                <span className="text-[#102a3d] font-semibold">{isArabic ? 'تحليل القوائم المالية' : 'Cash-flow Analysis'}</span>
                <span className="text-[#247b68] font-bold flex items-center gap-0.5">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>{isArabic ? 'مطابق' : 'Passed'}</span>
                </span>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#f8fafc] border border-[#e8eff5]">
                <span className="text-[#102a3d] font-semibold">{isArabic ? 'فحص شبهات التزوير' : 'Fraud Screen'}</span>
                <span className="text-[#247b68] font-bold flex items-center gap-0.5">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>{isArabic ? 'سليم' : 'Clean'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Risk Scoring & Sparkline */}
          <div className="rounded-xl bg-white border border-[#174a66]/20 p-3 flex flex-col justify-between shadow-xs hover:border-[#174a66]/40 transition-colors">
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#eef3f6] text-[11px]">
                <div className="flex items-center gap-1.5 text-[#102a3d] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#247b68]" />
                  <span>{isArabic ? 'محرك تقييم المخاطر' : 'Risk Assessment'}</span>
                </div>
                <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  REAL-TIME
                </span>
              </div>

              {/* Sparkline Graphic */}
              <div className="h-14 w-full relative flex items-center justify-center my-1">
                <svg className="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="sparkGradient" x1="0%" y1="0%" x2="0%" y2="1">
                      <stop offset="0%" stopColor="#174a66" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#174a66" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path 
                    d="M 0 45 Q 25 20, 50 35 T 100 25 T 150 15 T 200 20 L 200 60 L 0 60 Z" 
                    fill="url(#sparkGradient)" 
                  />
                  <path 
                    d="M 0 45 Q 25 20, 50 35 T 100 25 T 150 15 T 200 20" 
                    fill="none" 
                    stroke="#174a66" 
                    strokeWidth="2.2" 
                    strokeLinecap="round" 
                    className="credix-sparkline-flow"
                  />
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#eef3f6] text-[10px]">
              <span className="flex items-center gap-1 text-[#102a3d] font-bold">
                <Zap className="w-3 h-3 text-amber-600 fill-amber-500/20" />
                <span>{isArabic ? 'سرعة القرار: فورية' : 'Decision Latency: Instant'}</span>
              </span>
            </div>
          </div>

        </div>

        {/* Companion Bar (Bank Security & Encryption) */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#f5f8fa] border border-[#174a66]/20 text-[#102a3d] text-[11px]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#e8eef5] text-[#174a66] flex items-center justify-center">
              <Lock className="w-3 h-3 stroke-[2.2]" />
            </div>
            <span className="font-bold text-[#102a3d]">
              {isArabic ? 'تشفير مصرفي متكامل وحماية سحابية' : 'Bank-Grade 256-Bit Data Isolation'}
            </span>
          </div>
          <div className="text-[10px] font-bold text-[#174a66] bg-white px-2.5 py-1 rounded-md border border-[#174a66]/25 shadow-xs">
            {isArabic ? 'بروتوكول آمن' : 'Encrypted Flow'}
          </div>
        </div>

      </div>
    </div>
  );
}
