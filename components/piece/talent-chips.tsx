import { cn } from "@/lib/utils";

/** The roles a musician claims — small quiet chips. */
export function RoleChips({ roles, className }: { roles: string[]; className?: string }) {
  if (!roles || roles.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {roles.map((r) => (
        <span key={r} className="rounded-full border border-bone-16 px-2.5 py-0.5 font-mono text-[0.7rem] text-bone-64">
          {r}
        </span>
      ))}
    </div>
  );
}

/** What a musician is open to — lime, because it's an invitation. */
export function OpenToBadges({ openTo, className }: { openTo: string[]; className?: string }) {
  if (!openTo || openTo.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {openTo.map((o) => (
        <span key={o} className="rounded-full border border-lime/30 bg-lime/5 px-2.5 py-0.5 font-mono text-[0.7rem] text-lime">
          open to {o}
        </span>
      ))}
    </div>
  );
}

/** One line on how they sound — Space Mono, per the design system. */
export function VoiceNote({ note, className }: { note: string | null; className?: string }) {
  if (!note) return null;
  return <p className={cn("font-mono text-[0.8rem] leading-relaxed text-bone-64", className)}>“{note}”</p>;
}
