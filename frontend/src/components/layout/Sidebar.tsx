'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  FileSearch,
  ShieldAlert,
  Bot,
  Briefcase,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { CredixLogo } from '@/components/ui/CredixLogo';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const pathname = usePathname();
  const { t, direction, language } = useLanguage();
  const sidebarRef = useRef<HTMLElement>(null);

  const navItems = [
    {
      id: 'dashboard',
      label: t('nav.dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'applications',
      label: t('nav.applications'),
      href: '/applications',
      icon: FileText,
    },
    {
      id: 'documents',
      label: t('nav.documentAnalysis'),
      href: '/documents',
      icon: FileSearch,
    },
    
    {
      id: 'fraud-detection',
      label: t('nav.fraudDetection'),
      href: '/fraud-detection',
      icon: ShieldAlert,
    },
    {
      id: 'ai-assistant',
      label: t('nav.aiAssistant'),
      href: '/ai-assistant',
      icon: Bot,
    },
    {
      id: 'case-management',
      label: t('nav.caseManagement'),
      href: '/case-management',
      icon: Briefcase,
    },
  ];

  // Close mobile drawer on route change
  useEffect(() => {
    if (isMobileOpen) {
      onCloseMobile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Trap focus inside mobile drawer when open
  useEffect(() => {
    if (!isMobileOpen || !sidebarRef.current) return;

    const sidebar = sidebarRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = sidebar.querySelectorAll<HTMLElement>(focusableSelector);
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    // Focus the close button when drawer opens
    const closeBtn = sidebar.querySelector<HTMLElement>('[data-sidebar-close]');
    closeBtn?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl?.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl?.focus();
        }
      }
    };

    sidebar.addEventListener('keydown', handleTab);
    return () => sidebar.removeEventListener('keydown', handleTab);
  }, [isMobileOpen]);

  // Determine if an item is active
  const isItemActive = (href: string, id: string) => {
    if (pathname === href) return true;
    if (href === '/dashboard' || href === '/apply') return false;
    if (id === 'credit-assessment') return pathname === href;
    return pathname.startsWith(href);
  };

  // Collapse toggle icon adapts to RTL
  const CollapseIcon = isCollapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside
      ref={sidebarRef}
      role="complementary"
      aria-label={t('nav.mainMenu')}
      style={{ backgroundColor: '#102A3D' }}
      className={clsx(
        // Base styles - Authentic deep brand navy matching CrediX brand identity
        'bg-[#102A3D] text-[#E8EEF5] flex flex-col select-none z-50',
        'transition-all duration-drawer ease-smooth-in-out',
        // ── Desktop ──
        'hidden lg:flex h-full shrink-0 border-e border-white/10',
        isCollapsed ? 'lg:w-sidebar-collapsed' : 'lg:w-sidebar',
        // ── Mobile Drawer ──
        isMobileOpen && '!flex fixed inset-y-0 start-0 w-sidebar shadow-2xl',
      )}
    >
      {/* ─── Brand Header (Height synchronized with TopHeader: h-14 sm:h-16) ─── */}
      <div
        className={clsx(
          'flex border-b border-white/10 transition-all duration-smooth h-14 sm:h-16 shrink-0',
          isCollapsed && !isMobileOpen
            ? 'items-center justify-center px-2'
            : 'items-center justify-between px-4 sm:px-5'
        )}
      >
        {/* Mobile close button - shown only in mobile drawer mode */}
        {isMobileOpen && (
          <button
            data-sidebar-close
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-[#E8EEF5]/70 hover:text-white hover:bg-white/10 transition-colors duration-fast me-2"
            aria-label={t('action.close')}
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Logo - cleanly centered in collapsed mode, brand lockup in expanded mode */}
        <div className={clsx('flex items-center', isCollapsed && !isMobileOpen ? 'justify-center w-full' : '')}>
          <CredixLogo
            href="/dashboard"
            size="sm"
            variant="white"
            iconOnly={isCollapsed && !isMobileOpen}
            showTagline={!isCollapsed || isMobileOpen}
          />
        </div>
      </div>

      {/* ─── Main Navigation Menu ─── */}
      <div className="flex-1 px-2.5 py-4 overflow-y-auto overflow-x-hidden">
        <div>
          {/* Section label - hidden when collapsed on desktop */}
          {(!isCollapsed || isMobileOpen) && (
            <p className="px-3 text-[11px] font-semibold tracking-wider text-[#BAC7D5]/70 uppercase mb-2.5">
              {t('nav.mainMenu')}
            </p>
          )}
          <nav className="space-y-1" aria-label={t('nav.mainMenu')}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item.href, item.id);
              const showLabel = !isCollapsed || isMobileOpen;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  title={!showLabel ? item.label : undefined}
                  className={clsx(
                    'flex items-center justify-between rounded-xl text-[13px] font-medium',
                    'transition-all duration-normal ease-smooth-in-out group relative',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-1 focus-visible:ring-offset-brand-navy',
                    isCollapsed && !isMobileOpen
                      ? 'px-0 py-2.5 justify-center'
                      : 'px-3 py-2.5',
                    isActive
                      ? 'bg-[#1B3A5C] text-white font-semibold shadow-xs border border-white/15'
                      : 'text-[#BAC7D5] hover:text-white hover:bg-white/10 active:bg-white/15'
                  )}
                >
                  <div
                    className={clsx(
                      'flex items-center',
                      showLabel ? 'gap-3' : 'justify-center w-full'
                    )}
                  >
                    <Icon
                      className={clsx(
                        'w-[18px] h-[18px] shrink-0 transition-all duration-normal',
                        isActive
                          ? 'text-white'
                          : 'text-[#BAC7D5]/80 group-hover:text-white group-hover:scale-105'
                      )}
                      aria-hidden="true"
                    />
                    {showLabel && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </div>
                  {item.badge && showLabel && (
                    <span
                      className="min-w-[20px] h-5 rounded-full bg-semantic-error text-white text-[11px] font-bold flex items-center justify-center px-1.5 shadow-sm"
                      aria-label={`${item.badge}`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {/* Collapsed badge dot */}
                  {item.badge && !showLabel && (
                    <span
                      className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-semantic-error ring-2 ring-brand-navy"
                      aria-label={`${item.badge}`}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ─── Desktop Bottom Collapse Bar ─── */}
      {!isMobileOpen && (
        <div
          className={clsx(
            'hidden lg:flex border-t border-white/10 p-2.5 shrink-0 transition-all duration-smooth',
            isCollapsed ? 'items-center justify-center' : 'items-center justify-between'
          )}
        >
          {!isCollapsed && (
            <span className="text-[11px] font-medium text-[#BAC7D5]/70 truncate select-none px-2">
              {language === 'ar' ? 'طي القائمة' : 'Collapse Sidebar'}
            </span>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className={clsx(
              'p-2 rounded-xl text-[#BAC7D5] hover:text-white hover:bg-white/10',
              'transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-1 focus-visible:ring-offset-brand-navy',
              isCollapsed ? 'mx-auto' : ''
            )}
            aria-label={isCollapsed ? t('nav.mainMenu') : t('action.close')}
            title={
              isCollapsed
                ? language === 'ar'
                  ? 'توسيع القائمة'
                  : 'Expand Sidebar'
                : language === 'ar'
                ? 'طي القائمة'
                : 'Collapse Sidebar'
            }
          >
            <CollapseIcon
              className={clsx(
                'w-4 h-4 transition-transform duration-normal',
                direction === 'rtl' && 'scale-x-[-1]'
              )}
            />
          </button>
        </div>
      )}
    </aside>
  );
};
