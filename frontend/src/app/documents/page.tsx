'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, ArrowRight, ArrowLeft, FileText, Paperclip } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FileUploader } from '@/components/ui/FileUploader';
import {
  fetchDocuments,
  ingestOcrJson,
  uploadAndProcessDocuments,
  type ApiDocument,
  type OcrIngestResult,
} from '@/lib/api';

const SLOT_DEFS = [
  { key: 'nationalIdFront', ar: 'بطاقة الرقم القومي (الوجه)', en: 'National ID (front)' },
  { key: 'nationalIdBack', ar: 'بطاقة الرقم القومي (الظهر)', en: 'National ID (back)' },
  { key: 'salaryCertificate', ar: 'شهادة الراتب', en: 'Salary certificate' },
  { key: 'bankStatement', ar: 'كشف الحساب البنكي', en: 'Bank statement' },
  { key: 'iscore', ar: 'تقرير الآي سكور', en: 'I-Score report' },
] as const;

type SlotKey = (typeof SLOT_DEFS)[number]['key'];
type SlotState = Record<SlotKey, File | null>;

const EMPTY_SLOTS: SlotState = {
  nationalIdFront: null,
  nationalIdBack: null,
  salaryCertificate: null,
  bankStatement: null,
  iscore: null,
};

export default function DocumentAnalysisPage() {
  const { t, language, direction } = useLanguage();
  const { session } = useAuth();
  const token = session?.access_token;
  const isAr = language === 'ar';
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [mode, setMode] = useState<'files' | 'json'>('files');
  const [slots, setSlots] = useState<SlotState>(EMPTY_SLOTS);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [amount, setAmount] = useState('');
  const [tenure, setTenure] = useState('36');
  const [mobile, setMobile] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<OcrIngestResult | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      setDocuments(await fetchDocuments({ limit: 100 }, token));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setMode('files');
    setSlots(EMPTY_SLOTS);
    setJsonFile(null);
    setAmount('');
    setTenure('36');
    setMobile('');
    setSubmitError(null);
    setResult(null);
  };

  const amountNum = Number(amount);
  const tenureNum = Number(tenure);
  const loanValid = amountNum > 0 && tenureNum >= 1 && tenureNum <= 480;
  const mobileValid = /^01[0125]\d{8}$/.test(mobile);
  const filesReady = SLOT_DEFS.every((s) => slots[s.key] !== null);
  const canSubmit = loanValid && mobileValid && (mode === 'files' ? filesReady : jsonFile !== null) && !submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const options = { loanType: 'personal', requestedAmount: amountNum, tenureMonths: tenureNum, mobileNumber: mobile };
      let res: OcrIngestResult;

      if (mode === 'files') {
        const { nationalIdFront, nationalIdBack, salaryCertificate, bankStatement, iscore } = slots;
        if (!nationalIdFront || !nationalIdBack || !salaryCertificate || !bankStatement || !iscore) return;
        res = await uploadAndProcessDocuments(
          { nationalIdFront, nationalIdBack, salaryCertificate, bankStatement, iscore },
          options,
          token
        );
      } else {
        if (!jsonFile) return;
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(await jsonFile.text());
        } catch {
          throw new Error(isAr ? 'ملف JSON غير صالح' : 'Invalid JSON file');
        }
        res = await ingestOcrJson(parsed, options, token);
      }

      setResult(res);
      await loadDocuments();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : isAr ? 'تعذر إتمام العملية' : 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const statusVariant = (status: string) =>
    status === 'success' ? 'success' : status === 'failed' ? 'danger' : 'warning';

  return (
    <AppLayout breadcrumbTitle={t('nav.documentAnalysis')}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{t('nav.documentAnalysis')}</h1>
            <p className="text-xs text-text-secondary mt-1">
              {isAr
                ? 'فحص واستخراج البيانات من الوثائق الرسمية بالرؤية الحاسوبية و OCR'
                : 'OCR and Computer Vision extraction status for uploaded banking documents'}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            {t('action.addDocument')}
          </Button>
        </div>

        {/* Documents Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                {isAr ? 'المستندات المرفقة' : 'Attached Documents'}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {isAr ? `${documents.length} مستند` : `${documents.length} document(s)`}
              </p>
            </div>
          </div>

          {loadError && <Alert type="error" message={loadError} />}

          {loading ? (
            <div className="space-y-3">
              <Skeleton height={68} />
              <Skeleton height={68} />
              <Skeleton height={68} />
            </div>
          ) : documents.length === 0 && !loadError ? (
            <EmptyState
              title={isAr ? 'لا توجد مستندات بعد' : 'No documents yet'}
              description={
                isAr
                  ? 'ارفع مستندات العميل أو ملف الـ OCR JSON لبدء المعالجة.'
                  : 'Upload the customer documents or an OCR JSON file to start processing.'
              }
              actionLabel={t('action.addDocument')}
              onAction={() => setIsUploadModalOpen(true)}
              icon={<FileText className="w-7 h-7" />}
            />
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => {
                const quality = doc.extractedData?.overall_quality_score;
                const tampered = doc.extractedData?.is_tampered_suspected === true;
                return (
                  <div
                    key={doc.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-surface-subtle rounded-2xl border border-border hover:border-border-strong transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[#E8EEF5] text-brand-navy font-bold text-xs flex items-center justify-center border border-brand-navy/20">
                        {doc.code}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-text-primary">{isAr ? doc.name : doc.nameEn}</p>
                        <p className="text-[11px] text-text-muted">
                          {doc.applicationId && <span className="font-mono">{doc.applicationId}</span>}
                          {typeof quality === 'number' && (
                            <span>
                              {doc.applicationId ? ' • ' : ''}
                              {isAr ? 'الجودة' : 'Quality'} {Math.round(quality * 100)}%
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {tampered && (
                        <Badge variant="danger" dot>
                          {isAr ? 'اشتباه تلاعب' : 'Tampering suspected'}
                        </Badge>
                      )}
                      <Badge variant={statusVariant(doc.status)} dot>
                        {isAr ? doc.statusLabel : doc.statusLabelEn}
                      </Badge>

                      {doc.applicationId && (
                        <Link
                          href={`/applications/${doc.applicationId}`}
                          className="text-xs font-semibold text-brand-navy hover:text-brand-navy-light flex items-center gap-1 transition-colors"
                        >
                          <span>{isAr ? 'عرض الطلب' : 'View application'}</span>
                          <Arrow className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Upload Modal */}
        <Modal
          isOpen={isUploadModalOpen}
          onClose={closeUploadModal}
          title={t('action.addDocument')}
          size="lg"
        >
          {result ? (
            <div className="space-y-4">
              <Alert
                type={result.is_consistent ? 'success' : 'warning'}
                title={
                  isAr
                    ? `تم إنشاء الطلب ${result.application_id}`
                    : `Application ${result.application_id} created`
                }
                message={
                  result.is_consistent
                    ? isAr
                      ? 'اجتازت المستندات فحص التطابق.'
                      : 'Documents passed the consistency checks.'
                    : isAr
                      ? `تم رصد ${result.warnings.length} ملاحظة تدقيقية تحتاج مراجعة.`
                      : `${result.warnings.length} audit warning(s) need review.`
                }
              />
              {result.warnings.length > 0 && (
                <ul className="space-y-2 max-h-60 overflow-y-auto">
                  {result.warnings.map((w, i) => (
                    <li
                      key={`${w.code ?? 'w'}-${i}`}
                      className="p-3 rounded-xl bg-surface-subtle border border-border text-xs text-text-primary"
                    >
                      {isAr ? w.message || w.message_en : w.message_en || w.message}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={closeUploadModal}>
                  {t('action.close')}
                </Button>
                <Link href={`/applications/${result.application_id}`}>
                  <Button variant="primary">{isAr ? 'فتح الطلب' : 'Open application'}</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Mode switch */}
              <div className="flex gap-2">
                <Button
                  variant={mode === 'files' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setMode('files')}
                >
                  {isAr ? 'رفع المستندات' : 'Upload documents'}
                </Button>
                <Button
                  variant={mode === 'json' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setMode('json')}
                >
                  {isAr ? 'ملف OCR JSON' : 'OCR JSON file'}
                </Button>
              </div>

              {mode === 'files' ? (
                <div className="space-y-2">
                  {SLOT_DEFS.map((slot) => (
                    <div
                      key={slot.key}
                      className="flex items-center justify-between gap-3 p-3 bg-surface-subtle border border-border rounded-xl"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-text-primary">{isAr ? slot.ar : slot.en}</p>
                        <p className="text-[11px] text-text-muted truncate">
                          {slots[slot.key]?.name ?? (isAr ? 'لم يتم اختيار ملف' : 'No file selected')}
                        </p>
                      </div>
                      <label className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-navy bg-[#E8EEF5] hover:bg-[#E8EEF5]/80 rounded-xl cursor-pointer border border-brand-navy/20 transition-colors">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{isAr ? 'اختيار' : 'Choose'}</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            setSlots((prev) => ({ ...prev, [slot.key]: file }));
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <FileUploader
                  multiple={false}
                  acceptedFormats=".json,application/json"
                  label={isAr ? 'اسحب ملف الـ OCR JSON هنا' : 'Drop the OCR JSON file here'}
                  sublabel={isAr ? 'ملف بصيغة JSON (مثل response_Fixed.json)' : 'A JSON file (e.g. response_Fixed.json)'}
                  onFilesSelected={(files) => setJsonFile(files[0] ?? null)}
                />
              )}

              {/* Loan details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  id="doc-loan-amount"
                  type="number"
                  min={1}
                  label={isAr ? 'المبلغ المطلوب (ج.م)' : 'Requested amount (EGP)'}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <Input
                  id="doc-loan-tenure"
                  type="number"
                  min={1}
                  max={480}
                  label={isAr ? 'مدة التمويل (شهر)' : 'Tenure (months)'}
                  value={tenure}
                  onChange={(e) => setTenure(e.target.value)}
                />
              </div>

              <Input
                id="doc-mobile"
                type="tel"
                inputMode="numeric"
                maxLength={11}
                label={isAr ? 'رقم الموبايل (11 رقم)' : 'Mobile number (11 digits)'}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
              />
              
              {submitError && <Alert type="error" message={submitError} />}

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={closeUploadModal} disabled={submitting}>
                  {t('action.close')}
                </Button>
                <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit} isLoading={submitting}>
                  {submitting
                    ? isAr
                      ? 'جاري معالجة المستندات...'
                      : 'Processing documents...'
                    : isAr
                      ? 'معالجة وإنشاء الطلب'
                      : 'Process & create application'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
}
