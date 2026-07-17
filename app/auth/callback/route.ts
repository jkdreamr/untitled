import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** Exchange the magic-link / OAuth code for a session, then route the user. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const h = request.headers;
  const host = h.get("x-forwarded-host") ?? url.host;
  const proto = h.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const origin = `${proto}://${host}`;

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const nextRaw = url.searchParams.get("next") ?? "/feed";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/feed";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/login?error=link`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return NextResponse.redirect(`${origin}/login?error=link`);
  } else {
    return NextResponse.redirect(`${origin}/login?error=link`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile || !profile.onboarded) {
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }
  return NextResponse.redirect(`${origin}${next}`);
}
