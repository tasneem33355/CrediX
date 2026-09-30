'use client';

import React from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  FileCheck2, 
  Building2, 
  Scan, 
  Cpu, 
  Sparkles,
  Check,
  Lock
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

type DocumentScannerVisualProps = {
  isArabic?: boolean;
};

export default function DocumentScannerVisual({ isArabic: propIsArabic }: DocumentScannerVisualProps) {
  const { language } = useLanguage();
  const isArabic = propIsArabic !== undefined ? propIsArabic : language === 'ar';

  return (
    <div 
      className="relative w-full max-w-[540px] select-none mx-auto"
      dir={isArabic ? 'rtl' : 'ltr'}
      aria-label={isArabic ? 'محاكي الفحص الضوئي والامتثال بالذكاء الاصطناعي' : 'AI Document Scanner & Fraud Detection Hub'}
    >
      {/* Ambient background glow matching CrediX brand palette */}
      <div className="absolute -inset-4 bg-gradient-to-tr from-sky-500/20 via-cyan-500/15 to-emerald-500/15 rounded-3xl blur-2xl opacity-75 pointer-events-none -z-10 animate-pulse" />
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Glassmorphic Container with Continuous Floating */}
      <div className="relative rounded-2xl bg-[#091b2e]/95 border border-sky-500/30 p-4 sm:p-5 shadow-[0_24px_50px_-12px_rgba(8,26,45,0.7),0_0_35px_rgba(14,165,233,0.18)] backdrop-blur-xl transition-transform duration-300 hover:scale-[1.01] credix-hero-float">
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-sky-500/20">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80 inline-block shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80 inline-block shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            </div>
            <div className="h-3 w-[1px] bg-sky-500/30 mx-1" />
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-sky-200/90 tracking-wide">
              <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
              <span>{isArabic ? 'محرك الفحص الذكي والامتثال' : 'AI OCR & FRAUD ENGINE'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-[10px] font-bold text-cyan-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
            </span>
            <span>{isArabic ? 'فحص مباشر' : 'LIVE SCANNING'}</span>
          </div>
        </div>

        {/* Document Area & Floating Badges Workspace */}
        <div className="relative">
          
          {/* 3D Floating Security Shield Badge (Floating 3D Hologram) */}
          <div className={`absolute top-8 sm:top-10 ${isArabic ? '-left-5 sm:-left-8' : '-right-5 sm:-right-8'} z-30 credix-shield-bob`}>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0b243d]/95 border border-cyan-400/60 shadow-[0_12px_30px_-5px_rgba(0,0,0,0.6),0_0_25px_rgba(56,189,248,0.45)] backdrop-blur-md">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400 text-[#091b2e] shadow-md">
                <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-cyan-300 tracking-wider">
                  {isArabic ? 'حماية البنك المركزي' : 'CBE SHIELD'}
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>{isArabic ? 'معتمد 100%' : '100% Verified'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* The Digital Scanned Document */}
          <div className="relative rounded-xl bg-[#061322]/90 border border-sky-500/25 p-4 sm:p-5 overflow-hidden shadow-inner">
            
            {/* Subtle cyber grid background in the document */}
            <div 
              className="absolute inset-0 opacity-[0.07] pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px)',
                backgroundSize: '16px 16px'
              }}
            />

            {/* Continuous Vertical Laser Scanner Beam with Ambient Trail */}
            <div className="absolute inset-x-0 z-20 pointer-events-none credix-laser-sweep">
              {/* Laser Line */}
              <div className="h-[2.5px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8,0_0_24px_#22d3ee,0_0_36px_#06b6d4]" />
              {/* Glow particle flares at center */}
              <div className="absolute left-1/2 -top-1 w-12 h-3 -translate-x-1/2 bg-cyan-300/60 blur-[3px] rounded-full" />
              {/* Holographic light veil */}
              <div className="h-10 w-full bg-gradient-to-b from-cyan-400/20 to-transparent" />
            </div>

            {/* Document Header */}
            <div className="flex items-center justify-between border-b border-sky-500/20 pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-950/80 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <span>{isArabic ? 'السجل التجاري الرسمي' : 'OFFICIAL COMMERCIAL REGISTRY'}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-cyan-300 font-mono">
                      #CR-89421
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isArabic ? 'جمهورية مصر العربية • وزارة التجارة والصناعة' : 'Ministry of Trade & Industry • CBE Audited'}
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-cyan-400/80 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                <Lock className="w-2.5 h-2.5" />
                <span>SHA-256</span>
              </div>
            </div>

            {/* Document Metadata Grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-3.5 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-900/60 border border-sky-500/15">
                <div className="text-[10px] text-slate-400 mb-0.5">{isArabic ? 'اسم المنشأة' : 'Company Legal Name'}</div>
                <div className="font-semibold text-slate-200 truncate">
                  {isArabic ? 'شركة النيل للخدمات اللوجستية ش.م.م' : 'Nile Logistics Services S.A.E'}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-sky-500/15">
                <div className="text-[10px] text-slate-400 mb-0.5">{isArabic ? 'الرقم الضريبي' : 'Tax Identification No.'}</div>
                <div className="font-mono font-semibold text-cyan-300">
                  392-841-705
                </div>
              </div>
            </div>

            {/* Simulated OCR Extraction Fields with Live Status Badges */}
            <div className="space-y-2 relative z-10">
              
              {/* Field 1: Revenue */}
              <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg bg-slate-900/80 border border-emerald-500/30 hover:border-emerald-400/60 transition-colors group">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">{isArabic ? 'الإيرادات السنوية المدققة' : 'Audited Annual Revenue'}</div>
                    <div className="text-xs font-bold text-slate-100 font-mono">3,850,000 EGP</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-[10px] font-bold text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  <span>{isArabic ? 'إيرادات موثقة' : 'Revenue Verified'}</span>
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              </div>

              {/* Field 2: Tax Status */}
              <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg bg-slate-900/80 border border-sky-500/30 hover:border-sky-400/60 transition-colors group">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <FileCheck2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">{isArabic ? 'الموقف الضريبي (نموذج 41)' : 'Tax Status (Form 41)'}</div>
                    <div className="text-xs font-bold text-slate-100">
                      {isArabic ? 'سليم ومنتظم • خالٍ من النزاعات' : 'Regular • Zero Discrepancies'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-[10px] font-bold text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                  <span>{isArabic ? 'سجل ضريبي نظيف' : 'Tax Clean'}</span>
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              </div>

              {/* Field 3: CBE Compliance */}
              <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg bg-slate-900/80 border border-teal-500/30 hover:border-teal-400/60 transition-colors group">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-teal-500/20 text-teal-400 flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">{isArabic ? 'معيار البنك المركزي (DBR)' : 'CBE Regulatory Standard (DBR)'}</div>
                    <div className="text-xs font-bold text-teal-300 font-mono">31.2% <span className="text-[9px] text-slate-400 font-normal">({isArabic ? 'الحد الأقصى 50%' : 'Max 50%'})</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/15 border border-teal-400/40 text-[10px] font-bold text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.2)]">
                  <span>{isArabic ? 'معتمد CBE' : 'CBE Approved'}</span>
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              </div>

            </div>

            {/* Document Bottom Authentication Seal */}
            <div className="mt-3 pt-2.5 border-t border-sky-500/20 flex items-center justify-between text-[10px] text-slate-400">
              <div className="flex items-center gap-1.5 text-cyan-400 font-mono">
                <Sparkles className="w-3 h-3" />
                <span>CrediX OCR Core v2.4</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{isArabic ? 'معدل الدقة:' : 'Extraction Rate:'}</span>
                <span className="font-bold text-emerald-400 font-mono">99.4%</span>
              </div>
            </div>

          </div>

        </div>

        {/* Real-time Ticker Footer */}
        <div className="mt-3 pt-2.5 border-t border-sky-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" />
            <span className="font-medium">
              {isArabic ? 'معدل فحص الاحتيال: 0 شبهات مسجلة' : 'Zero Fraud Anomalies Detected'}
            </span>
          </div>
          <div className="text-[10px] text-sky-400/80 font-mono">
            {isArabic ? 'زمن الاستجابة: 0.8 ثانية' : 'Latency: 0.8s'}
          </div>
        </div>

      </div>
    </div>
  );
}
