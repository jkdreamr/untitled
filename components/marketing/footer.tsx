import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-bone-10 px-6 py-14 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Logo href="/" size="md" />
          <p className="meta mt-4">a product of NOVUM Labs</p>
        </div>
        <nav className="flex gap-6 text-sm">
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
