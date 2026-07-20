"use client";

import { useState, useTransition } from "react";
import { saveScoutSearch } from "@/lib/scout/dashboard-actions";

export function SaveSearchButton({ params }: { params: Record<string, unknown> }) {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    const name = window.prompt("name this search");
    if (!name?.trim()) return;
    start(async () => {
      const res = await saveScoutSearch(name, params);
      setStatus(res.ok ? "saved" : res.error ?? "failed");
    });
  }

  return (
    <button onClick={save} disabled={pending} className="meta text-bone-46 transition-colors hover:text-bone">
      {status ?? (pending ? "saving…" : "save this search")}
    </button>
  );
}
