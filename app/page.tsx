import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Preloader } from "@/components/brand/preloader";
import { buttonClasses } from "@/components/ui/button";
import { PreviewCard } from "@/components/marketing/preview-card";
import { MarketingFooter } from "@/components/marketing/footer";
import { getLandingPreviews } from "@/lib/data/landing";
import { getSessionUser } from "@/lib/data/profiles";

export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) redirect("/feed");

  const previews = await getLandingPreviews();

  return (
    <>
      <Preloader />
      <div className="relative flex min-h-dvh flex-col">
        {/* header */}
        <header className="sticky top-0 z-40 border-b border-bone-10 bg-ink/70 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-10">
            <Logo size="md" />
            <nav className="flex items-center gap-1 sm:gap-2">
              <Link href="/login" className={buttonClasses("ghost", "sm", "hidden sm:inline-flex")}>
                sign in
              </Link>
              <Link href="/login" className={buttonClasses("solid", "sm")}>
                join
              </Link>
            </nav>
          </div>
        </header>

        <main id="main" className="flex-1">
          {/* 1 — hero */}
          <section className="mx-auto max-w-6xl px-6 pb-12 pt-20 sm:px-10 sm:pt-28">
            <p className="meta meta-caps mb-8 text-bone-52 [animation:fade-in_.3s_ease-out_both]">
              a product of NOVUM Labs
            </p>
            <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-end">
              <h1 className="display text-[clamp(3.2rem,9vw,7.5rem)] text-bone [animation:rise-in_.3s_var(--ease-out)_both]">
                post the take.
                <br />
                <span className="text-bone-46 italic">skip everything else.</span>
              </h1>
              <div className="max-w-md [animation:rise-in_.3s_var(--ease-out)_.08s_both]">
                <p className="text-[1.15rem] leading-relaxed text-bone-64">
                  raw music from real people. no polish, no rankings, no algorithm to feed.
                </p>
                <div className="mt-7">
                  <Link href="/login" className={buttonClasses("solid", "lg")}>
                    start posting
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* 2 — the takes: the whole argument */}
          <section aria-label="recent takes" className="border-y border-bone-10 py-12 sm:py-16">
            <div className="no-scrollbar flex gap-5 overflow-x-auto px-6 pb-1 sm:px-10 [animation:fade-in_.4s_ease-out_.12s_both]">
              {previews.map((item, i) => (
                <Link
                  key={`${item.artistHandle}-${i}`}
                  href="/wander"
                  aria-label={`hear ${item.artistName}'s take`}
                  className="shrink-0 rounded-lg transition-transform duration-200 ease-out hover:-translate-y-1 focus-visible:-translate-y-1"
                >
                  <PreviewCard item={item} index={i} />
                </Link>
              ))}
              <div className="w-2 shrink-0" aria-hidden />
            </div>
          </section>

          {/* 3 — pledge + close */}
          <section className="mx-auto max-w-3xl px-6 py-24 text-center sm:px-10 sm:py-32">
            <p className="meta meta-caps mb-6 text-lime">the pledge</p>
            <p className="display text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.05] text-bone">
              everything here was made by a person.
            </p>
            <p className="mx-auto mt-6 max-w-xl text-[1.05rem] leading-relaxed text-bone-64">
              one tap at upload — <span className="text-bone">&ldquo;I made this&rdquo;</span> — and a
              terms clause that forbids training on it. AI never makes the music; it only helps the
              right listener find you.
            </p>
            <div className="mt-10">
              <Link href="/login" className={buttonClasses("solid", "lg")}>
                post the first take
              </Link>
            </div>
          </section>
        </main>

        <MarketingFooter />
      </div>
    </>
  );
}
