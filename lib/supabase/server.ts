import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { EFFECTIVE_SUPABASE_URL, EFFECTIVE_SUPABASE_ANON_KEY } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Request-scoped Supabase client (anon key + the user's session cookies).
 * Use in Server Components, Server Actions, and Route Handlers. RLS applies.
 * Falls back to safe placeholders when env is unset so the app still builds and
 * renders (as a guest); requests fail soft until Supabase is configured.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    EFFECTIVE_SUPABASE_URL,
    EFFECTIVE_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render — cookies are read-only here.
            // Session refresh is handled by middleware, so this is safe to ignore.
          }
        },
      },
    },
  );
}
