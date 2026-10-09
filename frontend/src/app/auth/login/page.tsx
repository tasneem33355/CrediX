'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Globe,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { UserRole } from '@/types';
import { CredixLogo } from '@/components/ui/CredixLogo';
import { ClientSignupError, signUpClient } from '@/lib/auth/signup';
import { SignInError } from '@/lib/auth/signin';
import { AuthApiError } from '@/lib/auth/api';
import { isDemoMode } from '@/lib/config';

const DEMO_CREDENTIALS: Record<UserRole, {
  email: string;
  password: string;
  name: string;
  nameEn: string;
  roleLabel: string;
  roleLabelEn: string;
  subtitle: string;
  subtitleEn: string;
  initials: string;
  target: string;
}> = {
  client: {
    email: 'ahmed.fouad@credix.demo',
    password: 'Demo@1234',
    name: 'أحمد فؤاد عبد الله',
    nameEn: 'Ahmed Fouad Abdallah',
    roleLabel: 'مقدم طلب تمويل',
    roleLabelEn: 'Financing Applicant',
    subtitle: 'بوابة العميل • تمويل المشروعات',
    subtitleEn: 'Client Portal • SME Financing',
    initials: 'AF',
    target: '/portal',
  },
  officer: {
    email: 'mohamed.sami@credix.demo',
    password: 'Demo@1234',
    name: 'محمد سامي',
    nameEn: 'Mohamed Sami',
    roleLabel: 'كبير مسؤولي الائتمان',
    roleLabelEn: 'Senior Credit Officer',
    subtitle: 'لوحة تحكم الائتمان • قرارات التمويل',
    subtitleEn: 'Credit Dashboard • Risk Decisioning',
    initials: 'MS',
    target: '/dashboard',
  },
};

