import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { MarketingFooter } from "@/components/marketing/footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <header className="sticky top-0 z-40 border-b border-bone-10 bg-ink/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-10">
          <Logo size="md" />
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/wander" className={buttonClasses("ghost", "sm")}>
              wander
            </Link>
            <Link href="/login" className={buttonClasses("solid", "sm")}>
              join
            </Link>
          </nav>
        </div>
      </header>

      <main id="main">{children}</main>

      <MarketingFooter />
    </div>
  );
}
