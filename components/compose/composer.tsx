"use client";

import { useCallback, useRef, useState } from "react";
import { Waveform } from "@/components/media/waveform";
import { Button } from "@/components/ui/button";
import { decodeAudioPeaks } from "@/lib/audio/peaks";
import { putWithProgress } from "@/lib/upload/xhr";
import { requestUploadUrl, publishPiece, searchAfterPieces } from "@/lib/compose/actions";
import { suggestedStarterTags, normalizeTags } from "@/lib/taxonomy";
import { extOf } from "@/lib/media/validate";
import { formatDuration, cn } from "@/lib/utils";
import type { TrackKind, TrackMedium, Visibility } from "@/lib/types";

type Kind = TrackMedium | null;
interface AudioMeta { path: string; duration: number; peaks: number[]; mime: string; bytes: number }
interface AfterRef { id: string; label: string; handle: string }

const TRACK_KINDS: { value: TrackKind; label: string; hint: string }[] = [
  { value: "original", label: "original", hint: "your own song" },
  { value: "cover", label: "cover", hint: "someone else's song" },
  { value: "freestyle", label: "freestyle", hint: "off the top / over a beat" },
  { value: "beat", label: "beat", hint: "an instrumental, no vocals" },
];

function detectKind(file: File): TrackMedium | "unknown" {
  if (file.type.startsWith("audio/")) return "sound";
  if (file.type.startsWith("video/")) return "video";
  const ext = extOf(file.name);
  if (["mp3", "wav", "m4a", "ogg", "flac", "aac"].includes(ext)) return "sound";
  if (["mp4", "mov", "webm", "m4v"].includes(ext)) return "video";
  return "unknown";
}

