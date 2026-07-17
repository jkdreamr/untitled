"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { completeOnboarding, checkHandleAvailable, type OnboardState } from "@/lib/onboarding/actions";
import { TAXONOMY } from "@/lib/taxonomy";
import { handleError, suggestHandle } from "@/lib/handles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const initial: OnboardState = { ok: false };

export function OnboardingFlow({ seed }: { seed: string }) {
  const [state, action, pending] = useActionState(completeOnboarding, initial);
  const [step, setStep] = useState(0);
  const [handle, setHandle] = useState(() => suggestHandle(seed));
  const [displayName, setDisplayName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [avail, setAvail] = useState<"idle" | "checking" | "yes" | "no">("idle");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hError = handleError(handle);

  useEffect(() => {
    if (hError) {
      setAvail("idle");
      return;
    }
    setAvail("checking");
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const { available } = await checkHandleAvailable(handle);
      setAvail(available ? "yes" : "no");
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [handle, hError]);

  const canNext =
    (step === 0 && !hError && avail === "yes") ||
    (step === 1 && displayName.trim().length > 0) ||
    (step === 2 && tags.length >= 3);

  function toggleTag(t: string) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : prev.length < 15 ? [...prev, t] : prev));
  }

  return (
    <form action={action} className="w-full max-w-lg">
      {/* progress */}
      <div className="mb-10 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn("h-[3px] flex-1 rounded-full transition-colors duration-200", i <= step ? "bg-lime" : "bg-bone-10")}
          />
        ))}
      </div>

      <input type="hidden" name="handle" value={handle} />
      <input type="hidden" name="display_name" value={displayName} />
      {tags.map((t) => (
        <input key={t} type="hidden" name="interests" value={t} />
      ))}

      {step === 0 && (
        <section className="[animation:veil-up_.28s_var(--ease-out)_both]">
          <p className="meta meta-caps text-bone-46">step one</p>
          <h1 className="mt-2 font-serif text-4xl text-bone">pick a handle.</h1>
          <p className="mt-2 text-sm text-bone-46">this is your address. lowercase, permanent-ish.</p>
          <div className="mt-8">
            <div className="flex items-center rounded-full border border-bone-16 bg-ink-sunken px-5 focus-within:border-lime/50">
              <span className="text-bone-32">@</span>
              <input
                autoFocus
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                maxLength={20}
                className="h-12 w-full bg-transparent px-1 text-sm text-bone outline-none placeholder:text-bone-32"
                placeholder="your_handle"
                aria-label="handle"
              />
              <HandleStatus error={hError} avail={avail} />
            </div>
            <p className="meta mt-3 h-4 text-bone-46">
              {hError ?? (avail === "no" ? "taken — try another" : avail === "yes" ? "available" : "")}
            </p>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="[animation:veil-up_.28s_var(--ease-out)_both]">
          <p className="meta meta-caps text-bone-46">step two</p>
          <h1 className="mt-2 font-serif text-4xl text-bone">what should we call you?</h1>
          <p className="mt-2 text-sm text-bone-46">a name, not a brand. change it whenever.</p>
          <input
            autoFocus
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            placeholder="your name"
            aria-label="display name"
            className="mt-8 h-12 w-full rounded-full border border-bone-16 bg-ink-sunken px-5 text-sm text-bone outline-none placeholder:text-bone-32 focus-visible:border-lime/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
          />
        </section>
      )}

      {step === 2 && (
        <section className="[animation:veil-up_.28s_var(--ease-out)_both]">
          <p className="meta meta-caps text-bone-46">step three</p>
          <h1 className="mt-2 font-serif text-4xl text-bone">what pulls you in?</h1>
          <p className="mt-2 text-sm text-bone-46">
            pick at least 3. this seeds discovery — you can always change it.
          </p>
          <div className="mt-6 max-h-[46vh] space-y-5 overflow-y-auto pr-1">
            {TAXONOMY.map((group) => (
              <div key={group.key}>
                <p className="meta meta-caps mb-2 text-bone-32">{group.label}</p>
                <div className="flex flex-wrap gap-2">
                  {group.tags.map((t) => {
                    const on = tags.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTag(t)}
                        aria-pressed={on}
                        className={cn(
                          "rounded-full border px-3 py-1.5 font-mono text-[0.8125rem] transition-colors duration-150",
                          on
                            ? "border-lime bg-lime/10 text-lime"
                            : "border-bone-16 text-bone-64 hover:border-bone-32 hover:text-bone",
                        )}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="meta mt-3 text-bone-46">{tags.length} selected</p>
        </section>
      )}

      {state.error && (
        <p role="alert" className="mt-4 text-sm text-bone-64">
          {state.error}
        </p>
      )}

      <div className="mt-10 flex items-center justify-between">
        {step > 0 ? (
          <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>
            back
          </Button>
        ) : (
          <span />
        )}
        {step < 2 ? (
          <Button type="button" variant="solid" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
            continue
          </Button>
        ) : (
          <Button type="submit" variant="solid" disabled={!canNext || pending}>
            {pending ? "setting up…" : "enter untitled"}
          </Button>
        )}
      </div>
    </form>
  );
}

function HandleStatus({ error, avail }: { error: string | null; avail: string }) {
  if (error) return null;
  if (avail === "checking") return <span className="size-4 shrink-0 animate-[spin_.8s_linear_infinite] rounded-full border border-bone-16 border-t-bone-64" />;
  if (avail === "yes") return <span className="shrink-0 text-lime" aria-label="available">✓</span>;
  if (avail === "no") return <span className="shrink-0 text-bone-46" aria-label="taken">×</span>;
  return null;
}
