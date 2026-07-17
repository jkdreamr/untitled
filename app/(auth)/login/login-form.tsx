"use client";

import { useActionState, useState, useTransition } from "react";
import { signInWithEmail, type AuthState } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonClasses } from "@/components/ui/button";

const initial: AuthState = { ok: false };

export function LoginForm({ next, hadError }: { next: string; hadError: boolean }) {
  const [state, action, pending] = useActionState(signInWithEmail, initial);
  const [googlePending, startGoogle] = useTransition();
  const [googleError, setGoogleError] = useState<string | null>(null);

  function continueWithGoogle() {
    setGoogleError(null);
    startGoogle(async () => {
      try {
        const supabase = createClient();
        const origin = window.location.origin;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (error) setGoogleError("couldn't reach google. try email instead.");
      } catch {
        setGoogleError("couldn't reach google. try email instead.");
      }
    });
  }

  if (state.ok) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 grid size-12 place-items-center rounded-full border border-lime/40">
          <span className="h-[2px] w-5 bg-lime" />
        </div>
        <h1 className="font-serif text-3xl text-bone">check your email</h1>
        <p className="mt-3 text-sm leading-relaxed text-bone-64">
          we sent a link to <span className="text-bone">{state.email}</span>. open it on this device
          to come in.
        </p>
        <p className="meta mt-6 text-bone-32">didn&apos;t arrive? check spam, or try again.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-serif text-4xl text-bone">come in.</h1>
      <p className="mt-2 text-sm text-bone-46">
        one place for the raw thing. no feed to optimize, no numbers to chase.
      </p>

      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={googlePending}
        className={buttonClasses("outline", "lg", "mt-8 w-full")}
      >
        <GoogleGlyph />
        {googlePending ? "opening google…" : "continue with google"}
      </button>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-bone-10" />
        <span className="meta text-bone-32">or</span>
        <span className="h-px flex-1 bg-bone-10" />
      </div>

      <form action={action} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="email" className="sr-only">
          email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@email.com"
          className="h-12 w-full rounded-full border border-bone-16 bg-ink-sunken px-5 text-sm text-bone outline-none transition-colors placeholder:text-bone-32 focus-visible:border-lime/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
        />
        <Button type="submit" variant="solid" size="lg" className="w-full" disabled={pending}>
          {pending ? "sending…" : "email me a link"}
        </Button>
      </form>

      {(state.error || (hadError && !state.ok) || googleError) && (
        <p role="alert" className="mt-4 text-sm text-bone-64">
          {state.error ?? googleError ?? "that link expired. try again."}
        </p>
      )}

      <p className="meta mt-8 leading-relaxed text-bone-32">
        by joining you agree everything you post is human-made, and that it won&apos;t be used to
        train AI.
      </p>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
      <path fill="#EDE8DF" d="M17.6 9.2c0-.6-.05-1.18-.16-1.74H9v3.3h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.54Z" opacity=".9" />
      <path fill="#EDE8DF" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.94v2.34A9 9 0 0 0 9 18Z" opacity=".7" />
      <path fill="#EDE8DF" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.94a9 9 0 0 0 0 8.12l3.04-2.34Z" opacity=".55" />
      <path fill="#EDE8DF" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 0 0 .94 4.94l3.04 2.34C4.68 5.16 6.66 3.58 9 3.58Z" opacity=".85" />
    </svg>
  );
}
