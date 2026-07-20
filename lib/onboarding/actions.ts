"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { HANDLE_RE, isReservedHandle } from "@/lib/handles";
import { ALL_TAGS } from "@/lib/taxonomy";

const schema = z.object({
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(HANDLE_RE, "handles are 3–20 chars: lowercase, numbers, underscore")
    .refine((h) => !isReservedHandle(h), "that handle is reserved"),
  display_name: z.string().trim().min(1, "add a name").max(40),
  interests: z
    .array(z.string())
    .min(3, "pick at least 3")
    .max(15)
    .refine((tags) => tags.every((t) => (ALL_TAGS as readonly string[]).includes(t)), "unknown interest"),
});

export interface OnboardState {
  ok: boolean;
  error?: string;
  field?: "handle" | "display_name" | "interests";
}

export async function checkHandleAvailable(handle: string): Promise<{ available: boolean }> {
  const h = handle.trim().toLowerCase();
  if (!HANDLE_RE.test(h) || isReservedHandle(h)) return { available: false };
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id").eq("handle", h).maybeSingle();
  return { available: !data };
}

export async function completeOnboarding(_prev: OnboardState, formData: FormData): Promise<OnboardState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "your session expired — sign in again." };

  const parsed = schema.safeParse({
    handle: formData.get("handle"),
    display_name: formData.get("display_name"),
    interests: formData.getAll("interests").map(String),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "check your details", field: first?.path[0] as OnboardState["field"] };
  }

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    handle: parsed.data.handle,
    display_name: parsed.data.display_name,
    interests: parsed.data.interests,
    onboarded: true,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "that handle is taken.", field: "handle" };
    return { ok: false, error: "couldn't save that. try again." };
  }

  redirect("/compose");
}
