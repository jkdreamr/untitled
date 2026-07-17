"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { consumeAnonRateLimit, subjectFromRequest } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  org: z.string().trim().max(120).optional(),
  role: z.string().trim().max(60).optional(),
  note: z.string().trim().max(500).optional(),
});

export interface ScoutState {
  ok: boolean;
  error?: string;
}

/** Scout waitlist capture — validated + IP-rate-limited. */
export async function joinScoutWaitlist(_prev: ScoutState, formData: FormData): Promise<ScoutState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    org: formData.get("org") || undefined,
    role: formData.get("role") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "enter a valid work email." };

  const subject = await subjectFromRequest(await headers());
  if (!(await consumeAnonRateLimit(subject, "scout", 5, 60 * 60)))
    return { ok: false, error: "too many requests. try again shortly." };

  const supabase = await createClient();
  const { error } = await supabase.from("scout_waitlist").insert({
    email: parsed.data.email,
    org: parsed.data.org ?? null,
    role: parsed.data.role ?? null,
    note: parsed.data.note ?? null,
  });
  // Unique-violation means they're already on the list — treat as success.
  if (error && error.code !== "23505") return { ok: false, error: "couldn't add you. try again." };
  return { ok: true };
}
