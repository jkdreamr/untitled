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
 * Throw a clear, actionable error when Supabase public env is missing.
 * Called lazily by client factories so `next build` never crashes on missing env.
 */
export function assertSupabasePublicEnv() {
  if (!hasSupabasePublicEnv()) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.example to .env.local and fill them in (see README).",
    );
  }
}
