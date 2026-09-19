import React from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'neutral',
  size = 'md',
  dot = false,
  ...props
}) => {
  const variantStyles = {
    success: 'bg-semantic-success-bg text-semantic-success border border-semantic-success-border',
    warning: 'bg-semantic-warning-bg text-semantic-warning border border-semantic-warning-border',
    danger: 'bg-semantic-error-bg text-semantic-error border border-semantic-error-border',
    info: 'bg-[#E8EEF5] text-brand-navy border border-[#D7E2E8]',
    neutral: 'bg-surface-subtle text-text-secondary border border-border',
    purple: 'bg-[#E8EEF5] text-brand-navy border border-[#D7E2E8]',
  };

  const dotColors = {
    success: 'bg-semantic-success',
    warning: 'bg-semantic-warning',
    danger: 'bg-semantic-error',
    info: 'bg-brand-navy',
    neutral: 'bg-text-muted',
    purple: 'bg-brand-navy',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors select-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
};
