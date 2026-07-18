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
      <div className="relative">
        {/* header */}
        <header className="sticky top-0 z-40 border-b border-bone-10 bg-ink/70 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-10">
            <Logo size="md" />
            <nav className="flex items-center gap-1 sm:gap-2">
              <Link href="/wander" className={buttonClasses("ghost", "sm")}>
                wander
              </Link>
              <Link href="/login" className={buttonClasses("ghost", "sm", "hidden sm:inline-flex")}>
                sign in
              </Link>
              <Link href="/login" className={buttonClasses("solid", "sm")}>
                join
              </Link>
            </nav>
          </div>
        </header>

        <main id="main">
          {/* hero */}
          <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 sm:px-10 sm:pt-28">
            <p className="meta meta-caps mb-8 text-bone-46 [animation:fade-in_.3s_ease-out_both]">
              a product of NOVUM Labs
            </p>
            <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
              <h1 className="display text-[clamp(3.2rem,9vw,7.5rem)] text-bone [animation:rise-in_.3s_var(--ease-out)_both]">
                post the take.
                <br />
                <span className="text-bone-46 italic">skip everything else.</span>
              </h1>
              <div className="max-w-md [animation:rise-in_.3s_var(--ease-out)_.08s_both]">
                <p className="text-[1.05rem] leading-relaxed text-bone-64">
                  the raw thing itself — the voice memo, the one-take cover, the verse over a beat,
                  the phone video at the piano. no polishing, no captions to optimize, no algorithm
                  to feed.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link href="/login" className={buttonClasses("solid", "lg")}>
                    start posting
                  </Link>
                  <Link href="/wander" className={buttonClasses("outline", "lg")}>
                    wander the feed
                  </Link>
                </div>
                <p className="meta mt-6 text-bone-32">
                  raw music, human-made · ai only finds it · titles optional
                </p>
              </div>
            </div>
          </section>

          {/* live strip */}
          <section aria-labelledby="strip-h" className="border-y border-bone-10 py-10">
            <div className="mx-auto mb-5 flex max-w-6xl items-center justify-between px-6 sm:px-10">
              <h2 id="strip-h" className="meta meta-caps text-bone-46">
                posted lately
              </h2>
              <Link href="/wander" className="meta text-bone-46 transition-colors hover:text-bone">
                see more →
              </Link>
            </div>
            <div className="no-scrollbar flex gap-4 overflow-x-auto px-6 pb-2 sm:px-10">
              {previews.map((item, i) => (
                <PreviewCard key={`${item.artistHandle}-${i}`} item={item} index={i} />
              ))}
              <div className="w-2 shrink-0" aria-hidden />
            </div>
          </section>

          {/* pledge */}
          <section className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
            <div className="grid gap-12 md:grid-cols-[1fr_1.2fr] md:items-start">
              <div>
                <h2 className="meta meta-caps text-lime">the pledge</h2>
                <p className="display mt-5 text-[clamp(2rem,4vw,3.25rem)] text-bone">
                  everything here was made by a person.
                </p>
              </div>
              <div className="space-y-6 text-[1.05rem] leading-relaxed text-bone-64 md:pt-14">
                <p>
                  no AI-generated vocals, instrumentals, or lyrics as posted work. one tap at
                  upload — <span className="text-bone">“I made this”</span> — and a terms clause that
                  forbids training on anything you post here.
                </p>
                <p>
                  we&apos;re not against the tools. we&apos;re for the making. AI stays in two lanes:
                  making your lyrics searchable, and helping the right listener find you. it never
                  generates, filters, or “improves” a single take.
                </p>
                <p className="meta text-bone-46">
                  every public page ships{" "}
                  <code className="text-bone-64">noai, noimageai</code> — in the meta and the
                  headers.
                </p>
              </div>
            </div>
          </section>

          {/* discovery */}
          <section className="border-t border-bone-10 bg-ink-raised/30">
            <div className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
              <h2 className="display text-[clamp(1.8rem,3.5vw,2.75rem)] text-bone">
                raw music, human-made — <span className="text-bone-46 italic">AI only finds it.</span>
              </h2>
              <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-3">
                <Feature
                  n="01"
                  title="search that hears the words"
                  body="natural-language, and it reads the lyrics too. “melancholic bedroom guitar cover, low voice” or a line you half-remember — it matches the actual audio and the words in it."
                />
                <Feature
                  n="02"
                  title="find the musician"
                  body="search by sound, by role, by who's open to work. a producer looking for a low alto, a writer open to features — discovery points at people, not just tracks."
                />
                <Feature
                  n="03"
                  title="no rankings, ever"
                  body="the following feed is strictly reverse-chronological. no trending, no leaderboards, nothing optimized for time-on-app. artists never pay to be heard."
                />
              </div>
            </div>
          </section>

          {/* the take */}
          <section className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
            <h2 className="meta meta-caps mb-10 text-bone-46">everything is a track</h2>
            <dl className="grid gap-px overflow-hidden rounded-lg border border-bone-10 bg-bone-10 sm:grid-cols-2">
              <Format name="audio" limit="up to 6 min" body="voice memos, one-take covers, demos, verses over a beat, a cappella — the waveform shows up the second you drop the file." />
              <Format name="video" limit="up to 3 min" body="singing, playing, performing — the phone video at the piano. muted poster, tap to play." />
            </dl>
            <p className="mt-6 max-w-2xl text-[0.95rem] leading-relaxed text-bone-46">
              lyrics ride along with the take — paste them, or let us transcribe the vocal for you to
              confirm. covers, freestyles, and beats each get their own tag, so the right thing finds
              the right ears.
            </p>
          </section>

          {/* final CTA */}
          <section className="border-t border-bone-10">
            <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 py-28 sm:px-10">
              <h2 className="display text-[clamp(2.5rem,7vw,5.5rem)] text-bone">
                nothing here yet? <br className="hidden sm:block" />
                <span className="text-bone-46 italic">that&apos;s the point.</span>
              </h2>
              <p className="max-w-md text-[1.05rem] leading-relaxed text-bone-64">
                post the first take. it takes under thirty seconds, and the waveform shows up the
                instant you drop the file.
              </p>
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

function Feature({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <span className="meta text-lime">{n}</span>
      <h3 className="mt-3 text-lg font-medium text-bone">{title}</h3>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-bone-64">{body}</p>
    </div>
  );
}

function Format({ name, limit, body }: { name: string; limit: string; body: string }) {
  return (
    <div className="bg-ink p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="font-serif text-2xl text-bone">{name}</h3>
        <span className="meta text-bone-32">{limit}</span>
      </div>
      <p className="mt-4 text-[0.9rem] leading-relaxed text-bone-46">{body}</p>
    </div>
  );
}
