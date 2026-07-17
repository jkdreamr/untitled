import Image from "next/image";
import { blurhashToDataUrl } from "@/lib/blurhash";
import type { MediaItem } from "@/lib/types";

/**
 * Image piece — one large uncropped image, or a horizontal "roll" of up to 6.
 * Dimensions are reserved from stored width/height (no CLS); blurhash placeholder.
 */
export async function ImageRoll({ media, priority = false }: { media: MediaItem[]; priority?: boolean }) {
  const images = media.filter((m) => m.kind === "image" && m.url);
  if (images.length === 0) return null;

  const withBlur = await Promise.all(
    images.map(async (m) => ({ m, blur: await blurhashToDataUrl(m.blurhash) })),
  );

  if (withBlur.length === 1) {
    const { m, blur } = withBlur[0]!;
    return <SingleImage media={m} blur={blur} priority={priority} />;
  }

  return (
    <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-lg">
      {withBlur.map(({ m, blur }, i) => (
        <div key={i} className="w-[85%] shrink-0 snap-center sm:w-[70%]">
          <SingleImage media={m} blur={blur} priority={priority && i === 0} />
        </div>
      ))}
    </div>
  );
}

function SingleImage({
  media,
  blur,
  priority,
}: {
  media: MediaItem;
  blur: string | null;
  priority: boolean;
}) {
  const w = media.width ?? 1200;
  const h = media.height ?? 900;
  return (
    <div className="overflow-hidden rounded-lg bg-ink-sunken">
      <Image
        src={media.url!}
        alt=""
        width={w}
        height={h}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        sizes="(max-width: 640px) 92vw, 640px"
        placeholder={blur ? "blur" : "empty"}
        blurDataURL={blur ?? undefined}
        className="h-auto w-full object-contain"
      />
    </div>
  );
}
