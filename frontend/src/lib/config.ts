/**
 * Build-time switch for the standalone frontend showcase. Keep environment
 * access centralized so real Supabase/FastAPI paths remain easy to restore.
 *
 * Demo mode is opt-in: a production build that forgets the variable must talk
 * to the real backend, never silently fall back to mock identities.
 */
export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
