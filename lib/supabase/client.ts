"use client";

import { createBrowserClient } from "@supabase/ssr";
import { EFFECTIVE_SUPABASE_URL, EFFECTIVE_SUPABASE_ANON_KEY } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/** Browser Supabase client (anon key). Safe for client components. Uses safe
 *  placeholders until env is set, so guest browsing works pre-configuration. */
export function createClient() {
  return createBrowserClient<Database>(EFFECTIVE_SUPABASE_URL, EFFECTIVE_SUPABASE_ANON_KEY);
}
