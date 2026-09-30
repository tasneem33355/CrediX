import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export type ClientSignupInput = {
  fullName: string;
  email: string;
  password: string;
};

export class ClientSignupError extends Error {}

/**
 * Creates only a Supabase Auth identity for a public financing client.
 * No CrediX profile, business role, token, or password is sent to FastAPI.
 */
export async function signUpClient({ fullName, email, password }: ClientSignupInput) {
  const supabase = getSupabaseBrowserClient();
  const emailRedirectTo = `${window.location.origin}/verify-email`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo,
    },
  });

  if (error) {
    throw new ClientSignupError(toFriendlySignupMessage(error.message));
  }

  return data;
}

function toFriendlySignupMessage(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('password')) {
    return 'Please choose a password that meets the account requirements.';
  }
  if (normalized.includes('email')) {
    return "We couldn't complete registration with this email. Please check it and try again.";
  }
  return "We couldn't create the account right now. Please try again shortly.";
}
