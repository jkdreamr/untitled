"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addToList, createListAndAdd } from "@/lib/scout/dashboard-actions";

export function SaveToList({
  artistId,
  lists,
}: {
  artistId: string;
  lists: { id: number; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function add(listId: number) {
    start(async () => {
      const res = await addToList(listId, artistId);
      setStatus(res.ok ? "saved" : res.error ?? "failed");
      if (res.ok) setTimeout(() => setOpen(false), 700);
    });
  }
  function makeAndAdd() {
    const name = newName.trim();
    if (!name) return;
    start(async () => {
      const res = await createListAndAdd(name, artistId);
      setStatus(res.ok ? "saved" : res.error ?? "failed");
      setNewName("");
      if (res.ok) setTimeout(() => setOpen(false), 700);
    });
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="meta text-bone-46 hover:text-bone">
        save to list
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-40 w-56 rounded-lg border border-bone-10 bg-ink-raised/95 p-2 backdrop-blur-xl [animation:veil-up_.16s_var(--ease-out)_both] [box-shadow:var(--shadow-lift)]">
          {lists.length > 0 ? (
            <div className="max-h-48 overflow-y-auto">
              {lists.map((l) => (
                <button
                  key={l.id}
                  onClick={() => add(l.id)}
                  disabled={pending}
                  className="block w-full truncate rounded px-2 py-1.5 text-left text-sm text-bone-64 transition-colors hover:bg-bone-06 hover:text-bone"
                >
                  {l.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="meta px-2 py-1 text-bone-32">no lists yet</p>
          )}
          <div className="mt-1 border-t border-bone-10 pt-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value.slice(0, 80))}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), makeAndAdd())}
              placeholder="+ new list"
              className="h-8 w-full rounded border border-bone-16 bg-ink-sunken px-2 text-sm text-bone outline-none placeholder:text-bone-32 focus-visible:border-lime/40"
            />
          </div>
          {status && <p className="meta mt-1.5 px-2 text-bone-46">{status}</p>}
        </div>
      )}
    </div>
  );
}
