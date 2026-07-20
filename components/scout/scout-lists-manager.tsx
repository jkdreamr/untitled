"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  createScoutList,
  deleteScoutList,
  updateListNote,
  removeFromList,
} from "@/lib/scout/dashboard-actions";
import type { ScoutList, ScoutListItem } from "@/lib/data/scout";

export function ScoutListsManager({ lists }: { lists: ScoutList[] }) {
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  function create() {
    const n = name.trim();
    if (!n) return;
    start(async () => {
      await createScoutList(n);
      setName("");
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 80))}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="new list…"
          className="h-10 flex-1 rounded-lg border border-bone-16 bg-ink-sunken px-4 text-sm text-bone outline-none placeholder:text-bone-32 focus-visible:border-lime/40"
        />
        <Button variant="solid" size="sm" onClick={create} disabled={pending || !name.trim()}>
          create
        </Button>
      </div>

      {lists.length === 0 ? (
        <p className="py-16 text-center text-sm text-bone-52">
          no lists yet. save artists from search to start one.
        </p>
      ) : (
        <div className="mt-10 space-y-10">
          {lists.map((l) => (
            <ListBlock key={l.id} list={l} />
          ))}
        </div>
      )}
    </div>
  );
}

function ListBlock({ list }: { list: ScoutList }) {
  const [, start] = useTransition();
  return (
    <section>
      <div className="flex items-baseline justify-between border-b border-bone-10 pb-2">
        <h2 className="font-serif text-xl text-bone">{list.name}</h2>
        <div className="flex items-center gap-3">
          <span className="meta text-bone-32">{list.items.length}</span>
          <button
            onClick={() => start(async () => void (await deleteScoutList(list.id)))}
            className="meta text-bone-32 transition-colors hover:text-bone"
          >
            delete
          </button>
        </div>
      </div>
      {list.items.length === 0 ? (
        <p className="py-6 text-sm text-bone-32">empty.</p>
      ) : (
        <div className="mt-4 space-y-5">
          {list.items.map((it) => (
            <ListItem key={it.artist_id} listId={list.id} item={it} />
          ))}
        </div>
      )}
    </section>
  );
}

function ListItem({ listId, item }: { listId: number; item: ScoutListItem }) {
  const [note, setNote] = useState(item.note ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      await updateListNote(listId, item.artist_id, note);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    });
  }

  return (
    <div className="flex gap-3">
      <Link href={`/scout/artist/${item.artist_id}`} aria-label={item.display_name}>
        <Avatar url={item.avatar_url} name={item.display_name} size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <Link href={`/scout/artist/${item.artist_id}`} className="text-sm text-bone hover:underline">
            {item.display_name} <span className="meta">@{item.handle}</span>
          </Link>
          <button
            onClick={() => start(async () => void (await removeFromList(listId, item.artist_id)))}
            className="meta shrink-0 text-bone-32 transition-colors hover:text-bone"
          >
            remove
          </button>
        </div>
        <div className="mt-1.5 flex items-start gap-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            rows={2}
            placeholder="private note — only you can see this"
            className="w-full resize-none rounded-lg border border-bone-10 bg-ink-sunken/60 p-2 text-sm text-bone-64 outline-none placeholder:text-bone-32 focus-visible:border-lime/40"
          />
          <button
            onClick={save}
            disabled={pending}
            className="meta shrink-0 pt-2 text-lime transition-opacity hover:underline disabled:opacity-50"
          >
            {saved ? "saved" : "save"}
          </button>
        </div>
      </div>
    </div>
  );
}
