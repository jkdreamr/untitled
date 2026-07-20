"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ResultCard } from "@/components/search/result-card";
import { ArtistCard } from "@/components/search/artist-card";
import { cn } from "@/lib/utils";
import { ARTIST_ROLES, OPEN_TO, type Medium, type TrackKind, type PieceCard, type ArtistResult } from "@/lib/types";

const MEDIA: { value: Medium; label: string }[] = [
  { value: "sound", label: "audio" },
  { value: "video", label: "video" },
];
const KINDS: TrackKind[] = ["original", "cover", "freestyle", "beat"];
type Vocals = "any" | "yes" | "no";

interface Filters {
  media: Set<Medium>;
  kinds: Set<TrackKind>;
  vocals: Vocals;
  roles: Set<string>;
  openTo: Set<string>;
}

export function SearchView({
  initialQuery,
  initialTags,
  initialResults,
}: {
  initialQuery: string;
  initialTags: string[];
  initialResults: PieceCard[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const [f, setF] = useState<Filters>({ media: new Set(), kinds: new Set(), vocals: "any", roles: new Set(), openTo: new Set() });
  const [tags, setTags] = useState<string[]>(initialTags);
  const [results, setResults] = useState<PieceCard[]>(initialResults);
  const [artists, setArtists] = useState<ArtistResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [touched, setTouched] = useState(initialQuery.length > 0 || initialTags.length > 0);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);

  const run = useCallback(async (q: string, filters: Filters, t: string[]) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;

    const anyFilter =
      filters.media.size || filters.kinds.size || filters.vocals !== "any" || filters.roles.size || filters.openTo.size;
    if (!q.trim() && !anyFilter && t.length === 0) {
      setResults([]);
      setArtists([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (filters.media.size) params.set("media", [...filters.media].join(","));
      if (filters.kinds.size) params.set("kinds", [...filters.kinds].join(","));
      if (filters.vocals !== "any") params.set("vocals", filters.vocals);
      if (filters.roles.size) params.set("roles", [...filters.roles].join(","));
      if (filters.openTo.size) params.set("open_to", [...filters.openTo].join(","));
      if (t.length) params.set("tags", t.join(","));
      const res = await fetch(`/api/search?${params.toString()}`, { signal: controller.signal });
      if (!res.ok) throw new Error("search failed");
      const json = (await res.json()) as { results: PieceCard[]; artists: ArtistResult[] };
      setResults(json.results ?? []);
      setArtists(json.artists ?? []);
      setError(false);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setResults([]);
        setArtists([]);
        setError(true);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setTouched(true);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => run(query, f, tags), 200);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, f, tags, run]);

  function toggleSet<T>(key: "media" | "kinds" | "roles" | "openTo", value: T) {
    setF((prev) => {
      const next = new Set(prev[key] as Set<T>);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, [key]: next };
    });
  }
  function setVocals(v: Vocals) {
    setF((prev) => ({ ...prev, vocals: prev.vocals === v ? "any" : v }));
  }

  const artistsFirst = f.roles.size > 0 || f.openTo.size > 0;
  const nothing = results.length === 0 && artists.length === 0;

  const tracksSection =
    results.length > 0 ? (
      <section key="tracks">
        <h2 className="meta meta-caps mb-2 px-3 text-bone-46">tracks</h2>
        <div className="space-y-1">
          {results.map((c) => (
            <ResultCard key={c.id} card={c} />
          ))}
        </div>
      </section>
    ) : null;

  const artistsSection =
    artists.length > 0 ? (
      <section key="artists">
        <h2 className="meta meta-caps mb-2 px-3 text-bone-46">musicians</h2>
        <div className="space-y-1">
          {artists.map((a) => (
            <ArtistCard key={a.id} artist={a} />
          ))}
        </div>
      </section>
    ) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <label htmlFor="q" className="sr-only">search</label>
      <div className="flex items-center gap-3 rounded-full border border-bone-16 bg-ink-sunken px-5 focus-within:border-lime/50">
        <SearchGlyph />
        <input
          id="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          placeholder="a lyric, a sound, a low alto open to features…"
          className="h-12 w-full bg-transparent text-[0.95rem] text-bone outline-none placeholder:text-bone-32"
        />
        {loading && <span className="size-4 shrink-0 animate-[spin_.8s_linear_infinite] rounded-full border border-bone-16 border-t-lime" />}
      </div>

      <div className="mt-4 space-y-3">
        <FilterRow label="format">
          {MEDIA.map((m) => (
            <Chip key={m.value} on={f.media.has(m.value)} onClick={() => toggleSet("media", m.value)}>{m.label}</Chip>
          ))}
        </FilterRow>
        <FilterRow label="kind">
          {KINDS.map((k) => (
            <Chip key={k} on={f.kinds.has(k)} onClick={() => toggleSet("kinds", k)}>{k}</Chip>
          ))}
          <Chip on={f.vocals === "yes"} onClick={() => setVocals("yes")}>vocals</Chip>
          <Chip on={f.vocals === "no"} onClick={() => setVocals("no")}>instrumental</Chip>
        </FilterRow>
        <FilterRow label="role">
          {ARTIST_ROLES.map((r) => (
            <Chip key={r} on={f.roles.has(r)} onClick={() => toggleSet("roles", r)}>{r}</Chip>
          ))}
        </FilterRow>
        <FilterRow label="open to">
          {OPEN_TO.map((o) => (
            <Chip key={o} on={f.openTo.has(o)} onClick={() => toggleSet("openTo", o)}>{o}</Chip>
          ))}
        </FilterRow>
        {tags.length > 0 && (
          <FilterRow label="tags">
            {tags.map((t) => (
              <button key={t} onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`remove tag ${t}`} className="rounded-full border border-lime bg-lime/10 px-3 py-1 font-mono text-[0.75rem] text-lime">
                {t} ×
              </button>
            ))}
          </FilterRow>
        )}
      </div>

      <div className="mt-6 space-y-8">
        {error && !loading ? (
          <p role="alert" className="py-16 text-center text-sm text-bone-64">
            couldn&apos;t reach search — check your connection and try again.
          </p>
        ) : !nothing ? (
          artistsFirst ? [artistsSection, tracksSection] : [tracksSection, artistsSection]
        ) : touched && !loading ? (
          <p className="py-16 text-center text-sm text-bone-52">
            nothing matched — yet. try fewer words, or a feeling.
          </p>
        ) : !touched ? (
          <div className="py-16 text-center">
            <p className="font-serif text-2xl text-bone-64">search the whole room.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
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
