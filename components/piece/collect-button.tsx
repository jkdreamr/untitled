"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Coll {
  id: string;
  title: string;
  has: boolean;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "board";
}

/** Collect a piece into an Are.na-style board. Lazy-loads the viewer's boards. */
export function CollectButton({ pieceId, authed }: { pieceId: string; authed: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [colls, setColls] = useState<Coll[]>([]);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    const [{ data: mine }, { data: items }] = await Promise.all([
      supabase.from("collections").select("id,title").eq("owner_id", uid).order("updated_at", { ascending: false }),
      supabase.from("collection_items").select("collection_id").eq("piece_id", pieceId),
    ]);
    const memberOf = new Set((items ?? []).map((i) => i.collection_id));
    setColls((mine ?? []).map((c) => ({ id: c.id, title: c.title, has: memberOf.has(c.id) })));
    setLoading(false);
  }

  function openMenu() {
    if (!authed) {
      router.push(`/login?next=/piece/${pieceId}`);
      return;
    }
    setOpen(true);
    if (colls.length === 0) load();
  }

  async function toggle(c: Coll) {
    const supabase = createClient();
    setColls((prev) => prev.map((x) => (x.id === c.id ? { ...x, has: !x.has } : x)));
    if (c.has) {
      await supabase.from("collection_items").delete().eq("collection_id", c.id).eq("piece_id", pieceId);
    } else {
      await supabase.from("collection_items").insert({ collection_id: c.id, piece_id: pieceId });
    }
  }

  async function createAndAdd() {
    const title = newName.trim();
    if (!title) return;
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    const { data: created, error } = await supabase
      .from("collections")
      .insert({ owner_id: uid, title, slug: `${slugify(title)}-${Date.now().toString(36).slice(-4)}` })
      .select("id,title")
      .single();
    if (error || !created) return;
    await supabase.from("collection_items").insert({ collection_id: created.id, piece_id: pieceId });
    setColls((prev) => [{ id: created.id, title: created.title, has: true }, ...prev]);
    setNewName("");
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={openMenu} className="meta text-bone-46 transition-colors hover:text-bone" aria-haspopup="menu" aria-expanded={open}>
        collect
      </button>
      {open && (
        <div className="absolute bottom-8 left-0 z-50 w-60 overflow-hidden rounded-lg border border-bone-10 bg-ink-raised/95 p-1.5 backdrop-blur-xl [animation:veil-up_.16s_var(--ease-out)_both] [box-shadow:var(--shadow-lift)]">
          <p className="meta meta-caps px-2 py-1.5 text-bone-32">collect into</p>
          <div className="max-h-52 overflow-y-auto">
            {loading && <p className="meta px-2 py-2 text-bone-46">loading…</p>}
            {!loading && colls.length === 0 && <p className="meta px-2 py-2 text-bone-46">no boards yet</p>}
            {colls.map((c) => (
              <button
                key={c.id}
                onClick={() => toggle(c)}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-bone-64 transition-colors hover:bg-bone-06 hover:text-bone"
              >
                <span className="truncate">{c.title}</span>
                <span className={cn("shrink-0 text-xs", c.has ? "text-lime" : "text-bone-32")}>{c.has ? "✓" : "+"}</span>
              </button>
            ))}
          </div>
          <div className="mt-1 flex items-center gap-1 border-t border-bone-10 pt-1.5">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createAndAdd()}
              placeholder="new board…"
              maxLength={60}
              className="h-8 w-full rounded bg-ink-sunken px-2 text-sm text-bone outline-none placeholder:text-bone-32"
            />
            <button onClick={createAndAdd} className="shrink-0 rounded px-2 py-1 text-sm text-lime hover:bg-lime/10" aria-label="create board">
              add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
