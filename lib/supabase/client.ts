"use client";

import { createBrowserClient } from "@supabase/ssr";
import { PUBLIC_ENV, assertSupabasePublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/** Browser Supabase client (anon key). Safe for client components. */
export function createClient() {
  assertSupabasePublicEnv();
  return createBrowserClient<Database>(PUBLIC_ENV.SUPABASE_URL, PUBLIC_ENV.SUPABASE_ANON_KEY);
}
