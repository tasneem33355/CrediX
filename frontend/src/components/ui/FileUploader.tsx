import React, { useId, useState } from 'react';
import { UploadCloud, File as FileIcon, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

export interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

export interface FileUploaderProps {
  label?: string;
  sublabel?: string;
  acceptedFormats?: string;
  maxSizeMB?: number;
  multiple?: boolean;
  onFilesSelected?: (files: File[]) => void;
  className?: string;
}

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const FileUploader: React.FC<FileUploaderProps> = ({
  label = 'اسحب الملفات هنا أو انقر للتصفح',
  sublabel = 'يدعم ملفات PDF، JPG، PNG بحد أقصى 10 ميجابايت',
  acceptedFormats = '.pdf,.jpg,.jpeg,.png',
  maxSizeMB = 10,
  multiple = true,
  onFilesSelected,
  className,
}) => {
  const inputId = useId();
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const addFiles = (selected: File[]) => {
    if (selected.length === 0) return;
    const batch = multiple ? selected : selected.slice(0, 1);
    const maxBytes = maxSizeMB * 1024 * 1024;

    const entries: UploadedFile[] = batch.map((f, i) => ({
      id: `${Date.now()}-${i}-${f.name}`,
      name: f.name,
      size: formatSize(f.size),
      type: f.type || f.name.split('.').pop() || '',
      progress: 100,
      status: f.size > maxBytes ? 'error' : 'completed',
    }));
    setFiles((prev) => (multiple ? [...prev, ...entries] : entries));

    const valid = batch.filter((f) => f.size <= maxBytes);
    if (valid.length > 0 && onFilesSelected) onFilesSelected(valid);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className={clsx('w-full space-y-4 text-start', className)}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={clsx(
          'border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center bg-surface-subtle',
          dragActive
            ? 'border-brand-navy bg-brand-navy/10'
            : 'border-border hover:border-border-strong'
        )}
      >
        <div className="w-12 h-12 rounded-2xl bg-[#E8EEF5] text-brand-navy flex items-center justify-center mb-3">
          <UploadCloud className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary mt-1">{sublabel}</p>
        <input
          type="file"
          multiple={multiple}
          accept={acceptedFormats}
          className="hidden"
          id={inputId}
          onChange={(e) => {
            if (e.target.files) addFiles(Array.from(e.target.files));
            e.target.value = '';
          }}
        />
        <label
          htmlFor={inputId}
          className="mt-4 px-4 py-2 text-xs font-semibold text-brand-navy bg-[#E8EEF5] hover:bg-[#E8EEF5]/80 rounded-xl cursor-pointer transition-colors border border-brand-navy/20"
        >
          تصفح الملفات من جهازك
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-surface border border-border rounded-xl shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-subtle flex items-center justify-center text-brand-navy">
                  <FileIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-text-primary">{file.name}</p>
                  <p className="text-[11px] text-text-secondary">
                    {file.status === 'error'
                      ? `${file.size} • أكبر من الحد المسموح (${maxSizeMB} MB)`
                      : file.size}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {file.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-semantic-success" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-semantic-warning" />
                )}
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1 text-text-muted hover:text-semantic-error rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
