/**
 * Public environment — safe to import in client and server code.
 * These are the ONLY two variables required for the app to boot.
 */
export const PUBLIC_ENV = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
} as const;

/** True when the two required public Supabase variables are present. */
export function hasSupabasePublicEnv(): boolean {
  return Boolean(PUBLIC_ENV.SUPABASE_URL && PUBLIC_ENV.SUPABASE_ANON_KEY);
}

/**
 * Effective client credentials. When the real env isn't set yet, these are
 * syntactically-valid placeholders so client construction never throws — the
 * app builds, deploys, and can be browsed as a guest. Requests against the
 * placeholder fail soft (the data layer already treats a null/error result as
 * "no data" and renders empty states), and everything lights up the moment the
 * real NEXT_PUBLIC_SUPABASE_* vars are set and the app is redeployed.
 */
export const EFFECTIVE_SUPABASE_URL = PUBLIC_ENV.SUPABASE_URL || "https://placeholder.supabase.co";
export const EFFECTIVE_SUPABASE_ANON_KEY = PUBLIC_ENV.SUPABASE_ANON_KEY || "public-anon-key-placeholder";
