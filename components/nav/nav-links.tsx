"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/feed", label: "feed" },
  { href: "/wander", label: "wander" },
  { href: "/search", label: "search" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm transition-colors duration-150",
              active ? "text-bone" : "text-bone-46 hover:text-bone",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
