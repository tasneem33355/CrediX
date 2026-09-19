import type { User } from '@/types';

export class AuthApiError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'AuthApiError';
    this.code = code;
    this.status = status;
  }
}

function getApiBaseUrl(): string {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBaseUrl) {
    throw new AuthApiError('CrediX services are not configured for this environment.', 'API_NOT_CONFIGURED');
  }
  return apiBaseUrl.replace(/\/$/, '');
}

async function authRequest<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...init?.headers,
    },
  });

  if (response.ok) {
    return response.json() as Promise<T>;
  }

  let code: string | undefined;
  try {
    const payload = await response.json() as { detail?: { code?: string } };
    code = payload.detail?.code;
  } catch {
    // Keep external error details out of the UI.
  }
  throw new AuthApiError('CrediX could not verify this account profile.', code, response.status);
}

export function getCredixProfile(accessToken: string): Promise<User> {
  return authRequest<User>('/auth/me', accessToken);
}

export function provisionCredixClient(accessToken: string): Promise<User> {
  return authRequest<User>('/auth/provision', accessToken, { method: 'POST' });
}
