import Link from "next/link";
import { cn } from "@/lib/utils";

/** Sub-nav shared by the scout tools, rendered inside the authenticated app shell. */
export function ScoutNav({ active }: { active: "search" | "lists" }) {
  return (
    <div className="mb-8 flex items-center justify-between border-b border-bone-10 pb-4">
      <div className="flex items-baseline gap-5">
        <span className="font-serif text-2xl text-bone">scout</span>
        <nav className="flex gap-1">
          <Tab href="/scout/search" on={active === "search"}>
            search
          </Tab>
          <Tab href="/scout/lists" on={active === "lists"}>
            lists
          </Tab>
        </nav>
      </div>
      <span className="meta meta-caps hidden text-bone-32 sm:inline">talent signals</span>
    </div>
  );
}

function Tab({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm transition-colors",
        on ? "text-lime" : "text-bone-64 hover:text-bone",
      )}
    >
      {children}
    </Link>
  );
}
