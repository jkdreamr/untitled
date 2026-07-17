"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createReport } from "@/lib/piece/actions";
import { Button } from "@/components/ui/button";
import type { ReportReason, ReportTarget } from "@/lib/types";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "ai_generated", label: "AI-generated (not human-made)" },
  { value: "stolen", label: "stolen work" },
  { value: "harassment", label: "harassment" },
  { value: "explicit", label: "explicit" },
  { value: "other", label: "other" },
];

export function ReportDialog({
  targetType,
  targetId,
  authed,
  label = "report",
}: {
  targetType: ReportTarget;
  targetId: string;
  authed: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("ai_generated");
  const [detail, setDetail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit() {
    setState("sending");
    const res = await createReport({ target_type: targetType, target_id: targetId, reason, detail: detail.trim() || undefined });
    setState(res.ok ? "done" : "error");
    if (res.ok) setTimeout(() => setOpen(false), 1400);
  }

  return (
    <>
      <button onClick={() => (authed ? setOpen(true) : router.push("/login"))} className="meta text-bone-32 hover:text-bone">
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/70 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-xl border border-bone-10 bg-ink-raised p-6 [box-shadow:var(--shadow-lift)]" onClick={(e) => e.stopPropagation()}>
            {state === "done" ? (
              <p className="py-6 text-center text-sm text-bone-64">thank you. our team will take a look.</p>
            ) : (
              <>
                <h2 className="font-serif text-2xl text-bone">report this {targetType}</h2>
                <p className="mt-1 text-sm text-bone-46">what&apos;s wrong?</p>
                <div className="mt-4 space-y-1.5">
                  {REASONS.map((r) => (
                    <label key={r.value} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-bone-64 hover:bg-bone-06">
                      <input type="radio" name="reason" checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-lime" />
                      {r.label}
                    </label>
                  ))}
                </div>
                <textarea value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={1000} rows={3} placeholder="add context (optional)" className="mt-3 w-full resize-none rounded-lg border border-bone-16 bg-ink-sunken p-3 text-sm text-bone outline-none placeholder:text-bone-32 focus-visible:border-lime/40" />
                {state === "error" && <p className="mt-2 text-sm text-bone-64">couldn&apos;t send that. try again.</p>}
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setOpen(false)}>cancel</Button>
                  <Button variant="solid" onClick={submit} disabled={state === "sending"}>{state === "sending" ? "sending…" : "send report"}</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
