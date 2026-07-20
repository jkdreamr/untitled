"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { sendScoutContact } from "@/lib/scout/dashboard-actions";

export function ContactDialog({
  targetId,
  artistName,
  disabled,
}: {
  targetId: string;
  artistName: string;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (disabled) {
    return (
      <span className="meta text-bone-32" title="this artist hasn't set any 'open to' flags">
        not open to contact
      </span>
    );
  }

  function submit() {
    setStatus(null);
    start(async () => {
      const res = await sendScoutContact(targetId, body);
      if (res.ok) {
        setStatus("sent.");
        setBody("");
        setTimeout(() => setOpen(false), 900);
      } else {
        setStatus(res.error ?? "couldn't send.");
      }
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="meta text-lime hover:underline">
        contact
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink-veil p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-bone-16 bg-ink-raised p-6 [animation:veil-up_.18s_var(--ease-out)_both]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-bone">
              reach out to <span className="text-lime">{artistName}</span>
            </p>
            <p className="meta mt-1 text-bone-46">
              arrives as an in-app note from your org. no email is shared, and there&apos;s no reply
              thread — the artist acts on it, or doesn&apos;t.
            </p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 500))}
              rows={5}
              autoFocus
              placeholder="who you are, what you're hearing, what you're proposing…"
              className="mt-4 w-full resize-none rounded-lg border border-bone-16 bg-ink-sunken p-3 text-sm text-bone outline-none placeholder:text-bone-32 focus-visible:border-lime/40"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="meta text-bone-32">{body.length}/500</span>
              {status && <span className="meta text-bone-46">{status}</span>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                cancel
              </Button>
              <Button variant="solid" size="sm" onClick={submit} disabled={pending || body.trim().length === 0}>
                {pending ? "sending…" : "send"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
