import type { Session } from '@supabase/supabase-js';
import type { UserRole } from '@/types';
import { AuthApiError, getCredixProfile, provisionCredixClient } from '@/lib/auth/api';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export class SignInError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'SignInError';
    this.code = code;
  }
}

export async function signInWithCredixProfile(
  email: string,
  password: string,
  expectedRole: UserRole,
) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    throw new SignInError(toFriendlySignInMessage(error?.message), classifySignInError(error?.message));
  }

  const profile = await resolveCredixProfile(data.session, expectedRole);
  return { session: data.session, profile };
}

export async function resolveCredixProfile(session: Session, expectedRole?: UserRole) {
  try {
    return await getCredixProfile(session.access_token);
  } catch (error) {
    if (!(error instanceof AuthApiError) || error.code !== 'PROFILE_NOT_PROVISIONED') {
      throw error;
    }

    if (expectedRole === 'officer') {
      throw new SignInError(
        'This account does not have an institution-controlled Credit Officer profile.',
        'OFFICER_PROFILE_REQUIRED',
      );
    }

    await provisionCredixClient(session.access_token);
    return getCredixProfile(session.access_token);
  }
}

function classifySignInError(message?: string): string | undefined {
  const normalized = message?.toLowerCase() || '';
  if (normalized.includes('confirm') || normalized.includes('verified')) return 'EMAIL_NOT_CONFIRMED';
  if (normalized.includes('invalid login') || normalized.includes('invalid credentials')) return 'INVALID_CREDENTIALS';
  return undefined;
}

function toFriendlySignInMessage(message?: string): string {
  const code = classifySignInError(message);
  if (code === 'EMAIL_NOT_CONFIRMED') return 'Please verify your email before signing in.';
  if (code === 'INVALID_CREDENTIALS') return 'Email or password is incorrect.';
  return 'We could not sign you in right now. Please try again.';
}
