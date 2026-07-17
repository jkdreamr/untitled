import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Next.js 16 proxy (formerly middleware): refresh session + gate protected routes. */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and media so auth stays fresh
     * without paying the cost on immutable files.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|mp3|wav|m4a|ogg|woff2?)$).*)",
  ],
};
