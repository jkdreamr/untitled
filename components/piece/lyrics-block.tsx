import { cn } from "@/lib/utils";

/**
 * Lyrics rendered safely: React escapes the text, whitespace is preserved via
 * CSS. No dangerouslySetInnerHTML anywhere near user content. This is the static
 * view; the synced, player-tied view lives in `synced-lyrics.tsx`.
 */
export function LyricsBlock({
  lyrics,
  clamp = false,
  className,
}: {
  lyrics: string;
  clamp?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose-words whitespace-pre-wrap rounded-lg bg-ink-sunken/40 p-6 font-serif text-[1.35rem] leading-relaxed text-bone-80 sm:p-8 sm:text-[1.5rem]",
        clamp && "line-clamp-[10]",
        className,
      )}
    >
      {lyrics}
    </div>
  );
}
