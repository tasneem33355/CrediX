'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';

export function RequireRole({ allowedRole, children }: { allowedRole: UserRole; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`/auth/login?mode=signin&role=${allowedRole}&redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user.role !== allowedRole) {
      router.replace(user.role === 'client' ? '/portal' : '/dashboard');
    }
  }, [allowedRole, isLoading, pathname, router, user]);

  if (isLoading || !user || user.role !== allowedRole) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center text-xs font-semibold text-text-secondary">
        Loading your secure CrediX session…
      </main>
    );
  }

  return <>{children}</>;
}
