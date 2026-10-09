'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { User, UserRole, OfficerTier } from '@/types';
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
  switchOfficerTier?: (tier: OfficerTier) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_OFFICERS: Record<OfficerTier, User> = {
  junior_officer: {
    id: 'usr_officer_junior',
    name: 'أحمد هلال',
    nameEn: 'Ahmed Helal',
    email: 'ahmed.helal@credix.demo',
    role: 'officer',
    officerTier: 'junior_officer',
    approvalLimitEgp: 250000,
    canOverridePolicy: false,
    title: 'مسؤول ائتمان مبتدئ',
    titleEn: 'Junior Credit Officer',
  },
  senior_officer: {
    id: 'usr_officer_01',
    name: 'محمد سامي',
    nameEn: 'Mohamed Sami',
    email: 'mohamed.sami@credix.demo',
    role: 'officer',
    officerTier: 'senior_officer',
    approvalLimitEgp: 750000,
    canOverridePolicy: false,
    title: 'كبير مسؤولي الائتمان',
    titleEn: 'Senior Credit Officer',
  },
  risk_manager: {
    id: 'usr_officer_manager',
    name: 'سارة الشناوي',
    nameEn: 'Sara El-Shennawy',
    email: 'sara.shennawy@credix.demo',
    role: 'officer',
    officerTier: 'risk_manager',
    approvalLimitEgp: 3000000,
    canOverridePolicy: true,
    title: 'مدير إدارة مخاطر الائتمان',
    titleEn: 'Credit Risk Manager',
  },
  cro: {
    id: 'usr_cro',
    name: 'د. طارق عبد العزيز',
    nameEn: 'Dr. Tarek Abdelaziz',
    email: 'tarek.abdelaziz@credix.demo',
    role: 'officer',
    officerTier: 'cro',
    approvalLimitEgp: 100000000,
    canOverridePolicy: true,
    title: 'رئيس قطاع المخاطر والائتمان (CRO)',
    titleEn: 'Chief Risk Officer',
  },
};

const demoOfficer: User = DEMO_OFFICERS.senior_officer;

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
      const storedTier = (typeof window !== 'undefined' ? sessionStorage.getItem('credix_demo_officer_tier') : null) as OfficerTier | null;
      if (storedRole === 'officer') {
        const activeOfficer = (storedTier && DEMO_OFFICERS[storedTier]) ? DEMO_OFFICERS[storedTier] : demoOfficer;
        setUser(activeOfficer);
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

  const switchOfficerTier = useCallback((tier: OfficerTier) => {
    if (DEMO_OFFICERS[tier]) {
      const selected = DEMO_OFFICERS[tier];
      setUser(selected);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('credix_demo_officer_tier', tier);
        sessionStorage.setItem('credix_demo_role', 'officer');
      }
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string, expectedRole: UserRole): Promise<User> => {
    if (isDemoMode) {
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      const cleanEmail = (email || '').trim().toLowerCase();

      // Check for portal mismatch in demo mode:
      const isOfficerEmail = cleanEmail.includes('officer') || cleanEmail.includes('sami') || cleanEmail.includes('helal') || cleanEmail.includes('shennawy') || cleanEmail.includes('tarek') || cleanEmail === 'mohamed.sami@credix.demo';
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

      let demoProfile: User = demoClient;
      if (expectedRole === 'officer') {
        if (cleanEmail.includes('helal') || cleanEmail.includes('junior')) {
          demoProfile = DEMO_OFFICERS.junior_officer;
          sessionStorage.setItem('credix_demo_officer_tier', 'junior_officer');
        } else if (cleanEmail.includes('shennawy') || cleanEmail.includes('manager')) {
          demoProfile = DEMO_OFFICERS.risk_manager;
          sessionStorage.setItem('credix_demo_officer_tier', 'risk_manager');
        } else if (cleanEmail.includes('tarek') || cleanEmail.includes('cro')) {
          demoProfile = DEMO_OFFICERS.cro;
          sessionStorage.setItem('credix_demo_officer_tier', 'cro');
        } else {
          demoProfile = DEMO_OFFICERS.senior_officer;
          sessionStorage.setItem('credix_demo_officer_tier', 'senior_officer');
        }
      }

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
        sessionStorage.removeItem('credix_demo_officer_tier');
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
        switchOfficerTier,
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
