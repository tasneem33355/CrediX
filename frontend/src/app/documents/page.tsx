'use client';

import React, { useState } from 'react';
import {
  FileText,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { FileUploader } from '@/components/ui/FileUploader';
import { mockApplications } from '@/data/mockData';

export default function DocumentAnalysisPage() {
  const { t, language, direction } = useLanguage();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const [documents, setDocuments] = useState(mockApplications[0].documents);
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  return (
    <AppLayout breadcrumbTitle={t('nav.documentAnalysis')}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {t('nav.documentAnalysis')}
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              {language === 'ar'
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
                {language === 'ar' ? 'المستندات المرفقة' : 'Attached Documents'}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {language === 'ar' ? 'مستندات - تم الرفع في 04 سبتمبر 2026' : 'Documents - Uploaded Sep 04, 2026'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 bg-surface-subtle rounded-2xl border border-border hover:border-border-strong transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#E8EEF5] text-brand-navy font-bold text-xs flex items-center justify-center border border-brand-navy/20">
                    {doc.code}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text-primary">
                      {language === 'ar' ? doc.name : doc.nameEn}
                    </p>
                    <p className="text-[11px] text-text-muted">PDF • {doc.size}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge variant={doc.status === 'success' ? 'success' : 'warning'} dot>
                    {language === 'ar' ? doc.statusLabel : doc.statusLabelEn}
                  </Badge>

                  <button
                    onClick={() => setPreviewDoc(doc.name)}
                    className="text-xs font-semibold text-brand-navy hover:text-brand-navy-light flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>{t('action.preview')}</span>
                    <Arrow className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Upload Modal */}
        <Modal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          title={t('action.addDocument')}
          size="md"
        >
          <div className="space-y-4">
            <FileUploader
              onFilesSelected={(files) => {
                const newDoc = {
                  id: `doc_${Date.now()}`,
                  code: 'DOC',
                  name: files[0]?.name || 'مستند إضافي',
                  nameEn: files[0]?.name || 'Additional Document',
                  size: '2.1 MB',
                  uploadDate: 'الآن',
                  status: 'processing' as const,
                  statusLabel: 'قيد المعالجة',
                  statusLabelEn: 'Processing',
                };
                setDocuments((prev) => [...prev, newDoc]);
                setIsUploadModalOpen(false);
              }}
            />
          </div>
        </Modal>

        {/* Document Preview Modal */}
        <Modal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          title={`${t('action.preview')}: ${previewDoc}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="h-96 rounded-xl bg-surface-subtle flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-border">
              <FileText className="w-12 h-12 text-brand-navy mb-2" />
              <p className="text-sm font-semibold text-text-primary">{previewDoc}</p>
              <p className="text-xs text-text-muted mt-1">
                {language === 'ar'
                  ? 'عرض محتوى المستند بدقة عالية مع علامات التعرف الضوئي OCR'
                  : 'High resolution document viewer with OCR bounding boxes'}
              </p>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setPreviewDoc(null)}>
                {t('action.close')}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
