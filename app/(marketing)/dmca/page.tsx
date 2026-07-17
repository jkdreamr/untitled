import type { Metadata } from "next";

export const metadata: Metadata = { title: "dmca" };

export default function DmcaPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:px-10">
      <header>
        <h1 className="font-serif text-4xl text-bone sm:text-5xl">copyright &amp; dmca</h1>
        <p className="meta mt-4">last updated · july 2026</p>
      </header>

      <p className="mt-8 text-bone-64 leading-relaxed">
        UNTITLED is for work made by the person posting it. if your work has been posted here without
        your permission, tell us and we&rsquo;ll act. this page is how.
      </p>

      <h2 className="mt-10 mb-3 font-serif text-2xl text-bone">the fast way: report it in-app</h2>
      <p className="text-bone-64 leading-relaxed">
        you don&rsquo;t need a lawyer to flag a copy. every piece has a report option — choose{" "}
        <span className="text-bone">&ldquo;stolen work&rdquo;</span> and it goes straight to
        moderation. for most cases that&rsquo;s the quickest path, and you don&rsquo;t have to be the
        rights-holder to raise it.
      </p>

      <h2 className="mt-10 mb-3 font-serif text-2xl text-bone">filing a formal notice</h2>
      <p className="text-bone-64 leading-relaxed">
        to file a formal DMCA takedown, send us a written notice that includes:
      </p>
      <ul className="mt-4 space-y-3 text-bone-64 leading-relaxed">
        <li className="border-l border-bone-16 pl-4">
          identification of the copyrighted work you own or represent;
        </li>
        <li className="border-l border-bone-16 pl-4">
          the URL of the infringing piece on UNTITLED, specific enough for us to find it;
        </li>
        <li className="border-l border-bone-16 pl-4">
          your contact details — name, email, and address;
        </li>
        <li className="border-l border-bone-16 pl-4">
          a good-faith statement that the use isn&rsquo;t authorized by you, the copyright owner, or
          the law;
        </li>
        <li className="border-l border-bone-16 pl-4">
          a statement, under penalty of perjury, that the information is accurate and you&rsquo;re
          authorized to act for the owner;
        </li>
        <li className="border-l border-bone-16 pl-4">your physical or electronic signature.</li>
      </ul>

      <h2 className="mt-10 mb-3 font-serif text-2xl text-bone">where to send it</h2>
      <p className="text-bone-64 leading-relaxed">
        send your notice to our designated agent at{" "}
        <span className="text-bone">dmca@novumlabs.example</span> (a placeholder for now). we review
        valid notices promptly, remove or disable access to the work, and let the person who posted
        it know what happened.
      </p>

      <h2 className="mt-10 mb-3 font-serif text-2xl text-bone">counter-notice</h2>
      <p className="text-bone-64 leading-relaxed">
        if your piece was removed and you believe that was a mistake — it&rsquo;s your original work,
        or the law permits it — you can file a counter-notice. include your contact details, identify
        the piece and where it appeared, add a statement under penalty of perjury that you believe it
        was removed by error, sign it, and send it to the same address. if the claimant doesn&rsquo;t
        pursue the matter further, we may restore the work.
      </p>

      <h2 className="mt-10 mb-3 font-serif text-2xl text-bone">repeat infringers</h2>
      <p className="text-bone-64 leading-relaxed">
        accounts that repeatedly post work belonging to others are closed. this is a human-made
        platform in every sense — posting someone else&rsquo;s making as your own breaks the one
        promise it runs on.
      </p>
    </div>
  );
}
