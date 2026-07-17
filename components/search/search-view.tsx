"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ResultCard } from "@/components/search/result-card";
import { cn } from "@/lib/utils";
import type { Medium, PieceCard } from "@/lib/types";

const MEDIA: Medium[] = ["sound", "image", "video", "words"];

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
  const [media, setMedia] = useState<Set<Medium>>(new Set());
  const [tags, setTags] = useState<string[]>(initialTags);
  const [results, setResults] = useState<PieceCard[]>(initialResults);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(initialQuery.length > 0 || initialTags.length > 0);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);

  const run = useCallback(async (q: string, m: Set<Medium>, t: string[]) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;

    if (!q.trim() && m.size === 0 && t.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (m.size) params.set("media", [...m].join(","));
      if (t.length) params.set("tags", t.join(","));
      const res = await fetch(`/api/search?${params.toString()}`, { signal: controller.signal });
      const json = (await res.json()) as { results: PieceCard[] };
      setResults(json.results ?? []);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setResults([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // 200ms debounce with cancellation on every input/filter change
  useEffect(() => {
    setTouched(true);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => run(query, media, tags), 200);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, media, tags, run]);

  function toggleMedium(m: Medium) {
    setMedia((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  }

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
          placeholder="melancholic bedroom guitar cover, low voice…"
          className="h-12 w-full bg-transparent text-[0.95rem] text-bone outline-none placeholder:text-bone-32"
        />
        {loading && <span className="size-4 shrink-0 animate-[spin_.8s_linear_infinite] rounded-full border border-bone-16 border-t-lime" />}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {MEDIA.map((m) => (
          <button
            key={m}
            onClick={() => toggleMedium(m)}
            aria-pressed={media.has(m)}
            className={cn("rounded-full border px-3 py-1 font-mono text-[0.75rem] transition-colors", media.has(m) ? "border-lime bg-lime/10 text-lime" : "border-bone-16 text-bone-46 hover:text-bone")}
          >
            {m}
          </button>
        ))}
        {tags.map((t) => (
          <button key={t} onClick={() => setTags(tags.filter((x) => x !== t))} className="rounded-full border border-lime bg-lime/10 px-3 py-1 font-mono text-[0.75rem] text-lime">
            {t} ×
          </button>
        ))}
      </div>

      <div className="mt-6">
        {results.length > 0 ? (
          <div className="space-y-1">
            {results.map((c) => (
              <ResultCard key={c.id} card={c} />
            ))}
          </div>
        ) : touched && !loading ? (
          <p className="py-16 text-center text-sm text-bone-32">
            nothing matched — yet. try fewer words, or a feeling.
          </p>
        ) : !touched ? (
          <div className="py-16 text-center">
            <p className="font-serif text-2xl text-bone-64">search the whole room.</p>
            <p className="mt-2 text-sm text-bone-32">
              describe a sound, a mood, a scene. it finds the actual thing — even the audio.
            </p>
          </div>
        ) : null}
      </div>
    </div>
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
