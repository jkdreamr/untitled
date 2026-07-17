import { WaveformStatic } from "@/components/media/waveform-static";
import { formatDuration, formatPieceDate, pieceTitle } from "@/lib/utils";
import type { PreviewItem } from "@/lib/sampler";

const MEDIUM_GLYPH: Record<PreviewItem["medium"], string> = {
  sound: "sound",
  image: "image",
  video: "video",
  words: "words",
};

/** A compact, non-interactive preview used on the landing strip. */
export function PreviewCard({ item, index = 0 }: { item: PreviewItem; index?: number }) {
  return (
    <figure
      className="group flex w-[19rem] shrink-0 flex-col gap-3 rounded-lg border border-bone-10 bg-ink-raised/60 p-3 opacity-0 [animation:rise-in_.32s_var(--ease-out)_both]"
      style={{ animationDelay: `${120 + index * 70}ms` }}
    >
      <Body item={item} />
      <figcaption className="flex items-baseline justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="truncate text-sm text-bone">{pieceTitle(item.title, item.sequenceNo)}</p>
          <p className="meta mt-0.5 truncate">@{item.artistHandle}</p>
        </div>
        <span className="meta meta-caps shrink-0 text-bone-32">{MEDIUM_GLYPH[item.medium]}</span>
      </figcaption>
    </figure>
  );
}

function Body({ item }: { item: PreviewItem }) {
  if (item.medium === "sound") {
    return (
      <div className="flex h-40 flex-col justify-between rounded-md bg-ink-sunken/70 p-4">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full border border-bone-16 text-bone">
            <PlayGlyph />
          </span>
          <span className="meta">{formatDuration(item.duration)}</span>
        </div>
        <div className="h-14 w-full">
          <WaveformStatic peaks={item.peaks} bars={64} progress={0.32} />
        </div>
      </div>
    );
  }
  if (item.medium === "words") {
    return (
      <div className="flex h-40 items-center rounded-md bg-ink-sunken/70 p-5">
        <p className="prose-words font-serif text-[1.15rem] leading-snug text-bone-80">{item.words}</p>
      </div>
    );
  }
  // image / video
  const src = item.imageUrl ?? item.imageSvg;
  return (
    <div className="relative h-40 overflow-hidden rounded-md bg-ink-sunken">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URI or short-lived signed URL
        <img src={src} alt={item.title ?? ""} className="h-full w-full object-cover" />
      ) : null}
      {item.medium === "video" ? (
        <>
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-11 place-items-center rounded-full bg-ink-veil text-bone backdrop-blur-sm">
              <PlayGlyph />
            </span>
          </span>
          {item.duration ? (
            <span className="meta absolute bottom-2 right-2 rounded bg-ink-veil px-1.5 py-0.5 text-bone">
              {formatDuration(item.duration)}
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function PlayGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M3 2.2v7.6a.4.4 0 0 0 .62.34l6-3.8a.4.4 0 0 0 0-.68l-6-3.8A.4.4 0 0 0 3 2.2Z" fill="currentColor" />
    </svg>
  );
}
