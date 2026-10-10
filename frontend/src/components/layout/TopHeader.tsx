'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Globe,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Home,
  Menu,
  LogOut,
  Shield,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { isDemoMode } from '@/lib/config';
import type { OfficerTier } from '@/types';
import { Avatar } from '@/components/ui/Avatar';

export interface TopHeaderProps {
  breadcrumbTitle?: string;
  breadcrumbParent?: string;
  breadcrumbParentHref?: string;
  onOpenMobileMenu?: () => void;
  isSidebarCollapsed?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  breadcrumbTitle = 'Dashboard',
  breadcrumbParent,
  breadcrumbParentHref = '/dashboard',
  onOpenMobileMenu,
  isSidebarCollapsed,
}) => {
  const { language, toggleLanguage, t, direction } = useLanguage();
  const { user, logout, switchOfficerTier } = useAuth();
  const router = useRouter();
  const Arrow = direction === 'rtl' ? ChevronLeft : ChevronRight;

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isProfileMenuOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isProfileMenuOpen]);

  const handleSignOut = async () => {
    setIsProfileMenuOpen(false);
    await logout();
    router.push('/auth/login');
  };

  const userName = user
    ? language === 'ar'
      ? user.name
      : user.nameEn
    : language === 'ar'
      ? 'محمد سامي'
      : 'Mohamed Sami';

  const userTitle = user
    ? language === 'ar'
      ? user.title
      : user.titleEn
    : language === 'ar'
      ? 'كبير مسؤولي الائتمان'
      : 'Senior Credit Officer';

  return (
    <header
      className={clsx(
        'h-14 sm:h-16 bg-surface/95 backdrop-blur-sm border-b border-border',
        'px-3 sm:px-4 lg:px-6 flex items-center justify-between',
        'sticky top-0 z-20 text-text-primary',
        'transition-all duration-smooth'
      )}
    >
      {/* ─── Left: Mobile menu + Breadcrumb ─── */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile menu hamburger */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className={clsx(
            'lg:hidden p-2 -ms-1 rounded-xl text-text-secondary',
            'hover:text-text-primary hover:bg-surface-subtle',
            'transition-colors duration-fast',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/40'
          )}
          aria-label={language === 'ar' ? 'فتح القائمة' : 'Open menu'}
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Breadcrumb Navigation */}
        <nav
          className="flex items-center gap-1.5 sm:gap-2 text-[13px] sm:text-sm text-text-secondary min-w-0"
          aria-label="Breadcrumb"
        >
          <Link
            href="/"
            className={clsx(
              'hover:text-brand-navy transition-colors duration-fast',
              'flex items-center gap-1.5 shrink-0',
              'focus:outline-none focus-visible:text-brand-navy'
            )}
          >
            <Home className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
            <span className="hidden sm:inline font-medium">{t('nav.breadcrumb.root')}</span>
          </Link>

          <Arrow className="w-3.5 h-3.5 text-text-muted shrink-0" aria-hidden="true" />

          {breadcrumbParent && (
            <>
              <Link
                href={breadcrumbParentHref}
                className="hover:text-brand-navy font-medium transition-colors duration-fast truncate max-w-[130px] sm:max-w-none focus:outline-none focus-visible:text-brand-navy"
              >
                {breadcrumbParent}
              </Link>
              <Arrow className="w-3.5 h-3.5 text-text-muted shrink-0" aria-hidden="true" />
            </>
          )}

          <span
            className="font-bold text-brand-navy truncate max-w-[150px] sm:max-w-none"
            aria-current="page"
          >
            {breadcrumbTitle}
          </span>
        </nav>
      </div>

      {/* ─── Right: Controls ─── */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Language Switcher */}
        <button
          type="button"
          onClick={() => toggleLanguage()}
          className={clsx(
            'hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border',
            'text-xs font-bold text-text-primary',
            'hover:bg-surface-subtle transition-all duration-fast active:scale-95',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30'
          )}
          aria-label={
            language === 'ar'
              ? 'Switch to English'
              : 'التبديل إلى العربية'
          }
        >
          <Globe className="w-3.5 h-3.5 text-text-secondary" aria-hidden="true" />
          <span>{language === 'ar' ? 'EN' : 'ع'}</span>
        </button>

        {/* Mobile-only compact language toggle */}
        <button
          type="button"
          onClick={() => toggleLanguage()}
          className={clsx(
            'sm:hidden h-9 w-9 flex items-center justify-center rounded-lg border border-border',
            'text-text-secondary hover:text-text-primary hover:bg-surface-subtle',
            'transition-all duration-fast active:scale-95',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30'
          )}
          aria-label={
            language === 'ar'
              ? 'Switch to English'
              : 'التبديل إلى العربية'
          }
        >
          <Globe className="w-4 h-4 text-text-secondary" aria-hidden="true" />
        </button>

        {/* Notifications */}
        <button
          type="button"
          className={clsx(
            'relative h-9 w-9 flex items-center justify-center rounded-lg border border-border',
            'text-text-secondary hover:text-text-primary hover:bg-surface-subtle',
            'transition-colors duration-fast',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30'
          )}
          aria-label={t('header.notifications')}
        >
          <Bell className="w-4 h-4" aria-hidden="true" />
          <span
            className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-semantic-error ring-2 ring-surface"
            aria-hidden="true"
          />
          <span className="sr-only">
            {language === 'ar' ? '1 إشعار جديد' : '1 new notification'}
          </span>
        </button>

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-border mx-1" aria-hidden="true" />

        {/* User Profile with Sign Out Dropdown */}
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            aria-expanded={isProfileMenuOpen}
            aria-haspopup="true"
            className={clsx(
              'flex items-center gap-2 sm:gap-2.5 p-1.5 -m-1.5 rounded-xl',
              'hover:bg-surface-subtle transition-all duration-fast cursor-pointer',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30',
              isProfileMenuOpen && 'bg-surface-subtle ring-1 ring-border'
            )}
            title={language === 'ar' ? 'خيارات الملف الشخصي' : 'Profile options'}
          >
            <Avatar
              name={userName}
              status="online"
              size="sm"
            />
            <div className="hidden md:block text-start min-w-0">
              <p className="text-xs sm:text-[13px] font-bold text-text-primary truncate max-w-[120px] lg:max-w-[160px]">
                {userName}
              </p>
              <p className="text-[11px] text-text-secondary truncate max-w-[120px] lg:max-w-[160px]">
                {userTitle}
              </p>
            </div>
            <ChevronDown
              className={clsx(
                'w-3.5 h-3.5 text-text-muted transition-transform duration-200 hidden sm:block',
                isProfileMenuOpen && 'rotate-180 text-brand-navy'
              )}
            />
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileMenuOpen && (
            <div
              className={clsx(
                'absolute end-0 top-full mt-2 w-64 rounded-2xl bg-surface border border-border',
                'shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-fast text-start'
              )}
              role="menu"
              aria-orientation="vertical"
            >
              {/* User Header Info */}
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs font-bold text-text-primary">
                  {userName}
                </p>
                <p className="text-[11px] text-text-muted mt-0.5 font-mono truncate">
                  {user?.email || 'mohamed.sami@credix.demo'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8EEF5] text-brand-navy border border-border">
                    {userTitle}
                  </span>
                  {user?.role === 'officer' && user.approvalLimitEgp !== undefined && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-semantic-success-subtle text-semantic-success border border-semantic-success/20">
                      <Shield className="w-2.5 h-2.5" />
                      {user.approvalLimitEgp >= 50000000
                        ? (language === 'ar' ? 'سقف غير محدود (CRO)' : 'Unlimited (CRO)')
                        : `${user.approvalLimitEgp.toLocaleString('ar-EG')} ج.م`}
                    </span>
                  )}
                </div>
              </div>

              {/* Officer Tier Quick Switcher for RBAC Delegation Testing */}
              {isDemoMode && user?.role === 'officer' && (
                <div className="p-2 border-b border-border bg-surface-subtle/50">
                  <p className="text-[10px] font-bold text-text-muted px-2 mb-1.5">
                    {language === 'ar' ? 'تبديل رتبة الصلاحية الائتمانية:' : 'Switch Credit Tier:'}
                  </p>
                  <div className="space-y-1">
                    {[
                      { tier: 'junior_officer' as OfficerTier, label: 'مسؤول مبتدئ (250 ألف)', labelEn: 'Junior (250K)' },
                      { tier: 'senior_officer' as OfficerTier, label: 'كبير مسؤولي الائتمان (750 ألف)', labelEn: 'Senior (750K)' },
                      { tier: 'risk_manager' as OfficerTier, label: 'مدير مخاطر (3 مليون + استثناء)', labelEn: 'Risk Manager (3M + Override)' },
                      { tier: 'cro' as OfficerTier, label: 'رئيس قطاع المخاطر (غير محدود)', labelEn: 'CRO (Unlimited)' },
                    ].map((item) => (
                      <button
                        key={item.tier}
                        type="button"
                        onClick={() => {
                          if (switchOfficerTier) switchOfficerTier(item.tier);
                          setIsProfileMenuOpen(false);
                        }}
                        className={clsx(
                          'w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-[11px] font-semibold text-start transition-colors',
                          (user?.officerTier || 'senior_officer') === item.tier
                            ? 'bg-brand-navy text-white font-bold'
                            : 'hover:bg-surface text-text-secondary'
                        )}
                      >
                        <span>{language === 'ar' ? item.label : item.labelEn}</span>
                        {(user?.officerTier || 'senior_officer') === item.tier && <Check className="w-3 h-3 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="p-1.5 space-y-0.5 border-t border-border">
                {user?.role === 'officer' && (
                  <Link
                    href="/settings/users"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-text-primary hover:bg-surface-subtle transition-colors duration-fast cursor-pointer"
                    role="menuitem"
                  >
                    <ShieldCheck className="w-4 h-4 text-brand-navy" />
                    <span>{language === 'ar' ? 'إدارة الصلاحيات والفريق' : 'Team & Authority Matrix'}</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className={clsx(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold',
                    'text-semantic-error hover:bg-semantic-error-subtle transition-colors duration-fast cursor-pointer'
                  )}
                  role="menuitem"
                >
                  <LogOut className="w-4 h-4 text-semantic-error" />
                  <span>{language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
