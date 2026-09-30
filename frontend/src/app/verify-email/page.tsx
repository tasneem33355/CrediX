'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Loader2, MailCheck, ShieldAlert } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { CredixLogo } from '@/components/ui/CredixLogo';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { provisionCurrentClient, ProvisioningError } from '@/lib/auth/provision';
import { isDemoMode } from '@/lib/config';

type VerificationState =
  | 'checking'
  | 'verified'
  | 'provisioning'
  | 'success'
  | 'unavailable'
  | 'invalid'
  | 'error';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<VerificationState>('checking');
  const [message, setMessage] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (isDemoMode) {
      setState('success');
      return;
    }

    const confirmationError = searchParams.get('error') || searchParams.get('error_code');
    if (confirmationError) {
      setState('invalid');
      return;
    }

    async function completeVerification() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setState('error');
          setMessage('We could not read the verification session. Please continue to Sign In.');
          return;
        }

        if (!data.session) {
          setState('unavailable');
          return;
        }

        setState('verified');
        await new Promise((resolve) => window.setTimeout(resolve, 250));
        setState('provisioning');
        await provisionCurrentClient();
        setState('success');
      } catch (error) {
        if (error instanceof ProvisioningError && error.code === 'SESSION_UNAVAILABLE') {
          setState('unavailable');
          return;
        }
        setState('error');
        setMessage(error instanceof ProvisioningError
          ? error.message
          : 'We could not complete your CrediX profile setup. Please try again from the email link.');
      }
    }

    void completeVerification();
  }, [searchParams]);

  const isBusy = state === 'checking' || state === 'verified' || state === 'provisioning';
  const title = state === 'success'
    ? 'Email verified'
    : state === 'invalid'
      ? 'Verification link unavailable'
      : state === 'unavailable'
        ? 'Email verified'
        : state === 'error'
          ? 'Profile setup needs attention'
          : 'Checking your verification';

  const description = state === 'checking'
    ? 'We are checking the secure Supabase confirmation session.'
    : state === 'verified'
      ? 'Your email is verified. Preparing your secure CrediX profile.'
      : state === 'provisioning'
        ? 'Setting up your CrediX financing profile securely.'
        : state === 'success'
          ? 'Your verified client profile is ready. Continue to Sign In when you are ready.'
          : state === 'unavailable'
            ? 'Your email may be verified, but this browser does not have an active session. Continue to Sign In to finish securely.'
            : state === 'invalid'
              ? 'This confirmation link is invalid or expired. Request a new confirmation email and try again.'
              : message || 'We could not finish the verification flow. Please continue to Sign In or try the confirmation link again.';

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4 text-text-primary">
      <section className="w-full max-w-md rounded-3xl border border-border bg-surface/90 p-8 text-center shadow-fintech-lg">
        <div className="mb-7 flex justify-center"><CredixLogo href="/" size="md" /></div>

        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-subtle">
          {isBusy && <Loader2 className="h-6 w-6 animate-spin text-brand-navy" aria-hidden="true" />}
          {state === 'success' && <CheckCircle2 className="h-6 w-6 text-semantic-success" aria-hidden="true" />}
          {state === 'unavailable' && <MailCheck className="h-6 w-6 text-brand-navy" aria-hidden="true" />}
          {state === 'invalid' && <ShieldAlert className="h-6 w-6 text-semantic-error" aria-hidden="true" />}
          {state === 'error' && <AlertCircle className="h-6 w-6 text-semantic-error" aria-hidden="true" />}
        </div>

        <h1 className="text-2xl font-black tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">{description}</p>

        {state === 'success' || state === 'unavailable' || state === 'error' || state === 'invalid' ? (
          <div className="mt-7 flex flex-col gap-3">
            <Link href="/auth/login" className="inline-flex items-center justify-center rounded-xl bg-brand-navy px-5 py-3 text-xs font-bold text-white transition hover:opacity-90">
              Continue to Sign In
            </Link>
            {(state === 'invalid' || state === 'error') && (
              <Link href="/auth/login?mode=signup&role=client" className="text-xs font-semibold text-brand-navy hover:underline">
                Back to Create Account
              </Link>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background flex items-center justify-center" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
