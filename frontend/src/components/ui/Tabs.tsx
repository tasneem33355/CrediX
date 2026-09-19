import React from 'react';
import { clsx } from 'clsx';

export interface TabItem {
  id: string;
  label: string;
  badge?: number | string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div className={clsx('border-b border-border', className)}>
      <nav className="flex space-x-6 rtl:space-x-reverse -mb-px overflow-x-auto no-scrollbar" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={clsx(
                'group inline-flex items-center gap-2 py-3.5 px-1 border-b-2 text-sm font-medium transition-all whitespace-nowrap cursor-pointer',
                isActive
                  ? 'border-brand-navy text-brand-navy font-semibold'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-strong'
              )}
            >
              {tab.icon && <span className={clsx('shrink-0', isActive ? 'text-brand-navy' : 'text-text-muted')}>{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={clsx(
                    'ms-1.5 rounded-full px-2 py-0.5 text-xs font-semibold',
                    isActive
                  ? 'bg-[#E8EEF5] text-brand-navy'
                  : 'bg-surface-subtle text-text-secondary'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
