import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { EFFECTIVE_SUPABASE_URL } from "@/lib/env";
import { SERVER_ENV } from "@/lib/env.server";
import type { Database } from "@/lib/supabase/types";

/**
 * Service-role client — BYPASSES RLS. Server-only. Use exclusively for
 * privileged operations that cannot be expressed as the acting user:
 * enrichment worker writes to piece_search, hard account deletion, Mux
 * webhook updates, image processing writes. Never expose to a client bundle.
 *
 * Returns null when SUPABASE_SERVICE_ROLE_KEY is unset so callers can degrade
 * gracefully (the app runs with only the two public vars set).
 */
export function createAdminClient() {
  if (!SERVER_ENV.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createSupabaseClient<Database>(
    EFFECTIVE_SUPABASE_URL,
    SERVER_ENV.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
