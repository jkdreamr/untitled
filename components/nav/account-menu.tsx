"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { signOut } from "@/lib/auth/actions";

export function AccountMenu({
  handle,
  displayName,
  avatarUrl,
  isAdmin,
  isScout,
  unreadNotifications,
}: {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  isScout: boolean;
  unreadNotifications: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="account menu"
        className="rounded-full transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime active:scale-95"
      >
        <Avatar url={avatarUrl} name={displayName} size="sm" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-lg border border-bone-10 bg-ink-raised/95 py-1.5 backdrop-blur-xl [animation:veil-up_.16s_var(--ease-out)_both] [box-shadow:var(--shadow-lift)]"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm text-bone">{displayName}</p>
            <p className="meta truncate">@{handle}</p>
          </div>
          <div className="my-1 h-px bg-bone-10" />
          <Link
            href="/notifications"
            role="menuitem"
            className="flex items-center justify-between px-3 py-2 text-sm text-bone-64 transition-colors hover:bg-bone-06 hover:text-bone"
          >
            <span>inbox</span>
            {unreadNotifications > 0 && (
              <span className="ml-2 min-w-[1.15rem] rounded-full bg-lime px-1 text-center text-[0.65rem] font-medium text-ink">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </Link>
          <Item href={`/${handle}`}>your work</Item>
          <Item href="/dashboard">dashboard</Item>
          <Item href="/collections">collections</Item>
          <Item href="/settings">settings</Item>
          {isScout && <Item href="/scout">scout tools</Item>}
          {isAdmin && <Item href="/admin">admin</Item>}
          <div className="my-1 h-px bg-bone-10" />
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-bone-46 transition-colors hover:bg-bone-06 hover:text-bone"
            >
              sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Item({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="block px-3 py-2 text-sm text-bone-64 transition-colors hover:bg-bone-06 hover:text-bone"
    >
      {children}
    </Link>
  );
}
