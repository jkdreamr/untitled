import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PUBLIC_ENV, hasSupabasePublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/** Paths that require an authenticated session. */
const PROTECTED = [
  "/feed",
  "/compose",
  "/dashboard",
  "/settings",
  "/onboarding",
  "/admin",
  "/notifications",
];

/**
 * Refresh the auth session on every request (keeps Server Components in sync)
 * and gate protected routes. Onboarding redirects live in the app layout,
 * which already loads the profile.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  // Boot without Supabase env configured (build/CI): don't touch auth.
  if (!hasSupabasePublicEnv()) return response;

  const supabase = createServerClient<Database>(
    PUBLIC_ENV.SUPABASE_URL,
    PUBLIC_ENV.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT: getUser() revalidates the token with Supabase Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}
