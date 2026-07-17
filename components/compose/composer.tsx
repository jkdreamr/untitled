"use client";

import { useCallback, useRef, useState } from "react";
import { Waveform } from "@/components/media/waveform";
import { Button } from "@/components/ui/button";
import { decodeAudioPeaks } from "@/lib/audio/peaks";
import { putWithProgress } from "@/lib/upload/xhr";
import { requestUploadUrl, publishPiece, searchAfterPieces } from "@/lib/compose/actions";
import { suggestedTagsForMedium, TAXONOMY, normalizeTags } from "@/lib/taxonomy";
import { extOf } from "@/lib/media/validate";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Medium, Visibility } from "@/lib/types";

type Kind = Medium | null;
interface AudioMeta { path: string; duration: number; peaks: number[]; mime: string; bytes: number }
interface ImageMeta { path: string; width: number; height: number; blurhash: string; bytes: number }
interface AfterRef { id: string; label: string; handle: string }

function detectKind(file: File): Exclude<Kind, null> | "unknown" {
  if (file.type.startsWith("audio/")) return "sound";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  const ext = extOf(file.name);
  if (["mp3", "wav", "m4a", "ogg", "flac", "aac"].includes(ext)) return "sound";
  if (["jpg", "jpeg", "png", "webp", "heic", "heif", "gif"].includes(ext)) return "image";
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
  const [images, setImages] = useState<ImageMeta[]>([]);
  const [videoReady, setVideoReady] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // form
  const [attested, setAttested] = useState(false);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [after, setAfter] = useState<AfterRef | null>(null);
  const [publishing, setPublishing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    setKind(null); setPieceId(""); setAudio(null); setImages([]); setVideoReady(false);
    setPreviewUrls([]); setAttested(false); setTitle(""); setCaption(""); setBody("");
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
          if (duration > 360) throw new Error("sound is capped at 6 minutes.");
          const ext = extOf(first.name) || "mp3";
          const url = await requestUploadUrl(id, "audio", ext);
          if (!url.ok) throw new Error(url.error);
          await putWithProgress(url.signedUrl, first, setProgress, { "content-type": first.type || "audio/mpeg" });
          setAudio({ path: url.path, duration, peaks, mime: first.type || "audio/mpeg", bytes: first.size });
          setTags(suggestedTagsForMedium("sound").slice(0, 0));
        } else if (detected === "image") {
          setKind("image");
          const list = Array.from(files).slice(0, 6);
          setPreviewUrls(list.map((f) => URL.createObjectURL(f)));
          const metas: ImageMeta[] = [];
          for (let i = 0; i < list.length; i++) {
            const f = list[i]!;
            const ext = extOf(f.name) || "jpg";
            const staging = await requestUploadUrl(id, "staging", ext);
            if (!staging.ok) throw new Error(staging.error);
            await putWithProgress(staging.signedUrl, f, (p) => setProgress((i + p) / list.length), {
              "content-type": f.type || "image/jpeg",
            });
            const res = await fetch("/api/media/process-image", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ pieceId: id, stagingPath: staging.path, position: i }),
            });
            if (!res.ok) throw new Error("couldn't process an image.");
            metas.push((await res.json()) as ImageMeta);
          }
          setImages(metas);
        } else if (detected === "video") {
          if (!videoEnabled) throw new Error("video posting isn't available right now.");
          setKind("video");
          setPreviewUrls([URL.createObjectURL(first)]);
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
          throw new Error("that file type isn't supported.");
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

  async function startWords() {
    setError(null);
    setKind("words");
    setPieceId(crypto.randomUUID());
  }

  const ready =
    (kind === "sound" && !!audio) ||
    (kind === "image" && images.length > 0) ||
    (kind === "video" && videoReady) ||
    (kind === "words" && body.trim().length > 0);

  async function publish() {
    if (!attested) return setError("tap the attestation — this must be human-made.");
    if (!ready) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await publishPiece({
        id: pieceId,
        medium: kind!,
        attested: true,
        title: title.trim() || null,
        caption: caption.trim() || null,
        body: body.trim() || null,
        tags: normalizeTags(tags),
        after_piece_id: after?.id ?? null,
        visibility,
        audio: kind === "sound" && audio ? audio : undefined,
        images: kind === "image" ? images : undefined,
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
        <DropZone
          inputRef={inputRef}
          onFiles={onFiles}
          onWords={startWords}
          videoEnabled={videoEnabled}
          busy={busy}
        />
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <span className="meta meta-caps text-bone-46">{kind}</span>
            <button onClick={reset} className="meta text-bone-46 hover:text-bone">
              start over
            </button>
          </div>

          <MediaPreview
            kind={kind}
            audio={audio}
            images={images}
            previewUrls={previewUrls}
            videoReady={videoReady}
            body={body}
            setBody={setBody}
          />

          <PublishForm
            kind={kind}
            attested={attested} setAttested={setAttested}
            title={title} setTitle={setTitle}
            caption={caption} setCaption={setCaption}
            body={body} setBody={setBody}
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
  inputRef, onFiles, onWords, videoEnabled, busy,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFiles: (f: FileList | null) => void;
  onWords: () => void;
  videoEnabled: boolean;
  busy: boolean;
}) {
  const [drag, setDrag] = useState(false);
  const accept = videoEnabled ? "audio/*,image/*,video/*" : "audio/*,image/*";
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
          <h1 className="font-serif text-4xl text-bone sm:text-5xl">drop the raw thing.</h1>
          <p className="mt-3 text-sm text-bone-46">
            a voice memo, a photo, a drawing{videoEnabled ? ", a video" : ""}. we&apos;ll figure out the rest.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button variant="solid" size="lg" onClick={() => inputRef.current?.click()} disabled={busy}>
              choose a file
            </Button>
            <Button variant="outline" size="lg" onClick={onWords} disabled={busy}>
              write words
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple
            className="sr-only"
            onChange={(e) => onFiles(e.target.files)}
          />
          <p className="meta mt-8 text-bone-32">
            sound ≤ 6 min · images ≤ 6 per roll{videoEnabled ? " · video ≤ 3 min" : ""} · words ≤ 2,000
          </p>
        </div>
      </div>
    </div>
  );
}

function MediaPreview({
  kind, audio, images, previewUrls, videoReady, body, setBody,
}: {
  kind: Medium;
  audio: AudioMeta | null;
  images: ImageMeta[];
  previewUrls: string[];
  videoReady: boolean;
  body: string;
  setBody: (v: string) => void;
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
  if (kind === "image") {
    return (
      <div className="no-scrollbar flex gap-3 overflow-x-auto">
        {previewUrls.map((u, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={u} alt="" className="h-48 w-auto rounded-lg object-cover" />
        ))}
        {images.length === 0 && <p className="meta text-bone-46">processing…</p>}
      </div>
    );
  }
  if (kind === "video") {
    return (
      <div className="grid aspect-video place-items-center rounded-lg bg-ink-sunken">
        {previewUrls[0] ? (
          <video src={previewUrls[0]} className="h-full w-full rounded-lg object-contain" muted controls />
        ) : null}
        {!videoReady && <p className="meta absolute text-bone-46">uploading to mux…</p>}
      </div>
    );
  }
  // words
  return (
    <textarea
      value={body}
      onChange={(e) => setBody(e.target.value.slice(0, 2000))}
      autoFocus
      rows={10}
      placeholder="lyrics, a poem, a fragment, prose…"
      className="w-full resize-none rounded-lg bg-ink-sunken/40 p-6 font-serif text-[1.35rem] leading-relaxed text-bone outline-none placeholder:text-bone-32 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
    />
  );
}

function PublishForm(props: {
  kind: Medium;
  attested: boolean; setAttested: (v: boolean) => void;
  title: string; setTitle: (v: string) => void;
  caption: string; setCaption: (v: string) => void;
  body: string; setBody: (v: string) => void;
  tags: string[]; setTags: (v: string[]) => void;
  visibility: Visibility; setVisibility: (v: Visibility) => void;
  after: AfterRef | null; setAfter: (v: AfterRef | null) => void;
}) {
  const { kind, attested, setAttested, title, setTitle, caption, setCaption, body, setBody, tags, setTags, visibility, setVisibility, after, setAfter } = props;
  const [customTag, setCustomTag] = useState("");
  const suggestions = suggestedTagsForMedium(kind);

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
          <span className="text-bone">I made this.</span> it&apos;s human-made — no AI-generated images,
          vocals, music, or text. it won&apos;t be used to train AI.
        </span>
      </label>

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

      {/* lyrics pairing for sound/image */}
      {(kind === "sound" || kind === "image") && (
        <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 2000))} rows={3} placeholder="words to pair with it — lyrics, a note (optional)" className="w-full resize-none rounded-lg border border-bone-16 bg-ink-sunken p-4 font-serif text-base text-bone outline-none placeholder:text-bone-32 focus-visible:border-lime/40" />
      )}

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
      <input value={q} onChange={(e) => onChange(e.target.value)} placeholder="a cover's original, the photo a drawing came from…" className="h-11 w-full rounded-lg border border-bone-16 bg-ink-sunken px-4 text-sm text-bone outline-none placeholder:text-bone-32 focus-visible:border-lime/40" />
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
