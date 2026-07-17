import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { NavLinks } from "@/components/nav/nav-links";
import { AccountMenu } from "@/components/nav/account-menu";
import { buttonClasses } from "@/components/ui/button";

export interface NavProfile {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}

export function AppNav({ profile }: { profile: NavProfile | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-bone-10 bg-ink/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-8">
        <Logo size="md" />
        <div className="ml-2 hidden md:block">
          <NavLinks />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {profile ? (
            <>
              <Link href="/compose" className={buttonClasses("outline", "sm")}>
                <span aria-hidden className="text-lime">
                  +
                </span>
                post
              </Link>
              <AccountMenu
                handle={profile.handle}
                displayName={profile.displayName}
                avatarUrl={profile.avatarUrl}
                isAdmin={profile.isAdmin}
              />
            </>
          ) : (
            <>
              <Link href="/login" className={buttonClasses("ghost", "sm")}>
                sign in
              </Link>
              <Link href="/login" className={buttonClasses("solid", "sm")}>
                join
              </Link>
            </>
          )}
        </div>
      </div>
      {/* mobile links row */}
      <div className="flex items-center justify-center gap-1 border-t border-bone-10 py-1.5 md:hidden">
        <NavLinks />
      </div>
    </header>
  );
}
