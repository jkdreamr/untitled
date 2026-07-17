"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { REACTIONS } from "@/lib/reactions";
import { cn, formatCount } from "@/lib/utils";
import type { ReactionKind } from "@/lib/types";

export function ReactionBar({
  pieceId,
  initialViewer,
  total,
  breakdown,
  authed,
  showBreakdown = false,
}: {
  pieceId: string;
  initialViewer: ReactionKind[];
  total: number | null;
  breakdown?: Partial<Record<ReactionKind, number>> | null;
  authed: boolean;
  showBreakdown?: boolean;
}) {
  const router = useRouter();
  const [mine, setMine] = useState<Set<ReactionKind>>(() => new Set(initialViewer));
  const [counts, setCounts] = useState<Partial<Record<ReactionKind, number>>>(() => breakdown ?? {});
  const [settle, setSettle] = useState<ReactionKind | null>(null);
  const [, startTransition] = useTransition();

  const masked = total === null; // quiet mode, not owner

  function toggle(kind: ReactionKind) {
    if (!authed) {
      router.push(`/login?next=/piece/${pieceId}`);
      return;
    }
    const has = mine.has(kind);
    const nextMine = new Set(mine);
    if (has) nextMine.delete(kind);
    else {
      nextMine.add(kind);
      setSettle(kind);
      setTimeout(() => setSettle(null), 200);
    }
    setMine(nextMine);
    if (showBreakdown) {
      setCounts((c) => ({ ...c, [kind]: Math.max(0, (c[kind] ?? 0) + (has ? -1 : 1)) }));
    }

    startTransition(async () => {
      try {
        await createClient().rpc("toggle_reaction", { p_id: pieceId, p_kind: kind });
      } catch {
        setMine(new Set(mine));
        if (breakdown) setCounts(breakdown);
      }
    });
  }

  const totalShown = showBreakdown
    ? Object.values(counts).reduce((a, b) => a + (b ?? 0), 0)
    : (total ?? 0) + mine.size - initialViewer.length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {REACTIONS.map((r) => {
        const on = mine.has(r.kind);
        return (
          <button
            key={r.kind}
            onClick={() => toggle(r.kind)}
            aria-pressed={on}
            title={r.hint}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[0.75rem] transition-colors duration-150",
              on
                ? "border-lime bg-lime/10 text-lime"
                : "border-bone-10 text-bone-46 hover:border-bone-16 hover:text-bone",
            )}
            style={settle === r.kind ? { animation: "settle .18s var(--ease-out)" } : undefined}
          >
            <span>{r.label}</span>
            {showBreakdown && !masked && (counts[r.kind] ?? 0) > 0 && (
              <span className="tabular-nums opacity-70">{counts[r.kind]}</span>
            )}
          </button>
        );
      })}
      {!masked && !showBreakdown && totalShown > 0 && (
        <span className="meta ml-1">
          {formatCount(Math.max(0, totalShown))} {totalShown === 1 ? "reaction" : "reactions"}
        </span>
      )}
      {masked && <span className="meta ml-1 text-bone-32">counts quiet</span>}
    </div>
  );
}
