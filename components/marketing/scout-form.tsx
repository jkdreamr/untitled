"use client";

import { useActionState } from "react";
import { joinScoutWaitlist, type ScoutState } from "@/lib/scout/actions";
import { Button } from "@/components/ui/button";

const initial: ScoutState = { ok: false };

const inputClasses =
  "h-11 w-full rounded-lg border border-bone-16 bg-ink-sunken px-4 text-sm text-bone outline-none transition-colors placeholder:text-bone-32 focus-visible:border-lime/50";

export function ScoutForm() {
  const [state, action, pending] = useActionState(joinScoutWaitlist, initial);

  if (state.ok) {
    return (
      <div className="[animation:fade-in_.3s_ease-out_both]">
        <span aria-hidden className="mb-5 block h-[2px] w-8 bg-lime" />
        <p className="font-serif text-2xl text-bone">you&rsquo;re on the list.</p>
        <p className="mt-2 text-sm leading-relaxed text-bone-64">
          we&rsquo;ll reach out when scout opens for early access.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="scout-email" className="sr-only">
          work email
        </label>
        <input
          id="scout-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="work email"
          className={inputClasses}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="scout-org" className="sr-only">
            label / studio / agency
          </label>
          <input
            id="scout-org"
            name="org"
            type="text"
            autoComplete="organization"
            placeholder="label / studio / agency"
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="scout-role" className="sr-only">
            your role
          </label>
          <input
            id="scout-role"
            name="role"
            type="text"
            autoComplete="organization-title"
            placeholder="your role"
            className={inputClasses}
          />
        </div>
      </div>

      <div>
        <label htmlFor="scout-note" className="sr-only">
          what are you looking for?
        </label>
        <textarea
          id="scout-note"
          name="note"
          rows={3}
          placeholder="what are you looking for?"
          className="min-h-[88px] w-full resize-none rounded-lg border border-bone-16 bg-ink-sunken px-4 py-3 text-sm leading-relaxed text-bone outline-none transition-colors placeholder:text-bone-32 focus-visible:border-lime/50"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <Button variant="solid" size="lg" type="submit" disabled={pending}>
          {pending ? "adding you…" : "request early access"}
        </Button>
        {state.error ? (
          <p role="alert" className="text-sm text-bone-64">
            {state.error}
          </p>
        ) : (
          <p className="meta text-bone-32">early access · no spam</p>
        )}
      </div>
    </form>
  );
}
