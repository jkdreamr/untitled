import { cn } from "@/lib/utils";

const SIZES = { xs: "size-6 text-[0.6rem]", sm: "size-8 text-xs", md: "size-11 text-sm", lg: "size-20 text-xl" };

/** Avatar with a bone-on-ink initial fallback. Uses a plain img (signed URL). */
export function Avatar({
  url,
  name,
  size = "sm",
  className,
}: {
  url?: string | null;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-bone-10 bg-ink-raised font-medium text-bone-64",
        SIZES[size],
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span aria-hidden>{initial}</span>
      )}
    </span>
  );
}
