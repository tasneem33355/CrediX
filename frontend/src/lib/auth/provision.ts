import { provisionCredixClient } from '@/lib/auth/api';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { User } from '@/types';

export class ProvisioningError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'ProvisioningError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Provisions the authenticated Supabase identity in CrediX. Supabase owns
 * session persistence; this helper only reads the current access token for
 * the one protected request and never stores a second token copy.
 */
export async function provisionCurrentClient(): Promise<User> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new ProvisioningError('We could not verify your session. Please continue to Sign In.');
  }

  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new ProvisioningError('Your email was verified, but no active session is available yet.', 'SESSION_UNAVAILABLE');
  }

  try {
    return await provisionCredixClient(accessToken);
  } catch (error) {
    const apiError = error as { code?: string; status?: number };
    throw new ProvisioningError(
      apiError.status === 409
        ? 'This email needs controlled account handling before it can be linked to CrediX.'
        : 'We verified your email, but could not finish setting up your CrediX profile.',
      apiError.code,
      apiError.status,
    );
  }
}
