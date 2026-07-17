import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="flex h-16 items-center px-6 sm:px-10">
        <Logo size="md" />
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-6 py-10">
        {children}
      </main>
      <footer className="px-6 py-8 text-center sm:px-10">
        <Link href="/" className="meta text-bone-32 transition-colors hover:text-bone-64">
          ← back to the door
        </Link>
      </footer>
    </div>
  );
}
