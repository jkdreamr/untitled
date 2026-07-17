import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { FEATURES } from "@/lib/env.server";

export function MarketingFooter() {
  return (
    <footer className="border-t border-bone-10 px-6 py-14 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div className="max-w-sm">
          <Logo href="/" size="md" />
          <p className="mt-4 text-sm leading-relaxed text-bone-46">
            the platform for raw, human-made art. human-made art, human-made discovery — AI never
            touches the work.
          </p>
          <p className="meta mt-4">a product of NOVUM Labs</p>
        </div>
        <nav className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm sm:grid-cols-3">
          <FooterLink href="/wander">wander</FooterLink>
          <FooterLink href="/login">join</FooterLink>
          <FooterLink href="/search">search</FooterLink>
          {FEATURES.scout ? <FooterLink href="/scout">scout</FooterLink> : null}
          <FooterLink href="/terms">terms</FooterLink>
          <FooterLink href="/privacy">privacy</FooterLink>
          <FooterLink href="/dmca">dmca</FooterLink>
        </nav>
      </div>
      <p className="meta mx-auto mt-10 max-w-6xl text-bone-32">
        no ai training on this work · © {new Date().getFullYear()} NOVUM Labs
      </p>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-bone-64 transition-colors duration-150 hover:text-bone">
      {children}
    </Link>
  );
}
