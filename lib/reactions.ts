import type { ReactionKind } from "@/lib/types";

/**
 * The fixed set of four, encouragement-shaped. Order is intentional and stable.
 * No like, no heart — every reaction points the artist forward.
 */
export const REACTIONS: ReadonlyArray<{
  kind: ReactionKind;
  label: string;
  hint: string;
}> = [
  { kind: "keep_going", label: "keep going", hint: "make more of this" },
  { kind: "felt_this", label: "felt this", hint: "it landed" },
  { kind: "on_repeat", label: "on repeat", hint: "can't stop returning" },
  { kind: "teach_me", label: "teach me", hint: "how did you do it" },
] as const;

export const REACTION_LABELS: Record<ReactionKind, string> = {
  keep_going: "keep going",
  felt_this: "felt this",
  on_repeat: "on repeat",
  teach_me: "teach me",
};

export function isReactionKind(v: string): v is ReactionKind {
  return v === "keep_going" || v === "felt_this" || v === "on_repeat" || v === "teach_me";
}
