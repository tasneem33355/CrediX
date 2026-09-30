import React from 'react';
import { clsx } from 'clsx';

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  color?: 'emerald' | 'blue' | 'amber' | 'rose' | 'slate' | 'cyan';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color = 'blue',
  size = 'md',
  showLabel = false,
  className,
}) => {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const colorStyles = {
    emerald: 'bg-semantic-success',
    blue: 'bg-brand-blue',
    amber: 'bg-semantic-warning',
    rose: 'bg-semantic-error',
    slate: 'bg-text-muted',
    cyan: 'bg-brand-cyan',
  };

  const heightStyles = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={clsx('w-full', className)}>
      <div className={clsx('w-full bg-border rounded-full overflow-hidden', heightStyles[size])}>
        <div
          className={clsx('h-full transition-all duration-500 rounded-full', colorStyles[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs text-text-secondary mt-1">
          <span>{percentage}%</span>
        </div>
      )}
    </div>
  );
};

