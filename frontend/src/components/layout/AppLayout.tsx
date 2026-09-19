'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { RequireRole } from '@/components/auth/RequireRole';

export interface AppLayoutProps {
  children: React.ReactNode;
  breadcrumbTitle?: string;
  breadcrumbParent?: string;
  breadcrumbParentHref?: string;
  fullHeight?: boolean;
}

/**
 * AppLayout — Main application shell with responsive sidebar.
 *
 * Desktop (≥1024px):
 *   • Sidebar is always visible, can be expanded (16rem) or collapsed (4.5rem / icon-only).
 *   • Collapse state is persisted in localStorage.
 *
 * Mobile / Tablet (<1024px):
 *   • Sidebar is hidden by default.
 *   • Opened as a slide-over drawer with an overlay.
 *   • Body scroll is locked while the drawer is open.
 */
export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  breadcrumbTitle,
  breadcrumbParent,
  breadcrumbParentHref,
  fullHeight = false,
}) => {
  // Desktop collapse state (persisted)
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Mobile drawer state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Restore persisted collapse preference
  useEffect(() => {
    const saved = localStorage.getItem('credix_sidebar_collapsed');
    if (saved === 'true') setIsCollapsed(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('credix_sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  const openMobile = useCallback(() => {
    setIsMobileOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeMobile = useCallback(() => {
    setIsMobileOpen(false);
    document.body.style.overflow = '';
  }, []);

  // Close mobile drawer on route change (pathname changes) or resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMobileOpen) {
        closeMobile();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileOpen, closeMobile]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) {
        closeMobile();
      }
    };
    if (isMobileOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isMobileOpen, closeMobile]);

  return (
    <RequireRole allowedRole="officer">
    <div className="flex h-screen bg-background text-text-primary font-sans relative overflow-hidden">
      {/* Ambient background glow mesh */}
      <div className="fixed inset-0 pointer-events-none z-0 ambient-glow-mesh opacity-40" />

      {/* ─── Mobile Overlay ─── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 sidebar-overlay transition-opacity duration-smooth ease-smooth-in-out lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* ─── Sidebar ─── */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapsed}
        isMobileOpen={isMobileOpen}
        onCloseMobile={closeMobile}
      />

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative z-10 overflow-hidden">
        <TopHeader
          breadcrumbTitle={breadcrumbTitle}
          breadcrumbParent={breadcrumbParent}
          breadcrumbParentHref={breadcrumbParentHref}
          onOpenMobileMenu={openMobile}
          isSidebarCollapsed={isCollapsed}
        />
        <main
          className={clsx(
            'flex-1 w-full',
            fullHeight
              ? 'p-3 sm:p-4 lg:p-5 flex flex-col overflow-y-auto lg:overflow-hidden min-h-0'
              : 'p-4 sm:p-6 lg:p-8 overflow-y-auto'
          )}
        >
          <div
            className={clsx(
              'max-w-7xl mx-auto w-full',
              fullHeight ? 'flex-1 flex flex-col min-h-0 h-full' : ''
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
    </RequireRole>
  );
};
