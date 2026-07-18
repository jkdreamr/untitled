import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/env.server";
import { ScoutForm } from "@/components/marketing/scout-form";

export const metadata: Metadata = { title: "scout" };
// Gate is evaluated at request time so ENABLE_SCOUT can toggle without a rebuild.
export const dynamic = "force-dynamic";

export default function ScoutPage() {
  if (!FEATURES.scout) notFound();

  return (
    <>
      {/* hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 sm:px-10 sm:pt-28">
        <p className="meta meta-caps mb-8 text-lime [animation:fade-in_.3s_ease-out_both]">
          scout · early access
        </p>
        <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-end">
          <h1 className="display text-[clamp(2.8rem,8vw,6.5rem)] text-bone [animation:rise-in_.3s_var(--ease-out)_both]">
            find the artist
            <br />
            before <span className="italic text-bone-46">everyone else.</span>
          </h1>
          <div className="max-w-md [animation:rise-in_.3s_var(--ease-out)_.08s_both]">
            <p className="text-[1.05rem] leading-relaxed text-bone-64">
              scout is talent search for labels, publishers, and studios — over a corpus of
              verified-human, raw music. the demo before the release, the voice memo before the
              deal. search it in plain language: by sound, by lyric, by role, by who&rsquo;s open to
              work.
            </p>
          </div>
        </div>
      </section>

      {/* why scout */}
      <section className="border-y border-bone-10 py-20">
        <div className="mx-auto max-w-6xl px-6 sm:px-10">
          <h2 className="meta meta-caps mb-12 text-bone-46">why scout</h2>
          <div className="grid gap-x-10 gap-y-12 sm:grid-cols-3">
            <Point
              n="01"
              title="raw, not packaged"
              body="the work here is the take, not the campaign — voice memos, one-take covers, verses over a beat, the phone video at the piano. you meet musicians before they’ve been styled, signed, or found."
            />
            <Point
              n="02"
              title="verified human"
              body="every track is attested human-made and built to resist AI scraping. no generated beats, no synthetic vocals, no prompt-made catalogs. what you find is a real person who can actually do the thing."
            />
            <Point
              n="03"
              title="search that hears the words"
              body="ask in plain language. “warm lo-fi bedroom guitar, low voice” matches the actual audio, and a line of lyrics matches the take it was sung in — then filter by role and openness to find the exact collaborator."
            />
          </div>
        </div>
      </section>

      {/* waitlist */}
      <section className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <h2 className="display text-[clamp(2rem,4vw,3rem)] text-bone">get in early.</h2>
            <p className="mt-5 max-w-sm text-[1.05rem] leading-relaxed text-bone-64">
              scout isn&rsquo;t live yet. we&rsquo;re opening it slowly to a first group of labels,
              studios, and agencies. leave your details and we&rsquo;ll reach out — honest ask:
              this is an early-access waitlist, not a product you can use today.
            </p>
            <p className="meta mt-6 text-bone-32">
              built on the same human-made promise · AI never touches the work
            </p>
          </div>
          <div className="rounded-lg border border-bone-16 bg-ink-raised/40 p-6 sm:p-8">
            <ScoutForm />
          </div>
        </div>
      </section>
    </>
  );
}

function Point({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <span className="meta text-lime">{n}</span>
      <h3 className="mt-3 text-lg font-medium text-bone">{title}</h3>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-bone-64">{body}</p>
    </div>
  );
}
