"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addComment, setCommentStatus, setCommentsClosed } from "@/lib/piece/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ReportDialog } from "@/components/piece/report-dialog";
import { timeAgo } from "@/lib/utils";
import type { PieceComment } from "@/lib/types";

export function CommentSection({
  pieceId,
  initial,
  authed,
  closed: initialClosed,
  isOwner,
  viewer,
}: {
  pieceId: string;
  initial: PieceComment[];
  authed: boolean;
  closed: boolean;
  isOwner: boolean;
  viewer: { handle: string; display_name: string } | null;
}) {
  const router = useRouter();
  const [comments, setComments] = useState<PieceComment[]>(initial);
  const [closed, setClosed] = useState(initialClosed);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const body = text.trim();
    if (!body) return;
    setPending(true);
    setError(null);
    const res = await addComment(pieceId, body);
    setPending(false);
    if (!res.ok || !res.comment) {
      setError(res.error ?? "couldn't post.");
      return;
    }
    setComments((c) => [
      ...c,
      {
        id: res.comment!.id,
        body: res.comment!.body,
        created_at: res.comment!.created_at,
        author: { handle: viewer?.handle ?? "you", display_name: viewer?.display_name ?? "you", avatar_path: null },
        is_mine: true,
        can_moderate: isOwner,
      },
    ]);
    setText("");
  }

  async function moderate(id: string, status: "hidden" | "deleted") {
    setComments((c) => c.filter((x) => x.id !== id));
    await setCommentStatus(id, pieceId, status);
  }

  async function toggleClosed() {
    const next = !closed;
    setClosed(next);
    await setCommentsClosed(pieceId, next);
  }

  return (
    <section id="comments" className="scroll-mt-24">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-serif text-xl text-bone">
          responses {comments.length > 0 && <span className="text-bone-32">· {comments.length}</span>}
        </h2>
        {isOwner && (
          <button onClick={toggleClosed} className="meta text-bone-46 hover:text-bone">
            {closed ? "open responses" : "close responses"}
          </button>
        )}
      </div>

      {authed && !closed ? (
        <div className="mb-8">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            rows={2}
            placeholder="say something encouraging…"
            className="w-full resize-none rounded-lg border border-bone-16 bg-ink-sunken p-3 text-sm text-bone outline-none placeholder:text-bone-32 focus-visible:border-lime/40"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="meta text-bone-32">{text.length}/500</span>
            <Button variant="solid" size="sm" onClick={submit} disabled={pending || !text.trim()}>
              {pending ? "posting…" : "respond"}
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-bone-64">{error}</p>}
        </div>
      ) : closed ? (
        <p className="mb-8 text-sm text-bone-46">the artist closed responses on this one.</p>
      ) : (
        <p className="mb-8 text-sm text-bone-46">
          <Link href="/login" className="text-bone underline">sign in</Link> to respond.
        </p>
      )}

      <ul className="space-y-5">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar name={c.author.display_name} size="xs" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <Link href={`/${c.author.handle}`} className="text-sm text-bone hover:underline">
                  {c.author.display_name}
                </Link>
                <span className="meta">{timeAgo(c.created_at)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-bone-64">{c.body}</p>
              <div className="mt-1 flex items-center gap-3">
                {c.can_moderate && (
                  <button onClick={() => moderate(c.id, "hidden")} className="meta text-bone-32 hover:text-bone">hide</button>
                )}
                {c.is_mine && (
                  <button onClick={() => moderate(c.id, "deleted")} className="meta text-bone-32 hover:text-bone">delete</button>
                )}
                {!c.is_mine && <ReportDialog targetType="comment" targetId={c.id} authed={authed} />}
              </div>
            </div>
          </li>
        ))}
        {comments.length === 0 && <p className="text-sm text-bone-32">no responses yet. be the first.</p>}
      </ul>
    </section>
  );
}