function AuthContent() {
  const { t, language, toggleLanguage, direction } = useLanguage();
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const initialRole = searchParams.get('role') === 'officer'
    ? 'officer'
    : searchParams.get('role') === 'client' || initialMode === 'signup'
      ? 'client'
      : 'officer';

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode);
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(() => (
    isDemoMode && initialMode === 'signin'
      ? DEMO_CREDENTIALS[initialRole].email
      : ''
  ));
  const [nationalId, setNationalId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState(() => (
    isDemoMode && initialMode === 'signin'
      ? DEMO_CREDENTIALS[initialRole].password
      : ''
  ));
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [portalMismatchRole, setPortalMismatchRole] = useState<UserRole | null>(null);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  const handleRoleChange = useCallback((role: UserRole) => {
    setSelectedRole(role);
    setFormError('');
    setPortalMismatchRole(null);
    setSuccessMessage('');
    setNeedsVerification(false);
    if (isDemoMode && authMode === 'signin') {
      setEmail(DEMO_CREDENTIALS[role].email);
      setPassword(DEMO_CREDENTIALS[role].password);
    }
  }, [authMode]);

  const handleModeChange = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setSuccessMessage('');
    setFormError('');
    setPortalMismatchRole(null);
    setPendingVerification(false);
    setNeedsVerification(false);
    if (isDemoMode) {
      if (mode === 'signin') {
        setEmail(DEMO_CREDENTIALS[selectedRole].email);
        setPassword(DEMO_CREDENTIALS[selectedRole].password);
      } else {
        setEmail('');
        setPassword('');
      }
    }
  };

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'client' || roleParam === 'officer') {
      handleRoleChange(roleParam as UserRole);
    }
  }, [searchParams, handleRoleChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setNeedsVerification(false);

    if (authMode === 'signup') {
      if (selectedRole === 'officer') {
        setFormError(language === 'ar'
          ? 'حسابات موظفي الائتمان تصدر من المؤسسة ولا يمكن إنشاؤها من التسجيل العام.'
          : 'Credit Officer accounts are issued by the institution and cannot be created through public sign-up.');
        return;
      }

      if (!fullName.trim()) {
        setFormError(language === 'ar' ? 'الاسم الكامل مطلوب.' : 'Full name is required.');
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        setFormError(language === 'ar' ? 'أدخل بريدًا إلكترونيًا صحيحًا.' : 'Enter a valid email address.');
        return;
      }
      if (!password) {
        setFormError(language === 'ar' ? 'كلمة المرور مطلوبة.' : 'Password is required.');
        return;
      }
      if (password !== confirmPassword) {
        setFormError(language === 'ar' ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
        return;
      }

      setLoading(true);
      try {
        if (!isDemoMode) {
          await signUpClient({ fullName: fullName.trim(), email: email.trim(), password });
        }
        setPendingVerification(true);
        setSuccessMessage(isDemoMode
          ? 'Demo account created successfully. Continue to the verification preview.'
          : language === 'ar'
          ? 'إذا أمكن تسجيل هذا البريد، فقد أرسلنا تعليمات التحقق.'
          : "If this email can be registered, we've sent verification instructions.");
        window.setTimeout(() => router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`), 700);
      } catch (error) {
        setFormError(error instanceof ClientSignupError
          ? error.message
          : language === 'ar'
            ? 'تعذر إنشاء الحساب الآن. حاول مرة أخرى.'
            : "We couldn't create the account right now. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setPortalMismatchRole(null);
    try {
      const profile = await signIn(email.trim(), password, selectedRole);
      const actualRole = profile.role;

      if (actualRole !== selectedRole) {
        setPortalMismatchRole(actualRole);
        throw new SignInError(
          selectedRole === 'client'
            ? (language === 'ar'
                ? 'عفواً، هذا الحساب مخصص لمسؤول ائتمان ولا يمكن استخدامه عبر بوابة العملاء. يرجى التبديل إلى تبويب "موظف ائتمان".'
                : 'This account belongs to a Credit Officer and cannot be accessed via the Client Portal. Please switch to the Credit Officer tab.')
            : (language === 'ar'
                ? 'عفواً، هذا الحساب مسجل كعميل مقترض ولا يملك صلاحيات موظف ائتمان. يرجى التبديل إلى تبويب "مقدم طلب تمويل".'
                : 'This account belongs to a Client and does not have Credit Officer permissions. Please switch to the Financing Applicant tab.'),
          selectedRole === 'client'
            ? 'PORTAL_MISMATCH_OFFICER_ON_CLIENT_PORTAL'
            : 'PORTAL_MISMATCH_CLIENT_ON_OFFICER_PORTAL'
        );
      }

      setSuccessMessage(
        language === 'ar'
          ? 'تم تسجيل الدخول بنجاح. جاري فتح مساحة العمل...'
          : 'Signed in securely. Loading your CrediX workspace...'
      );

      const redirectParam = searchParams.get('redirect');
      const target = actualRole === 'client'
        ? redirectParam === '/apply' || redirectParam === '/portal' ? redirectParam : '/portal'
        : redirectParam && !redirectParam.startsWith('/portal') && !redirectParam.startsWith('/apply')
          ? redirectParam
          : '/dashboard';
      window.setTimeout(() => router.push(target), 300);
    } catch (error) {
      if (error instanceof SignInError) {
        setFormError(error.message);
        if (error.code === 'PORTAL_MISMATCH_OFFICER_ON_CLIENT_PORTAL') {
          setPortalMismatchRole('officer');
        } else if (error.code === 'PORTAL_MISMATCH_CLIENT_ON_OFFICER_PORTAL') {
          setPortalMismatchRole('client');
        }
        setNeedsVerification(error.code === 'EMAIL_NOT_CONFIRMED');
      } else if (error instanceof AuthApiError) {
        setFormError(error.code === 'PROFILE_NOT_PROVISIONED'
          ? (language === 'ar' ? 'تعذر تجهيز ملف الحساب. حاول مرة أخرى.' : 'Your CrediX profile could not be prepared. Please try again.')
          : (language === 'ar' ? 'خدمات CrediX غير متاحة حالياً.' : 'CrediX services are unavailable right now. Please try again.'));
      } else {
        setFormError(language === 'ar' ? 'تعذر تسجيل الدخول. تأكد من البيانات وحاول مرة أخرى.' : 'We could not sign you in right now. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-6 text-text-primary font-sans selection:bg-brand-navy selection:text-white relative overflow-hidden">
      {/* Ambient background glow mesh */}
      <div className="fixed inset-0 pointer-events-none z-0 ambient-glow-mesh opacity-40" />

      {/* Top Floating Controls */}
      <div className="absolute top-0 start-0 end-0 min-h-[76px] flex items-center z-20">
        <div className="landing-container flex items-center justify-between w-full">
          <CredixLogo href="/" size="md" />

          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-subtle text-xs font-semibold text-text-primary transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Globe className="w-3.5 h-3.5 text-brand-navy" />
              <span>{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md my-16 space-y-6 relative z-10">
        {/* Title Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-text-primary tracking-tight">
            {authMode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
          </h1>
          <p className="text-xs text-text-secondary max-w-xs mx-auto">
            {authMode === 'signin' ? t('auth.signInDesc') : t('auth.signUpDesc')}
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface/90 backdrop-blur-xl border border-border rounded-3xl p-6 sm:p-8 shadow-fintech-lg space-y-6 relative overflow-hidden">
          {/* Subtle top accent line */}
          <div className="absolute top-0 start-0 end-0 h-1 bg-brand-navy" />

          {/* Mode Switcher Tabs (Sign In / Sign Up) */}
          <div className="grid grid-cols-2 gap-1.5 bg-surface-subtle p-1 rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => handleModeChange('signin')}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                authMode === 'signin'
                  ? 'bg-surface text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t('auth.signIn')}
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('signup')}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                authMode === 'signup'
                  ? 'bg-surface text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t('auth.signUp')}
            </button>
          </div>

          {/* Role Selection (Credit Officer vs Financing Client) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary block text-start">
              {t('auth.selectRole')}
            </label>
            <div className="grid grid-cols-2 gap-2 bg-surface-subtle p-1.5 rounded-2xl border border-border">
              <button
                type="button"
                onClick={() => handleRoleChange('officer')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  selectedRole === 'officer'
                    ? 'bg-brand-navy text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 ${selectedRole === 'officer' ? 'text-white' : 'text-brand-navy'}`} />
                <span>{t('auth.roleOfficer')}</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('client')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  selectedRole === 'client'
                    ? 'bg-brand-navy text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <UserCheck className={`w-4 h-4 ${selectedRole === 'client' ? 'text-white' : 'text-brand-navy'}`} />
                <span>{t('auth.roleClient')}</span>
              </button>
            </div>
          </div>

          {/* Subtle Demo Identity Indicator */}
          {isDemoMode && authMode === 'signin' && (
            <div className="p-3 rounded-2xl bg-surface-subtle border border-border flex items-center justify-between gap-3 text-start">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-brand-navy text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {DEMO_CREDENTIALS[selectedRole].initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-text-primary">
                      {language === 'ar'
                        ? DEMO_CREDENTIALS[selectedRole].name
                        : DEMO_CREDENTIALS[selectedRole].nameEn}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-md bg-surface text-[10px] font-bold text-brand-navy border border-border shrink-0">
                      {t('auth.demoAccount')}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary truncate">
                    {language === 'ar'
                      ? DEMO_CREDENTIALS[selectedRole].subtitle
                      : DEMO_CREDENTIALS[selectedRole].subtitleEn}
                  </p>
                </div>
              </div>
              <Sparkles className="w-4 h-4 text-brand-navy shrink-0 opacity-70" />
            </div>
          )}

          {/* Success Message Banner */}
          {successMessage && (
            <div className="p-3 bg-semantic-success-subtle border border-semantic-success/30 rounded-xl text-xs font-semibold text-semantic-success flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {formError && (
            <div role="alert" className="p-3.5 bg-semantic-error-bg border border-semantic-error/30 rounded-2xl text-xs text-semantic-error space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-semantic-error" />
                <span className="font-semibold leading-relaxed">{formError}</span>
              </div>
              {portalMismatchRole && (
                <div className="pt-2 border-t border-semantic-error/20 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      handleRoleChange(portalMismatchRole);
                      setPortalMismatchRole(null);
                      setFormError('');
                    }}
                    className="text-xs font-bold text-brand-navy hover:underline flex items-center gap-1 cursor-pointer bg-surface px-3 py-1.5 rounded-xl border border-border shadow-2xs transition-all active:scale-95"
                  >
                    <span>
                      {portalMismatchRole === 'officer'
                        ? (language === 'ar' ? 'التبديل إلى بوابة موظف الائتمان' : 'Switch to Credit Officer Portal')
                        : (language === 'ar' ? 'التبديل إلى بوابة العميل' : 'Switch to Client Portal')}
                    </span>
                    <Arrow className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {needsVerification && (
            <Link href="/verify-email" className="-mt-3 block text-center text-xs font-semibold text-brand-navy hover:underline">
              Continue to email verification
            </Link>
          )}

          {/* Interactive Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-start">
            {/* Sign Up extra fields */}
            {authMode === 'signup' && (
              <>
                <Input
                  label={t('auth.fullName')}
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label={t('auth.nationalId')}
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    required
                  />
                  <Input
                    label={t('auth.mobileNumber')}
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {/* Email Field */}
            <Input
              label={t('auth.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={isDemoMode && authMode === 'signin'}
              helperText={isDemoMode && authMode === 'signin' ? t('auth.demoCredentialsPrefilled') : undefined}
              required
            />

            {/* Password Field */}
            <Input
              label={t('auth.password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              readOnly={isDemoMode && authMode === 'signin'}
              required
            />

            {/* Confirm Password in Sign Up */}
            {authMode === 'signup' && (
              <Input
                label={t('auth.confirmPassword')}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            )}

            {/* Remember Me & Forgot Password */}
            {authMode === 'signin' && (
              <div className="flex items-center justify-between text-xs text-text-secondary pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded bg-surface border-border text-brand-navy focus:ring-0"
                  />
                  <span>{t('auth.rememberMe')}</span>
                </label>
                <a href="#" className="text-brand-navy hover:underline transition-colors">
                  {t('auth.forgotPassword')}
                </a>
              </div>
            )}

            {/* Submit Action Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-3 shadow-xs"
              isLoading={loading}
              disabled={pendingVerification}
              formNoValidate={authMode === 'signup' && selectedRole === 'officer'}
              icon={<Arrow className="w-4 h-4" />}
            >
              {authMode === 'signin'
                ? selectedRole === 'officer'
                  ? t('auth.enterOfficerDashboard')
                  : t('auth.enterClientPortal')
                : selectedRole === 'officer'
                ? t('auth.registerOfficer')
                : t('auth.registerClient')}
            </Button>
          </form>




        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link href="/" className="text-xs text-text-secondary hover:text-text-primary transition-colors">
            {language === 'ar' ? '← العودة إلى الصفحة الرئيسية' : '← Back to Home'}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-text-secondary text-xs">Loading authentication...</div>}>
      <AuthContent />
    </Suspense>
  );
}
