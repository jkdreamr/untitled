"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ARTIST_ROLES, OPEN_TO } from "@/lib/types";

const KINDS = ["original", "cover", "freestyle", "beat"];
const SORTS = ["momentum", "recent", "relevance"] as const;

export interface ScoutFilterState {
  q: string;
  roles: string[];
  openTo: string[];
  kinds: string[];
  vocals: "any" | "yes" | "no";
  sort: string;
}

export function ScoutSearchControls({ initial }: { initial: ScoutFilterState }) {
  const router = useRouter();
  const [q, setQ] = useState(initial.q);
  const [roles, setRoles] = useState<Set<string>>(new Set(initial.roles));
  const [openTo, setOpenTo] = useState<Set<string>>(new Set(initial.openTo));
  const [kinds, setKinds] = useState<Set<string>>(new Set(initial.kinds));
  const [vocals, setVocals] = useState<ScoutFilterState["vocals"]>(initial.vocals);
  const [sort, setSort] = useState(initial.sort);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (roles.size) params.set("roles", [...roles].join(","));
    if (openTo.size) params.set("open_to", [...openTo].join(","));
    if (kinds.size) params.set("kinds", [...kinds].join(","));
    if (vocals !== "any") params.set("vocals", vocals);
    if (sort !== "momentum") params.set("sort", sort);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      router.push(`/scout/search${params.toString() ? `?${params}` : ""}`);
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [q, roles, openTo, kinds, vocals, sort, router]);

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, v: string) {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setter(next);
  }

  return (
    <div>
      <div className="flex items-center gap-3 rounded-full border border-bone-16 bg-ink-sunken px-5 focus-within:border-lime/50">
        <SearchGlyph />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="a sound, a lyric, a role, a low alto open to features…"
          className="h-12 w-full bg-transparent text-[0.95rem] text-bone outline-none placeholder:text-bone-32"
        />
      </div>

      <div className="mt-4 space-y-3">
        <Row label="sort">
          {SORTS.map((s) => (
            <Chip key={s} on={sort === s} onClick={() => setSort(s)}>
              {s}
            </Chip>
          ))}
        </Row>
        <Row label="role">
          {ARTIST_ROLES.map((r) => (
            <Chip key={r} on={roles.has(r)} onClick={() => toggle(roles, setRoles, r)}>
              {r}
            </Chip>
          ))}
        </Row>
        <Row label="open to">
          {OPEN_TO.map((o) => (
            <Chip key={o} on={openTo.has(o)} onClick={() => toggle(openTo, setOpenTo, o)}>
              {o}
            </Chip>
          ))}
        </Row>
        <Row label="kind">
          {KINDS.map((k) => (
            <Chip key={k} on={kinds.has(k)} onClick={() => toggle(kinds, setKinds, k)}>
              {k}
            </Chip>
          ))}
          <Chip on={vocals === "yes"} onClick={() => setVocals(vocals === "yes" ? "any" : "yes")}>
            vocals
          </Chip>
          <Chip on={vocals === "no"} onClick={() => setVocals(vocals === "no" ? "any" : "no")}>
            instrumental
          </Chip>
        </Row>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
      <span className="meta meta-caps w-16 shrink-0 text-bone-64">{label}</span>
      {children}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "rounded-full border px-3 py-1 font-mono text-[0.75rem] transition-colors",
        on ? "border-lime bg-lime/10 text-lime" : "border-bone-16 text-bone-64 hover:text-bone",
      )}
    >
      {children}
    </button>
  );
}

function SearchGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0 text-bone-32" aria-hidden>
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
