import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "terms" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:px-10">
      <header>
        <h1 className="font-serif text-4xl text-bone sm:text-5xl">terms of service</h1>
        <p className="meta mt-4">last updated · july 2026</p>
      </header>

      <p className="mt-8 text-bone-64 leading-relaxed">
        UNTITLED is a place for raw, human-made art, built by NOVUM Labs. these terms are the short
        version of a simple deal: you keep your work, we keep it human, and neither of us lets a
        machine train on it. by using UNTITLED you agree to what follows.
      </p>

      <h2 className="mt-10 mb-3 font-serif text-2xl text-bone">human-made only</h2>
      <p className="text-bone-64 leading-relaxed">
        everything posted here must be made by a person. no AI-generated images, vocals, music, or
        text may be posted as work — not as a whole piece, not as part of one. at upload you tap once
        to attest, &ldquo;I made this,&rdquo; and that one-tap attestation is part of these terms.
      </p>
      <p className="mt-4 text-bone-64 leading-relaxed">
        work we find to be machine-generated gets removed, and accounts that keep doing it are
        closed. tools that help you record, tune, or edit your own performance are fine — the line is
        generation, not craft.
      </p>

      <section className="mt-10 rounded-lg border border-bone-16 bg-ink-raised/40 p-6 sm:p-8">
        <p className="meta meta-caps text-lime">the core promise</p>
        <h2 className="mt-3 mb-3 font-serif text-2xl text-bone">no AI training on your work</h2>
        <p className="text-bone-64 leading-relaxed">
          you grant UNTITLED only the narrow license we need to host, store, and display your work so
          people can find it — nothing more. we will never use your work to train, fine-tune, or
          evaluate AI models, and we won&rsquo;t sell or hand it to anyone who will.
        </p>
        <p className="mt-4 text-bone-64 leading-relaxed">
          every public page ships the <code className="text-bone-80">noai</code> and{" "}
          <code className="text-bone-80">noimageai</code> signals in its markup and headers, telling
          third-party crawlers your work is off-limits for training. we can&rsquo;t force every
          scraper on earth to behave, but we forbid it here and build the platform to resist it.
        </p>
      </section>

      <h2 className="mt-10 mb-3 font-serif text-2xl text-bone">you own your work</h2>
      <p className="text-bone-64 leading-relaxed">
        your work is yours. you keep every right you came in with — copyright, credit, the right to
        post it anywhere else, the right to walk away. the license you give us ends when the work
        comes down.
      </p>
      <p className="mt-4 text-bone-64 leading-relaxed">
        you can delete any piece, or your whole account, at any time. deletion is a hard delete: we
        remove your media from our storage, and where a piece is a video, we delete the underlying
        asset from Mux through their API too. it doesn&rsquo;t sit in a trash can waiting to be
        recovered.
      </p>

      <h2 className="mt-10 mb-3 font-serif text-2xl text-bone">acceptable use</h2>
      <p className="text-bone-64 leading-relaxed">
        be a decent person. don&rsquo;t harass, threaten, or target anyone. don&rsquo;t post work
        that isn&rsquo;t yours or claim someone else&rsquo;s making as your own. absolutely no sexual
        content involving minors, ever, and nothing made to abuse, dox, or endanger a person.
      </p>
      <p className="mt-4 text-bone-64 leading-relaxed">
        anyone can report a piece; we review reports and remove what breaks these rules. we can
        suspend or close accounts that do harm, and we cooperate with law enforcement where the law
        genuinely requires it.
      </p>

      <h2 className="mt-10 mb-3 font-serif text-2xl text-bone">no payment</h2>
      <p className="text-bone-64 leading-relaxed">
        artists never pay to be here. there are no paywalls, no pro tier, no paying to push your work
        up a ranking, no ads dressed as pieces. discovery isn&rsquo;t for sale. UNTITLED is free for
        the people who make the work, and it stays that way.
      </p>

      <h2 className="mt-10 mb-3 font-serif text-2xl text-bone">the rest</h2>
      <p className="text-bone-64 leading-relaxed">
        UNTITLED is provided as-is. we work to keep it running and safe, but we can&rsquo;t promise
        it will never break or lose data, and to the extent the law allows, we&rsquo;re not liable
        for indirect or incidental harm from using it. we may update these terms as the platform
        grows; if we make a material change we&rsquo;ll say so plainly, and continuing to use
        UNTITLED means you accept the new version.
      </p>
      <p className="mt-4 text-bone-64 leading-relaxed">
        questions, notices, or anything human? write us at{" "}
        <span className="text-bone">hello@novumlabs.example</span> (a placeholder for now). for
        copyright takedowns specifically, see the{" "}
        <Link href="/dmca" className="text-bone underline decoration-bone-32 underline-offset-4 transition-colors hover:decoration-bone">
          dmca page
        </Link>
        .
      </p>
    </div>
  );
}