export function Composer({ videoEnabled, welcome }: { videoEnabled: boolean; welcome: boolean }) {
  const [kind, setKind] = useState<Kind>(null);
  const [pieceId, setPieceId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [audio, setAudio] = useState<AudioMeta | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // form
  const [attested, setAttested] = useState(false);
  const [trackKind, setTrackKind] = useState<TrackKind>("original");
  const [hasVocals, setHasVocals] = useState(true);
  const [coverTitle, setCoverTitle] = useState("");
  const [coverArtist, setCoverArtist] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [showLyrics, setShowLyrics] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [after, setAfter] = useState<AfterRef | null>(null);
  const [publishing, setPublishing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setKind(null); setPieceId(""); setAudio(null); setVideoReady(false); setPreviewUrl(null);
    setAttested(false); setTrackKind("original"); setHasVocals(true); setCoverTitle(""); setCoverArtist("");
    setTitle(""); setCaption(""); setLyrics(""); setShowLyrics(true);
    setTags([]); setAfter(null); setError(null); setProgress(0);
  };

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setError(null);
      const first = files[0]!;
      const detected = detectKind(first);
      const id = crypto.randomUUID();
      setPieceId(id);

      try {
        setBusy(true);
        setProgress(0);
        if (detected === "sound") {
          setKind("sound");
          const { peaks, duration } = await decodeAudioPeaks(first);
          if (duration > 360) throw new Error("a track is capped at 6 minutes.");
          const ext = extOf(first.name) || "mp3";
          const url = await requestUploadUrl(id, ext);
          if (!url.ok) throw new Error(url.error);
          await putWithProgress(url.signedUrl, first, setProgress, { "content-type": first.type || "audio/mpeg" });
          setAudio({ path: url.path, duration, peaks, mime: first.type || "audio/mpeg", bytes: first.size });
        } else if (detected === "video") {
          if (!videoEnabled) throw new Error("video posting isn't available right now.");
          setKind("video");
          setPreviewUrl(URL.createObjectURL(first));
          const res = await fetch("/api/mux/upload", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ pieceId: id }),
          });
          if (!res.ok) throw new Error("couldn't start the video upload.");
          const { uploadUrl } = (await res.json()) as { uploadUrl: string };
          await putWithProgress(uploadUrl, first, setProgress, { "content-type": first.type || "video/mp4" });
          setVideoReady(true);
        } else {
          throw new Error("drop an audio file or a video — that's what a track is.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "something went wrong.");
        reset();
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [videoEnabled],
  );

  const ready = (kind === "sound" && !!audio) || (kind === "video" && videoReady);
  const isBeat = trackKind === "beat";

  function selectKind(k: TrackKind) {
    setTrackKind(k);
    if (k === "beat") { setHasVocals(false); setLyrics(""); }
    else if (!hasVocals) setHasVocals(true);
  }

  async function publish() {
    if (!attested) return setError("tap the attestation — this must be human-made.");
    if (!ready) return;
    if (trackKind === "cover" && !coverTitle.trim()) return setError("name the song you're covering.");
    setPublishing(true);
    setError(null);
    try {
      const res = await publishPiece({
        id: pieceId,
        medium: kind!,
        track_kind: trackKind,
        has_vocals: isBeat ? false : hasVocals,
        attested: true,
        title: title.trim() || null,
        caption: caption.trim() || null,
        cover_of_title: coverTitle.trim() || null,
        cover_of_artist: coverArtist.trim() || null,
        lyrics: !isBeat && lyrics.trim() ? lyrics.trim() : null,
        lyrics_source: !isBeat && lyrics.trim() ? "written" : null,
        show_lyrics: showLyrics,
        tags: normalizeTags(tags),
        after_piece_id: after?.id ?? null,
        visibility,
        audio: kind === "sound" && audio ? audio : undefined,
        video: kind === "video" ? { upload_id: pieceId } : undefined,
      });
      if (res && !res.ok) setError(res.error ?? "couldn't post.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "couldn't post.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* progress line */}
      {busy && (
        <div className="fixed inset-x-0 top-0 z-50 h-[2px] bg-transparent">
          <div className="h-full bg-lime transition-[width] duration-150 ease-out" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}

      {welcome && kind === null && (
        <p className="mb-6 text-center font-serif text-2xl text-bone">
          welcome in. post the first take.
        </p>
      )}

      {kind === null ? (
        <DropZone inputRef={inputRef} onFiles={onFiles} videoEnabled={videoEnabled} busy={busy} />
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <span className="meta meta-caps text-bone-46">{kind === "sound" ? "audio" : "video"}</span>
            <button onClick={reset} className="meta text-bone-46 hover:text-bone">
              start over
            </button>
          </div>

          <MediaPreview kind={kind} audio={audio} previewUrl={previewUrl} videoReady={videoReady} />

          <PublishForm
            kind={kind}
            attested={attested} setAttested={setAttested}
            trackKind={trackKind} selectKind={selectKind}
            hasVocals={hasVocals} setHasVocals={setHasVocals}
            coverTitle={coverTitle} setCoverTitle={setCoverTitle}
            coverArtist={coverArtist} setCoverArtist={setCoverArtist}
            title={title} setTitle={setTitle}
            caption={caption} setCaption={setCaption}
            lyrics={lyrics} setLyrics={setLyrics}
            showLyrics={showLyrics} setShowLyrics={setShowLyrics}
            tags={tags} setTags={setTags}
            visibility={visibility} setVisibility={setVisibility}
            after={after} setAfter={setAfter}
          />

          {error && <p role="alert" className="text-sm text-bone-64">{error}</p>}

          <div className="flex items-center justify-between border-t border-bone-10 pt-6">
            <p className="meta max-w-xs text-bone-32">
              posts as untitled unless you title it. searchable the moment it lands.
            </p>
            <Button variant="solid" size="lg" onClick={publish} disabled={!ready || !attested || publishing}>
              {publishing ? "posting…" : "post it"}
            </Button>
          </div>
        </div>
      )}

      {error && kind === null && <p role="alert" className="mt-6 text-center text-sm text-bone-64">{error}</p>}
    </div>
  );
}

function DropZone({
  inputRef, onFiles, videoEnabled, busy,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFiles: (f: FileList | null) => void;
  videoEnabled: boolean;
  busy: boolean;
}) {
  const [drag, setDrag] = useState(false);
  const accept = videoEnabled ? "audio/*,video/*" : "audio/*";
  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
        className={cn(
          "grid min-h-[52vh] place-items-center rounded-xl border border-dashed p-8 text-center transition-colors duration-150",
          drag ? "border-lime bg-lime/5" : "border-bone-16 hover:border-bone-32",
        )}
      >
        <div>
          <h1 className="font-serif text-4xl text-bone sm:text-5xl">drop the take.</h1>
          <p className="mt-3 text-sm text-bone-46">
            a voice memo, a one-take cover, a verse over a beat{videoEnabled ? ", a video at the piano" : ""}. we&apos;ll figure out the rest.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button variant="solid" size="lg" onClick={() => inputRef.current?.click()} disabled={busy}>
              choose a file
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="sr-only"
            onChange={(e) => onFiles(e.target.files)}
          />
          <p className="meta mt-8 text-bone-32">
            audio ≤ 6 min{videoEnabled ? " · video ≤ 3 min" : ""} · lyrics optional
          </p>
        </div>
      </div>
    </div>
  );
}

function MediaPreview({
  kind, audio, previewUrl, videoReady,
}: {
  kind: TrackMedium;
  audio: AudioMeta | null;
  previewUrl: string | null;
  videoReady: boolean;
}) {
  if (kind === "sound" && audio) {
    return (
      <div className="flex h-28 items-center gap-4 rounded-lg bg-ink-sunken/70 px-4">
        <span className="grid size-11 place-items-center rounded-full border border-lime/50 text-lime">
          <svg width="14" height="14" viewBox="0 0 12 12"><path d="M3 2.2v7.6a.4.4 0 0 0 .62.34l6-3.8a.4.4 0 0 0 0-.68l-6-3.8A.4.4 0 0 0 3 2.2Z" fill="currentColor" /></svg>
        </span>
        <div className="h-14 flex-1"><Waveform peaks={audio.peaks} progress={0} bars={96} draw /></div>
        <span className="meta w-10 text-right">{formatDuration(audio.duration)}</span>
      </div>
    );
  }
  // video
  return (
    <div className="relative grid aspect-video place-items-center rounded-lg bg-ink-sunken">
      {previewUrl ? (
        <video src={previewUrl} className="h-full w-full rounded-lg object-contain" muted controls />
      ) : null}
      {!videoReady && <p className="meta absolute text-bone-46">uploading to mux…</p>}
    </div>
  );
}

function PublishForm(props: {
  kind: TrackMedium;
  attested: boolean; setAttested: (v: boolean) => void;
  trackKind: TrackKind; selectKind: (v: TrackKind) => void;
  hasVocals: boolean; setHasVocals: (v: boolean) => void;
  coverTitle: string; setCoverTitle: (v: string) => void;
  coverArtist: string; setCoverArtist: (v: string) => void;
  title: string; setTitle: (v: string) => void;
  caption: string; setCaption: (v: string) => void;
  lyrics: string; setLyrics: (v: string) => void;
  showLyrics: boolean; setShowLyrics: (v: boolean) => void;
  tags: string[]; setTags: (v: string[]) => void;
  visibility: Visibility; setVisibility: (v: Visibility) => void;
  after: AfterRef | null; setAfter: (v: AfterRef | null) => void;
}) {
  const {
    kind, attested, setAttested, trackKind, selectKind, hasVocals, setHasVocals,
    coverTitle, setCoverTitle, coverArtist, setCoverArtist, title, setTitle,
    caption, setCaption, lyrics, setLyrics, showLyrics, setShowLyrics,
    tags, setTags, visibility, setVisibility, after, setAfter,
  } = props;
  const [customTag, setCustomTag] = useState("");
  const suggestions = suggestedStarterTags();
  const isBeat = trackKind === "beat";
  const isCover = trackKind === "cover";
  const isFreestyle = trackKind === "freestyle";

  function toggleTag(t: string) {
    setTags(tags.includes(t) ? tags.filter((x) => x !== t) : tags.length < 8 ? [...tags, t] : tags);
  }
  function addCustom() {
    const n = normalizeTags([customTag])[0];
    if (n && !tags.includes(n) && tags.length < 8) setTags([...tags, n]);
    setCustomTag("");
  }

  return (
    <div className="space-y-6">
      {/* attestation */}
      <label className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors", attested ? "border-lime/50 bg-lime/5" : "border-bone-16")}>
        <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="mt-0.5 size-4 accent-lime" />
        <span className="text-sm text-bone-64">
          <span className="text-bone">I made this.</span> it&apos;s human-made — no AI-generated vocals,
          instruments, or lyrics. it won&apos;t be used to train AI.
        </span>
      </label>

      {/* track kind */}
      <div>
        <p className="meta meta-caps mb-2 text-bone-46">what is it</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TRACK_KINDS.map((k) => {
            const on = trackKind === k.value;
            return (
              <button
                key={k.value}
                type="button"
                onClick={() => selectKind(k.value)}
                aria-pressed={on}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-colors",
                  on ? "border-lime bg-lime/10" : "border-bone-16 hover:border-bone-32",
                )}
              >
                <span className={cn("block text-sm", on ? "text-lime" : "text-bone")}>{k.label}</span>
                <span className="meta mt-0.5 block text-bone-32">{k.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* cover / freestyle attribution */}
      {(isCover || isFreestyle) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={coverTitle}
            onChange={(e) => setCoverTitle(e.target.value)}
            maxLength={120}
            placeholder={isCover ? "song you're covering" : "beat / song it's over (optional)"}
            className="h-11 rounded-lg border border-bone-16 bg-ink-sunken px-4 text-sm text-bone outline-none placeholder:text-bone-32 focus-visible:border-lime/40"
          />
          <input
            value={coverArtist}
            onChange={(e) => setCoverArtist(e.target.value)}
            maxLength={120}
            placeholder="original artist (optional)"
            className="h-11 rounded-lg border border-bone-16 bg-ink-sunken px-4 text-sm text-bone outline-none placeholder:text-bone-32 focus-visible:border-lime/40"
          />
        </div>
      )}

      {/* vocals toggle (hidden for beats) */}
      {!isBeat && (
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={hasVocals} onChange={(e) => setHasVocals(e.target.checked)} className="size-4 accent-lime" />
          <span className="text-sm text-bone-64">this has vocals <span className="text-bone-32">— we&apos;ll help make the lyrics searchable</span></span>
        </label>
      )}

      {/* lyrics (hidden for beats) */}
      {!isBeat && (
        <div>
          <p className="meta meta-caps mb-2 text-bone-46">lyrics <span className="text-bone-32">· optional</span></p>
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value.slice(0, 4000))}
            rows={5}
            placeholder="paste the words — or leave it, and we can transcribe them from the vocal for you to confirm."
            className="w-full resize-none rounded-lg border border-bone-16 bg-ink-sunken p-4 font-serif text-[1.1rem] leading-relaxed text-bone outline-none placeholder:font-sans placeholder:text-sm placeholder:text-bone-32 focus-visible:border-lime/40"
          />
          {kind === "video" && lyrics.trim() && (
            <label className="mt-2 flex cursor-pointer items-center gap-3">
              <input type="checkbox" checked={showLyrics} onChange={(e) => setShowLyrics(e.target.checked)} className="size-4 accent-lime" />
              <span className="text-sm text-bone-64">open the lyric panel by default on this video</span>
            </label>
          )}
        </div>
      )}

      {/* tags */}
      <div>
        <p className="meta meta-caps mb-2 text-bone-46">tags {tags.length > 0 && `· ${tags.length}`}</p>
        <div className="flex flex-wrap gap-2">
          {[...new Set([...tags, ...suggestions])].map((t) => {
            const on = tags.includes(t);
            return (
              <button key={t} type="button" onClick={() => toggleTag(t)} className={cn("rounded-full border px-3 py-1.5 font-mono text-[0.75rem] transition-colors", on ? "border-lime bg-lime/10 text-lime" : "border-bone-16 text-bone-46 hover:text-bone")}>
                {t}
              </button>
            );
          })}
        </div>
        <input value={customTag} onChange={(e) => setCustomTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())} placeholder="add a tag…" maxLength={30} className="mt-3 h-9 w-48 rounded-full border border-bone-16 bg-ink-sunken px-4 text-sm text-bone outline-none placeholder:text-bone-32 focus-visible:border-lime/40" />
      </div>

      {/* title + caption */}
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="title (optional)" className="h-11 rounded-lg border border-bone-16 bg-ink-sunken px-4 text-sm text-bone outline-none placeholder:text-bone-32 focus-visible:border-lime/40" />
        <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={280} placeholder="caption (optional)" className="h-11 rounded-lg border border-bone-16 bg-ink-sunken px-4 text-sm text-bone outline-none placeholder:text-bone-32 focus-visible:border-lime/40" />
      </div>

      <AfterPicker after={after} setAfter={setAfter} />

      {/* visibility */}
      <div>
        <p className="meta meta-caps mb-2 text-bone-46">who sees it</p>
        <div className="inline-flex rounded-full border border-bone-16 p-1">
          {(["public", "followers", "unlisted"] as Visibility[]).map((v) => (
            <button key={v} type="button" onClick={() => setVisibility(v)} className={cn("rounded-full px-4 py-1.5 text-sm transition-colors", visibility === v ? "bg-bone text-ink" : "text-bone-46 hover:text-bone")}>
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AfterPicker({ after, setAfter }: { after: AfterRef | null; setAfter: (v: AfterRef | null) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<AfterRef[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      const res = await searchAfterPieces(v);
      setResults(res.map((r) => ({ id: r.id, label: `${r.label} · @${r.handle}`, handle: r.handle })));
    }, 220);
  }

  if (after) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-bone-16 px-4 py-3">
        <span className="text-sm text-bone-64">after <span className="text-bone">{after.label}</span></span>
        <button onClick={() => setAfter(null)} className="meta text-bone-46 hover:text-bone">remove</button>
      </div>
    );
  }
  return (
    <div>
      <p className="meta meta-caps mb-2 text-bone-46">after (optional)</p>
      <input value={q} onChange={(e) => onChange(e.target.value)} placeholder="the original a cover answers, the track a freestyle rides…" className="h-11 w-full rounded-lg border border-bone-16 bg-ink-sunken px-4 text-sm text-bone outline-none placeholder:text-bone-32 focus-visible:border-lime/40" />
      {results.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-lg border border-bone-10">
          {results.map((r) => (
            <button key={r.id} onClick={() => { setAfter(r); setQ(""); setResults([]); }} className="block w-full truncate px-4 py-2 text-left text-sm text-bone-64 transition-colors hover:bg-bone-06 hover:text-bone">
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
