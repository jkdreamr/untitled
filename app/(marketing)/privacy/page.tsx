import type { Metadata } from "next";

export const metadata: Metadata = { title: "privacy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:px-10">
      <header>
        <h1 className="font-serif text-4xl text-bone sm:text-5xl">privacy</h1>
        <p className="meta mt-4">last updated · july 2026</p>
      </header>

      <p className="mt-8 text-bone-64 leading-relaxed">
        we collect as little as we can, and we don&rsquo;t sell or train on any of it. here is
        exactly what UNTITLED holds, who processes it, and how to make it disappear.
      </p>

      <h2 className="mt-10 mb-3 font-serif text-2xl text-bone">what we collect</h2>
      <ul className="space-y-3 text-bone-64 leading-relaxed">
        <li className="border-l border-bone-16 pl-4">
          <span className="text-bone">your email</span> — so you can sign in and we can reach you
          about your account. it&rsquo;s the only thing we require.
        </li>
        <li className="border-l border-bone-16 pl-4">
          <span className="text-bone">your handle and profile</span> — display name, bio, avatar,
          links: whatever you choose to put there.
        </li>
        <li className="border-l border-bone-16 pl-4">
          <span className="text-bone">the work you post</span> — the audio, video, images, or words
          themselves, plus the basic file details that come with them.
        </li>
        <li className="border-l border-bone-16 pl-4">
          <span className="text-bone">aggregate counts on your own pieces</span> — listens and
          views, shown to you as simple totals. we don&rsquo;t build a profile of who you are or
          follow you around the web.
        </li>
      </ul>

      <h2 className="mt-10 mb-3 font-serif text-2xl text-bone">who processes it</h2>
      <p className="text-bone-64 leading-relaxed">
        we keep the operation lean and name our processors plainly.{" "}
        <span className="text-bone">Supabase</span> handles authentication, the database, and file
        storage. <span className="text-bone">Mux</span> handles video — encoding, hosting, and
        playback of the clips you post. these providers process data on our behalf under their own
        security terms, and we don&rsquo;t send your work anywhere it doesn&rsquo;t need to go to
        function.
      </p>

      <h2 className="mt-10 mb-3 font-serif text-2xl text-bone">what we never do</h2>
      <p className="text-bone-64 leading-relaxed">
        we don&rsquo;t sell your data. we don&rsquo;t rent it, trade it, or hand it to advertisers —
        there are no advertisers. and we don&rsquo;t train AI on your work, or let anyone else. every
        public page carries the <code className="text-bone-80">noai</code> and{" "}
        <code className="text-bone-80">noimageai</code> signals, which tell AI crawlers your work is
        off-limits for training, and we block the ones we can at our edge.
      </p>

      <h2 className="mt-10 mb-3 font-serif text-2xl text-bone">cookies</h2>
      <p className="text-bone-64 leading-relaxed">
        we use one kind of cookie: the session cookie that keeps you signed in. no tracking cookies,
        no third-party analytics trailing you across the internet, no advertising pixels.
      </p>

      <h2 className="mt-10 mb-3 font-serif text-2xl text-bone">deleting everything</h2>
      <p className="text-bone-64 leading-relaxed">
        you&rsquo;re in control. delete any piece from the piece itself, or delete your whole account
        from settings. deletion is a hard delete — your media is removed from our storage, and any
        video is deleted from Mux through their API. we don&rsquo;t keep shadow copies. some minimal
        records may linger in backups until they cycle out, and we keep the little we&rsquo;re legally
        required to, but your work does not stick around.
      </p>

      <h2 className="mt-10 mb-3 font-serif text-2xl text-bone">reach us</h2>
      <p className="text-bone-64 leading-relaxed">
        questions about your data, or a request to see or remove it? write{" "}
        <span className="text-bone">privacy@novumlabs.example</span> (a placeholder for now) and
        we&rsquo;ll help.
      </p>
    </div>
  );
}
