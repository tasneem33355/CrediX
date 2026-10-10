'use client';

import React, { useState } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building,
  User,
  Calendar,
  CreditCard,
  ExternalLink,
  Printer,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';

export interface DocumentViewerItem {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  size?: string;
  uploadDate?: string;
  status?: string;
  statusLabel?: string;
  statusLabelEn?: string;
  fileUrl?: string;
  extractedData?: Record<string, any>;
}

export interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentViewerItem | null;
  applicantData?: {
    name?: string;
    nationalId?: string;
    salary?: number;
    jobTitle?: string;
    companyName?: string;
  };
  language?: 'ar' | 'en';
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  applicantData,
  language = 'ar',
}) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'ocr'>('preview');

  if (!isOpen || !doc) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 75));
  const handleResetZoom = () => {
    setZoom(100);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const docCode = doc.code?.toUpperCase() || '';
  const isNationalId = docCode === 'ID' || doc.name.includes('بطاقة') || doc.name.includes('National ID');
  const isBankStatement = docCode === 'BA' || doc.name.includes('كشف حساب') || doc.name.includes('Bank');
  const isIncomeCert = docCode === 'IC' || doc.name.includes('دخل') || doc.name.includes('مرتب') || doc.name.includes('Income');
  const isCommercialReg = docCode === 'CR' || doc.name.includes('تجاري') || doc.name.includes('Commercial');

  // OCR Extracted Fields fallback / simulation based on doc type
  const ocrFields = doc.extractedData && Object.keys(doc.extractedData).length > 0
    ? Object.entries(doc.extractedData).map(([key, value]) => ({
        label: key,
        value: String(value),
        confidence: 96,
        status: 'matched',
      }))
    : isNationalId
    ? [
        { label: 'الاسم الكامل باللغة العربية', value: applicantData?.name || 'أحمد فؤاد عبد الله', confidence: 98.4, status: 'matched' },
        { label: 'الرقم القومي (14 رقم)', value: applicantData?.nationalId || '29408151203456', confidence: 99.2, status: 'matched' },
        { label: 'تاريخ الميلاد', value: '15/08/1994', confidence: 97.8, status: 'matched' },
        { label: 'محل الإقامة', value: '14 شارع النصر، المعادي، القاهرة', confidence: 94.5, status: 'matched' },
        { label: 'المهنة المدونة', value: applicantData?.jobTitle || 'أخصائي تطوير أعمال', confidence: 93.0, status: 'matched' },
        { label: 'تاريخ انتهاء السريان', value: '10/2030 (سارية)', confidence: 98.0, status: 'valid' },
      ]
    : isBankStatement
    ? [
        { label: 'اسم البنك المصدر', value: 'البنك التجاري الدولي (CIB مصر)', confidence: 99.0, status: 'matched' },
        { label: 'رقم الحساب البنكي', value: 'EG38001000450000009876543', confidence: 97.5, status: 'matched' },
        { label: 'متوسط الإيداعات الشهرية', value: '53,700 ج.م / شهر', confidence: 94.2, status: 'warning' },
        { label: 'انتظام تحويل الراتب', value: 'منتظم في اليوم 28 من كل شهر', confidence: 96.0, status: 'matched' },
        { label: 'فحص قانون بينفورد (Benford)', value: 'اجتياز (Chi-sq: 8.42 < 15.51)', confidence: 98.5, status: 'verified' },
        { label: 'سلامة الخطوط والطبقات (Forensic)', value: 'لم يتم رصد أي تلاعب أو دمج طبقات', confidence: 95.1, status: 'verified' },
      ]
    : isIncomeCert
    ? [
        { label: 'جهة العمل', value: applicantData?.companyName || 'شركة النيل للحلول التقنية (ش.م.م)', confidence: 96.0, status: 'matched' },
        { label: 'المسمى الوظيفي', value: applicantData?.jobTitle || 'أخصائي تطوير أعمال أول', confidence: 95.5, status: 'matched' },
        { label: 'إجمالي الراتب التعاقدي', value: '85,000 ج.م', confidence: 98.0, status: 'matched' },
        { label: 'صافي الراتب المنصرف', value: '72,400 ج.م', confidence: 97.2, status: 'matched' },
        { label: 'تاريخ التعيين', value: '01/03/2021 (أكثر من 5 سنوات)', confidence: 96.8, status: 'verified' },
        { label: 'الختم والتوقيع الرسمي', value: 'معتمد ومطابق للنموذج التأميني', confidence: 94.0, status: 'verified' },
      ]
    : [
        { label: 'اسم المنشأة / السجل', value: 'شركة النيل للتجارة والاستيراد', confidence: 95.0, status: 'matched' },
        { label: 'رقم السجل التجاري', value: '458921 / مكتب سجل القاهرة', confidence: 98.0, status: 'matched' },
        { label: 'الشكل القانوني', value: 'شركة ذات مسؤولية محدودة', confidence: 97.0, status: 'matched' },
        { label: 'رأس المال المقيد', value: '1,500,000 ج.م', confidence: 96.5, status: 'matched' },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-brand-charcoal/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-[92vh] bg-surface rounded-3xl shadow-2xl border border-border flex flex-col overflow-hidden text-start">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-subtle/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-navy text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {doc.code}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text-primary">{doc.name}</h2>
                <Badge variant={isVerified ? 'success' : doc.status === 'success' ? 'success' : 'warning'} dot>
                  {isVerified
                    ? (language === 'ar' ? 'تم الاعتماد البشري' : 'Human Verified')
                    : (language === 'ar' ? doc.statusLabel || 'ناجح' : doc.statusLabelEn || 'Verified')}
                </Badge>
              </div>
              <p className="text-xs text-text-muted">
                {language === 'ar' ? 'تاريخ الرفع:' : 'Uploaded:'} {doc.uploadDate || '04 سبتمبر 2026'} • {doc.size || '3.2 MB'}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center bg-surface border border-border rounded-xl p-1 gap-1">
              <button
                onClick={handleZoomOut}
                title="تصغير"
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono px-1.5 font-bold text-text-primary">{zoom}%</span>
              <button
                onClick={handleZoomIn}
                title="تكبير"
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-border my-auto mx-0.5" />
              <button
                onClick={handleRotate}
                title="تدوير"
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                title="إعادة ضبط"
                className="px-2 py-1 rounded-lg text-[10px] font-bold text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'ضبط' : 'Reset'}
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={<Printer className="w-4 h-4" />}
              onClick={() => window.print()}
              className="hidden md:inline-flex"
            >
              {language === 'ar' ? 'طباعة' : 'Print'}
            </Button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-subtle transition-colors cursor-pointer ms-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content: Split Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          {/* Left / Main Column: Document Canvas (7 cols on lg) */}
          <div className="lg:col-span-7 bg-[#0F172A]/5 dark:bg-[#000000]/40 p-4 sm:p-6 overflow-auto flex items-center justify-center relative border-e border-border">
            <div
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: 'transform 0.2s ease-out',
              }}
              className="w-full max-w-xl shadow-2xl rounded-2xl overflow-hidden bg-white text-slate-800"
            >
              {/* REAL FILE IMAGE / PDF IF PROVIDED */}
              {doc.fileUrl ? (
                <div className="relative w-full h-[520px]">
                  {doc.fileUrl.endsWith('.pdf') ? (
                    <iframe src={doc.fileUrl} className="w-full h-full border-0" title={doc.name} />
                  ) : (
                    <img src={doc.fileUrl} alt={doc.name} className="w-full h-full object-contain" />
                  )}
                </div>
              ) : isNationalId ? (
                /* ─── EGYPTIAN NATIONAL ID CARD VISUAL ─── */
                <div className="p-6 bg-gradient-to-br from-[#EBF4FA] via-[#F4F9FD] to-[#D9ECF7] border border-[#B9D8ED] rounded-2xl space-y-4 relative overflow-hidden font-sans select-none">
                  {/* Holographic eagle watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06]">
                    <Building className="w-80 h-80 text-brand-navy" />
                  </div>

                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-[#B9D8ED] pb-3">
                    <div className="text-start">
                      <p className="text-[11px] font-black text-[#1B3A5C] tracking-wide">جمهورية مصر العربية</p>
                      <p className="text-[9px] text-[#486581] font-bold">وزارة الداخلية • مصلحة الأحوال المدنية</p>
                    </div>
                    <div className="text-center">
                      <span className="px-2 py-0.5 bg-[#1B3A5C] text-white rounded text-[10px] font-bold tracking-wider">
                        بطاقة تحقيق الشخصية
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Photo box */}
                    <div className="col-span-4 flex flex-col items-center">
                      <div className="w-28 h-36 bg-gradient-to-b from-[#C9DFEF] to-[#A4C9E4] rounded-xl border-2 border-[#1B3A5C]/40 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
                        <User className="w-16 h-16 text-[#1B3A5C]/60" />
                        <span className="absolute bottom-1 text-[8px] font-mono text-[#1B3A5C] bg-white/70 px-1 rounded">
                          EGY-{doc.id.slice(-4)}
                        </span>
                      </div>
                    </div>

                    {/* Personal Details */}
                    <div className="col-span-8 space-y-2 text-start text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">الاسم:</span>
                        <p className="font-extrabold text-[#0B2545] text-sm">{applicantData?.name || 'أحمد فؤاد عبد الله'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">محل الإقامة:</span>
                        <p className="font-semibold text-slate-800 text-[11px]">14 شارع النصر، المعادي الجديدة، محافظة القاهرة</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-[10px] text-slate-500 block">المهنة:</span>
                          <p className="font-bold text-[#1B3A5C] text-[11px]">{applicantData?.jobTitle || 'أخصائي تطوير أعمال'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">الرقم القومي:</span>
                          <p className="font-mono font-black text-[#1B3A5C] text-xs tracking-wider">
                            {applicantData?.nationalId || '29408151203456'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Security Strip */}
                  <div className="border-t border-[#B9D8ED] pt-2 flex items-center justify-between text-[9px] text-[#486581] font-mono">
                    <span>M32890184 &lt;&lt; 29408151203456 &lt;&lt;&lt;&lt;&lt;&lt;</span>
                    <span className="font-bold text-[#1B3A5C]">صالحة حتى: 10/2030</span>
                  </div>
                </div>
              ) : isBankStatement ? (
                /* ─── CIB BANK STATEMENT VISUAL ─── */
                <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-4 font-sans select-none text-slate-800">
                  {/* Bank Header */}
                  <div className="flex items-center justify-between border-b-2 border-[#1B3A5C] pb-3">
                    <div>
                      <h3 className="font-black text-[#1B3A5C] text-base tracking-tight">البنك التجاري الدولي • CIB مصر</h3>
                      <p className="text-[10px] text-slate-500">كشف حساب العمليات المصرفية الجارية (آخر 3 أشهر)</p>
                    </div>
                    <div className="text-end text-[10px] space-y-0.5">
                      <p><span className="text-slate-500">رقم الحساب:</span> <strong className="font-mono">10004598765</strong></p>
                      <p><span className="text-slate-500">العملة:</span> <strong>الجنيه المصري (EGP)</strong></p>
                    </div>
                  </div>

                  {/* Account Summary Strip */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">إجمالي الإيداعات</span>
                      <strong className="text-emerald-700 font-mono text-sm">161,100 ج.م</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">إجمالي المسحوبات</span>
                      <strong className="text-rose-700 font-mono text-sm">98,400 ج.م</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">الرصيد الختامي</span>
                      <strong className="text-[#1B3A5C] font-mono text-sm">62,700 ج.م</strong>
                    </div>
                  </div>

                  {/* Transactions Table Snippet */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-[11px] text-start">
                      <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="p-2 text-start">التاريخ</th>
                          <th className="p-2 text-start">تفاصيل المعاملة</th>
                          <th className="p-2 text-end">المبلغ (ج.م)</th>
                          <th className="p-2 text-end">الرصيد</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        <tr>
                          <td className="p-2 text-slate-500">28/08/2026</td>
                          <td className="p-2 font-sans font-medium text-emerald-800">تحويل راتب شهري - شركة النيل</td>
                          <td className="p-2 text-end font-bold text-emerald-600">+53,700.00</td>
                          <td className="p-2 text-end font-bold text-slate-700">62,700.00</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-slate-500">15/08/2026</td>
                          <td className="p-2 font-sans text-slate-700">سحب نقدي صراف آلي - فرع المعادي</td>
                          <td className="p-2 text-end font-bold text-rose-600">-8,000.00</td>
                          <td className="p-2 text-end text-slate-600">9,000.00</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-slate-500">01/08/2026</td>
                          <td className="p-2 font-sans text-slate-700">سداد مشتريات نقاط بيع POS</td>
                          <td className="p-2 text-end font-bold text-rose-600">-3,250.00</td>
                          <td className="p-2 text-end text-slate-600">17,000.00</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-slate-500">28/07/2026</td>
                          <td className="p-2 font-sans font-medium text-emerald-800">تحويل راتب شهري - شركة النيل</td>
                          <td className="p-2 text-end font-bold text-emerald-600">+53,700.00</td>
                          <td className="p-2 text-end font-bold text-slate-700">20,250.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>كشف رسمي معتمد إلكترونياً</span>
                    <span className="font-mono">صفحة 1 من 3 • ختم بنكي معتمد</span>
                  </div>
                </div>
              ) : isIncomeCert ? (
                /* ─── HR LETTER / INCOME CERTIFICATE VISUAL ─── */
                <div className="p-8 bg-white border border-slate-200 rounded-2xl space-y-4 font-sans select-none text-slate-800">
                  <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                    <div>
                      <h3 className="font-extrabold text-[#1B3A5C] text-sm">شركة النيل للحلول التقنية (ش.م.م)</h3>
                      <p className="text-[10px] text-slate-500">إدارة الموارد البشرية والشؤون الإدارية</p>
                    </div>
                    <Badge variant="neutral">شهادة مفردات مرتب</Badge>
                  </div>

                  <div className="text-xs space-y-2.5 text-start leading-relaxed">
                    <p className="font-bold text-slate-700">إلى من يهمه الأمر / قطاع الائتمان وتمويل الأفراد:</p>
                    <p className="text-slate-600">
                      تشهد الشركة بأن السيد / <strong>{applicantData?.name || 'أحمد فؤاد عبد الله'}</strong>، حامل بطاقة رقم قومي رقم{' '}
                      <strong className="font-mono">{applicantData?.nationalId || '29408151203456'}</strong>، يعمل طرفنا بوظيفة{' '}
                      <strong>{applicantData?.jobTitle || 'أخصائي تطوير أعمال أول'}</strong> منذ تاريخ 01/03/2021 وحتى تاريخه، وما زال على قوة العمل.
                    </p>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">الراتب الأساسي الإجمالي:</span>
                        <strong className="font-mono">85,000.00 ج.م</strong>
                      </div>
                      <div className="flex justify-between text-rose-700">
                        <span>الاستقطاعات (ضرائب وتأمينات):</span>
                        <span className="font-mono">-12,600.00 ج.م</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-1 text-[#1B3A5C] font-bold">
                        <span>صافي الراتب الشهري المنصرف:</span>
                        <span className="font-mono text-sm">72,400.00 ج.م</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-between items-end border-t border-slate-100">
                    <div className="text-center space-y-1">
                      <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#1B3A5C]/40 flex items-center justify-center text-[9px] text-[#1B3A5C] font-bold rotate-12">
                        ختم الشركة
                      </div>
                    </div>
                    <div className="text-end text-[10px] text-slate-500 space-y-1">
                      <p>مدير الموارد البشرية: أ/ طارق محمود</p>
                      <p className="font-mono">التاريخ: 02 سبتمبر 2026</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* ─── GENERIC OFFICIAL DOCUMENT FALLBACK ─── */
                <div className="p-8 bg-white border border-slate-200 rounded-2xl space-y-4 font-sans select-none text-slate-800">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                    <h3 className="font-bold text-[#1B3A5C] text-sm">{doc.name}</h3>
                    <Badge variant="neutral">مستند رسمي معتمد</Badge>
                  </div>
                  <div className="py-12 text-center space-y-2">
                    <FileText className="w-12 h-12 text-brand-navy mx-auto opacity-70" />
                    <p className="font-bold text-slate-700 text-sm">{doc.name}</p>
                    <p className="text-xs text-slate-500">تم مسح المستند ضوئياً وتحليله عبر طبقة الـ OCR Gate</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: OCR Extracted Fields & Audit Inspection (5 cols on lg) */}
          <div className="lg:col-span-5 p-5 sm:p-6 overflow-y-auto space-y-5 bg-surface text-start">
            {/* Header info */}
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-navy" />
                <h3 className="text-sm font-bold text-text-primary">
                  {language === 'ar' ? 'بيانات الاستخراج الذكي (OCR Extraction)' : 'Smart OCR Extracted Attributes'}
                </h3>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                {language === 'ar'
                  ? 'مقارنة البيانات المستخرجة مع طلب العميل وفحص مصداقية الوثيقة'
                  : 'Extracted attributes comparison and forensic check'}
              </p>
            </div>

            {/* Extracted Fields Table */}
            <div className="space-y-2.5">
              {ocrFields.map((field, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-surface-subtle border border-border space-y-1 hover:border-brand-navy/30 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted font-medium">{field.label}</span>
                    <span className="text-[11px] font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200">
                      {field.confidence}% دقة
                    </span>
                  </div>
                  <p className="text-xs font-bold text-text-primary break-all">{field.value}</p>
                </div>
              ))}
            </div>

            {/* Forensic Tampering Security Gate */}
            <div className="p-4 rounded-2xl bg-surface-subtle border border-border space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-text-primary">
                  {language === 'ar' ? 'فحص التلاعب الجنائي (Forensic & Anti-Fraud)' : 'Forensic Integrity Scan'}
                </h4>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-secondary">فحص طبقات الخطوط (Font Artifacts):</span>
                  <span className="text-emerald-600 font-bold">سليم (No Splicing)</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-secondary">قانون بينفورد (Benford Law):</span>
                  <span className="text-emerald-600 font-bold">طبيعي (Pass)</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-secondary">مطابقة الرقم القومي وتاريخ الميلاد:</span>
                  <span className="text-emerald-600 font-bold">متطابق 100%</span>
                </div>
              </div>
            </div>

            {/* Human Verification Decision Actions */}
            <div className="pt-4 border-t border-border space-y-2">
              <Button
                variant="primary"
                size="md"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                icon={<CheckCircle2 className="w-4 h-4 text-white" />}
                onClick={() => {
                  setIsVerified(true);
                  setTimeout(() => onClose(), 600);
                }}
              >
                {isVerified
                  ? (language === 'ar' ? 'تم اعتماد المستند بنجاح' : 'Document Verified')
                  : (language === 'ar' ? 'اعتماد صحة المستند (Verify Document)' : 'Verify Document')}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={onClose}
              >
                {language === 'ar' ? 'إغلاق المعاينة' : 'Close Preview'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
