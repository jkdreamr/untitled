import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { QuietToggle } from "@/components/account/quiet-toggle";
import { getCurrentProfile } from "@/lib/data/profiles";
import { createClient } from "@/lib/supabase/server";
import { pieceTitle, formatCount, timeAgo, formatPieceDate } from "@/lib/utils";

export const metadata: Metadata = { title: "dashboard" };
export const dynamic = "force-dynamic";

interface Dashboard {
  totals: { pieces: number; reactions: number; listens: number; views: number; comments: number; followers: number };
  recent_followers: { handle: string; display_name: string; avatar_path: string | null; since: string }[];
  pieces: { id: string; title: string | null; sequence_no: number; medium: string; reactions: number; comments: number; listens: number; views: number; published_at: string }[];
}

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/dashboard");

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_my_dashboard");
  const d = (data as unknown as Dashboard) ?? {
    totals: { pieces: 0, reactions: 0, listens: 0, views: 0, comments: 0, followers: 0 },
    recent_followers: [],
    pieces: [],
  };

  const stats = [
    { label: "pieces", value: d.totals.pieces },
    { label: "listens", value: d.totals.listens },
    { label: "views", value: d.totals.views },
    { label: "reactions", value: d.totals.reactions },
    { label: "responses", value: d.totals.comments },
    { label: "followers", value: d.totals.followers },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl text-bone">your room</h1>
        <QuietToggle initial={profile.quiet_mode} />
      </div>
      <p className="meta mt-1">only you see this. real numbers, no vanity.</p>

      {/* totals */}
      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-bone-10 bg-bone-10 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-ink p-5">
            <p className="font-mono text-2xl text-bone">{formatCount(s.value)}</p>
            <p className="meta meta-caps mt-1 text-bone-46">{s.label}</p>
          </div>
        ))}
      </div>

      {/* recent followers */}
      {d.recent_followers.length > 0 && (
        <section className="mt-10">
          <h2 className="meta meta-caps mb-4 text-bone-46">recent followers</h2>
          <div className="flex flex-wrap gap-3">
            {d.recent_followers.map((f) => (
              <Link key={f.handle} href={`/${f.handle}`} className="flex items-center gap-2 rounded-full border border-bone-10 py-1 pl-1 pr-3 transition-colors hover:border-bone-16">
                <Avatar name={f.display_name} size="xs" />
                <span className="text-sm text-bone-64">@{f.handle}</span>
                <span className="meta text-bone-32">{timeAgo(f.since)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* per-piece */}
      <section className="mt-10">
        <h2 className="meta meta-caps mb-4 text-bone-46">your work</h2>
        {d.pieces.length === 0 ? (
          <p className="text-sm text-bone-32">nothing posted yet. <Link href="/compose" className="text-lime hover:underline">post the first take →</Link></p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-bone-10">
            <div className="hidden grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b border-bone-10 px-4 py-2 sm:grid">
              <span className="meta meta-caps text-bone-32">piece</span>
              <span className="meta meta-caps w-14 text-right text-bone-32">listens</span>
              <span className="meta meta-caps w-14 text-right text-bone-32">views</span>
              <span className="meta meta-caps w-14 text-right text-bone-32">react</span>
              <span className="meta meta-caps w-14 text-right text-bone-32">resp</span>
            </div>
            {d.pieces.map((p) => (
              <Link key={p.id} href={`/piece/${p.id}`} className="grid grid-cols-2 gap-2 border-b border-bone-10 px-4 py-3 transition-colors last:border-0 hover:bg-bone-06 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm text-bone">{pieceTitle(p.title, p.sequence_no)}</p>
                  <p className="meta">{p.medium} · {formatPieceDate(p.published_at)}</p>
                </div>
                <span className="font-mono text-sm text-bone-64 sm:w-14 sm:text-right">{formatCount(p.listens)}</span>
                <span className="font-mono text-sm text-bone-64 sm:w-14 sm:text-right">{formatCount(p.views)}</span>
                <span className="font-mono text-sm text-bone-64 sm:w-14 sm:text-right">{formatCount(p.reactions)}</span>
                <span className="font-mono text-sm text-bone-64 sm:w-14 sm:text-right">{formatCount(p.comments)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
