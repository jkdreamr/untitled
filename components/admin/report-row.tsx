"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { resolveReport, setPieceStatusAdmin, setCommentStatusAdmin, suspendUser } from "@/lib/admin/actions";
import type { QueuedReport } from "@/lib/admin/data";

export function ReportRow({ report }: { report: QueuedReport }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<string | null>(null);

  function act(fn: () => Promise<unknown>, label: string) {
    start(async () => {
      await fn();
      setDone(label);
    });
  }

  const t = report.target;
  const hidden = t?.pieceStatus === "hidden";

  return (
    <div className="rounded-lg border border-bone-10 p-4" data-done={!!done}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="meta rounded-full border border-bone-16 px-2 py-0.5 text-bone-46">{report.reason.replace("_", " ")}</span>
          <span className="meta ml-2 text-bone-32">{report.target_type}</span>
          {t?.href ? (
            <Link href={t.href} className="mt-2 block truncate text-sm text-bone hover:underline">{t.label}</Link>
          ) : (
            <p className="mt-2 text-sm text-bone-46">[target removed]</p>
          )}
          {t?.handle && <p className="meta">@{t.handle}</p>}
          {report.detail && <p className="mt-1 text-sm text-bone-46">“{report.detail}”</p>}
        </div>
        {done && <span className="meta shrink-0 text-lime">{done}</span>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {report.target_type === "piece" && (
          <Btn onClick={() => act(() => setPieceStatusAdmin(report.target_id, hidden ? "active" : "hidden"), hidden ? "restored" : "hidden")} disabled={pending}>
            {hidden ? "restore" : "hide"} piece
          </Btn>
        )}
        {report.target_type === "comment" && (
          <Btn onClick={() => act(() => setCommentStatusAdmin(report.target_id, "hidden"), "hidden")} disabled={pending}>hide comment</Btn>
        )}
        {report.target_type === "profile" && (
          <Btn onClick={() => act(() => suspendUser(report.target_id, !t?.suspended), t?.suspended ? "unsuspended" : "suspended")} disabled={pending}>
            {t?.suspended ? "unsuspend" : "suspend"}
          </Btn>
        )}
        <span className="mx-1 h-4 w-px bg-bone-10" />
        <Btn onClick={() => act(() => resolveReport(report.id, "resolved"), "resolved")} disabled={pending}>resolve</Btn>
        <Btn onClick={() => act(() => resolveReport(report.id, "dismissed"), "dismissed")} disabled={pending}>dismiss</Btn>
      </div>
    </div>
  );
}

function Btn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="rounded-full border border-bone-16 px-3 py-1 text-sm text-bone-64 transition-colors hover:border-bone-32 hover:text-bone disabled:opacity-40">
      {children}
    </button>
  );
}
