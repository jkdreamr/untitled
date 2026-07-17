import Link from "next/link";
import { cn } from "@/lib/utils";

/** The UNTITLED wordmark. The lime underscore is the one accent. */
export function Logo({
  className,
  href = "/",
  size = "md",
}: {
  className?: string;
  href?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const text = size === "lg" ? "text-lg" : size === "sm" ? "text-[0.8125rem]" : "text-sm";
  const mark = (
    <span className={cn("relative inline-flex select-none items-baseline font-semibold tracking-[0.16em]", text)}>
      <span className="text-bone">UNTITLED</span>
      <span aria-hidden className="ml-1 h-[2px] w-3 self-end bg-lime" />
    </span>
  );
  if (href === null) return <span className={className}>{mark}</span>;
  return (
    <Link href={href} className={cn("group inline-flex", className)} aria-label="UNTITLED home">
      {mark}
    </Link>
  );
}
