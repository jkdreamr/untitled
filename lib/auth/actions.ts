"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { consumeAnonRateLimit, subjectFromRequest } from "@/lib/rate-limit";

const emailSchema = z.string().trim().toLowerCase().email().max(320);

export interface AuthState {
  ok: boolean;
  error?: string;
  email?: string;
}

async function originFromHeaders(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Send a magic link. Rate-limited per IP; never reveals whether an account exists. */
export async function signInWithEmail(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false, error: "enter a valid email." };
  const email = parsed.data;
  const next = String(formData.get("next") ?? "/feed").slice(0, 200);

  const h = await headers();
  const subject = await subjectFromRequest(h);
  const allowed = await consumeAnonRateLimit(subject, "auth", 10, 15 * 60);
  if (!allowed) return { ok: false, error: "too many attempts. try again in a few minutes." };

  const supabase = await createClient();
  const origin = await originFromHeaders();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { ok: false, error: "couldn't send the link. try again." };
  return { ok: true, email };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
