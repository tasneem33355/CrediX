'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

export const Breadcrumb: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => {
  const { direction } = useLanguage();
  const Separator = direction === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <nav
      className="flex items-center gap-1.5 sm:gap-2 text-xs text-text-secondary"
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className={clsx(
                  'hover:text-brand-navy transition-colors duration-fast',
                  'focus:outline-none focus-visible:text-brand-navy focus-visible:underline',
                  'truncate max-w-[160px]'
                )}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={clsx(
                  isLast && 'font-semibold text-text-primary truncate max-w-[200px]'
                )}
                {...(isLast ? { 'aria-current': 'page' as const } : {})}
              >
                {item.label}
              </span>
            )}
            {!isLast && (
              <Separator
                className="w-3.5 h-3.5 text-text-muted shrink-0"
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
