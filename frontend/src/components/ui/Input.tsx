'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, showPasswordToggle, type, className, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const isPassword = type === 'password';
    const isPasswordToggleEnabled = isPassword && showPasswordToggle !== false;
    const effectiveType = isPassword && showPassword ? 'text' : type;
    const hasRightContent = Boolean(rightIcon || isPasswordToggleEnabled);

    return (
      <div className="w-full space-y-1.5 text-start">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-text-primary">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-text-muted">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type={effectiveType}
            className={clsx(
              'w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-transparent disabled:opacity-50 disabled:bg-surface-subtle',
              leftIcon ? 'ps-10' : 'ps-3.5',
              hasRightContent ? 'pe-10' : 'pe-3.5',
              error
                ? 'border-semantic-error focus:ring-semantic-error'
                : 'border-border hover:border-border-strong',
              className
            )}
            {...props}
          />
          {isPasswordToggleEnabled ? (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 end-0 flex items-center pe-3.5 text-text-muted hover:text-text-primary transition-colors cursor-pointer focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          ) : rightIcon ? (
            <div className="absolute inset-y-0 end-0 flex items-center pe-3.5 pointer-events-none text-text-muted">
              {rightIcon}
            </div>
          ) : null}
        </div>
        {error && <p className="text-xs text-semantic-error mt-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-text-secondary mt-1">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

