import React from 'react';
import { clsx } from 'clsx';
import { Inbox, AlertCircle } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}) => {
  return (
    <div className={clsx('flex flex-col items-center justify-center p-12 text-center bg-surface rounded-2xl border border-border', className)}>
      <div className="w-14 h-14 rounded-2xl bg-surface-subtle flex items-center justify-center text-text-muted mb-4">
        {icon || <Inbox className="w-7 h-7" />}
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-text-secondary max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}> = ({ title = 'حدث خطأ في تحميل البيانات', message, onRetry, retryLabel = 'إعادة المحاولة' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-semantic-error-bg rounded-2xl border border-semantic-error-border">
      <div className="w-12 h-12 rounded-full bg-semantic-error/10 flex items-center justify-center text-semantic-error mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-semantic-error mb-1">{title}</h3>
      <p className="text-xs text-semantic-error/90 max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
};

