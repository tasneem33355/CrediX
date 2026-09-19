/**
 * Build-time switch for the standalone frontend showcase. Keep environment
 * access centralized so real Supabase/FastAPI paths remain easy to restore.
 */
export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
