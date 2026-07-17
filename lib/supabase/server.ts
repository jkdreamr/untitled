import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { PUBLIC_ENV, assertSupabasePublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Request-scoped Supabase client (anon key + the user's session cookies).
 * Use in Server Components, Server Actions, and Route Handlers. RLS applies.
 */
export async function createClient() {
  assertSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    PUBLIC_ENV.SUPABASE_URL,
    PUBLIC_ENV.SUPABASE_ANON_KEY,
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
