import { cn } from "@/lib/utils";

/**
 * Words rendered safely: React escapes the text, whitespace is preserved via
 * CSS. No dangerouslySetInnerHTML anywhere near user content.
 */
export function WordsBlock({
  body,
  clamp = false,
  className,
}: {
  body: string;
  clamp?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose-words rounded-lg bg-ink-sunken/40 p-6 font-serif text-[1.35rem] leading-relaxed text-bone-80 sm:p-8 sm:text-[1.5rem]",
        clamp && "line-clamp-[10]",
        className,
      )}
    >
      {body}
    </div>
  );
}
