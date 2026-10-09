'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { User, UserRole } from '@/types';
import { AuthApiError, getCredixProfile } from '@/lib/auth/api';
import { signInWithCredixProfile, SignInError } from '@/lib/auth/signin';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isDemoMode } from '@/lib/config';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string, expectedRole: UserRole) => Promise<User>;
  refreshProfile: () => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const demoOfficer: User = {
  id: 'usr_officer_01',
  name: 'محمد سامي',
  nameEn: 'Mohamed Sami',
  email: 'mohamed.sami@credix.demo',
  role: 'officer',
  title: 'كبير مسؤولي الائتمان',
  titleEn: 'Senior Credit Officer',
};

const demoClient: User = {
  id: 'usr_client_01',
  name: 'أحمد فؤاد عبد الله',
  nameEn: 'Ahmed Fouad Abdallah',
  email: 'ahmed.fouad@credix.demo',
  role: 'client',
  title: 'مقدم طلب تمويل',
  titleEn: 'Financing Applicant',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadExistingProfile = useCallback(async (activeSession: Session): Promise<User | null> => {
    try {
      const profile = await getCredixProfile(activeSession.access_token);
      setUser(profile);
      return profile;
    } catch (error) {
      setUser(null);
      if (error instanceof AuthApiError && error.code === 'PROFILE_NOT_PROVISIONED') {
        return null;
      }
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<User | null> => {
    if (isDemoMode) {
      return user;
    }
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (!data.session) {
      setUser(null);
      return null;
    }
    return loadExistingProfile(data.session);
  }, [loadExistingProfile, user]);

  useEffect(() => {
    if (isDemoMode) {
      const storedRole = typeof window !== 'undefined' ? sessionStorage.getItem('credix_demo_role') : null;
      if (storedRole === 'officer') {
        setUser(demoOfficer);
      } else if (storedRole === 'client') {
        setUser(demoClient);
      } else {
        setUser(null);
      }
      setIsLoading(false);
      return;
    }

    let mounted = true;
    const supabase = getSupabaseBrowserClient();
    localStorage.removeItem('credix_role');

    const restore = async (restoredSession: Session | null) => {
      if (!mounted) return;
      setSession(restoredSession);
      if (restoredSession) {
        await loadExistingProfile(restoredSession);
      } else {
        setUser(null);
      }
      if (mounted) setIsLoading(false);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setIsLoading(false);
        return;
      }
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        void restore(nextSession);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadExistingProfile]);

  const signIn = useCallback(async (email: string, password: string, expectedRole: UserRole): Promise<User> => {
    if (isDemoMode) {
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      const cleanEmail = (email || '').trim().toLowerCase();

      // Check for portal mismatch in demo mode:
      const isOfficerEmail = cleanEmail.includes('officer') || cleanEmail.includes('sami') || cleanEmail === 'mohamed.sami@credix.demo';
      const isClientEmail = cleanEmail.includes('client') || cleanEmail.includes('fouad') || cleanEmail === 'ahmed.fouad@credix.demo';

      if (expectedRole === 'client' && isOfficerEmail) {
        throw new SignInError(
          'عفواً، هذا الحساب مخصص لمسؤول ائتمان ولا يمكن استخدامه عبر بوابة العملاء. يرجى التبديل إلى تبويب "موظف ائتمان".',
          'PORTAL_MISMATCH_OFFICER_ON_CLIENT_PORTAL'
        );
      }

      if (expectedRole === 'officer' && isClientEmail) {
        throw new SignInError(
          'عفواً، هذا الحساب مسجل كعميل مقترض ولا يملك صلاحيات موظف ائتمان. يرجى التبديل إلى تبويب "مقدم طلب تمويل".',
          'PORTAL_MISMATCH_CLIENT_ON_OFFICER_PORTAL'
        );
      }

      const demoProfile = expectedRole === 'officer' ? demoOfficer : demoClient;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('credix_demo_role', expectedRole);
      }
      setSession(null);
      setUser(demoProfile);
      setIsLoading(false);
      return demoProfile;
    }

    const result = await signInWithCredixProfile(email, password, expectedRole);
    setSession(result.session);
    setUser(result.profile);
    setIsLoading(false);
    return result.profile;
  }, []);

  const logout = useCallback(async () => {
    if (isDemoMode) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('credix_demo_role');
      }
      setSession(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    try {
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setUser(null);
      localStorage.removeItem('credix_role');
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: isDemoMode ? Boolean(user) : Boolean(session && user),
        isLoading,
        signIn,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
