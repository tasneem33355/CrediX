import React from 'react';
import { clsx } from 'clsx';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  message,
  onClose,
  className,
}) => {
  const typeStyles = {
    info: 'bg-[#E8EEF5] border-brand-navy/20 text-brand-navy',
    success: 'bg-semantic-success-bg border-semantic-success-border text-semantic-success',
    warning: 'bg-semantic-warning-bg border-semantic-warning-border text-semantic-warning',
    error: 'bg-semantic-error-bg border-semantic-error-border text-semantic-error',
  };

  const icons = {
    info: <Info className="w-5 h-5 text-brand-navy shrink-0" />,
    success: <CheckCircle className="w-5 h-5 text-semantic-success shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-semantic-warning shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-semantic-error shrink-0" />,
  };

  return (
    <div className={clsx('flex items-start gap-3 p-4 rounded-xl border text-sm', typeStyles[type], className)}>
      {icons[type]}
      <div className="flex-1 text-start">
        {title && <h5 className="font-semibold mb-0.5">{title}</h5>}
        <p className="text-xs leading-relaxed opacity-90">{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
