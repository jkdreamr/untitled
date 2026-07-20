import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getNotifications } from "@/lib/data/notifications";
import { getSessionUser } from "@/lib/data/profiles";
import { MarkNotificationsRead } from "@/components/notifications/mark-read";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "inbox" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/notifications");
  const items = await getNotifications();

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <MarkNotificationsRead />
      <h1 className="font-serif text-3xl text-bone">inbox</h1>

      {items.length === 0 ? (
        <p className="py-16 text-center text-sm text-bone-52">no messages yet.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((n) => (
            <li
              key={n.id}
              className={cn(
                "rounded-lg border p-4 transition-colors",
                n.read_at ? "border-bone-10" : "border-lime/30 bg-lime/[0.04]",
              )}
            >
              {n.kind === "scout_contact" ? (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm text-bone">
                      <span className="text-lime">{n.payload.org || "a scout"}</span> reached out
                    </p>
                    <span className="meta shrink-0">{timeAgo(n.created_at)}</span>
                  </div>
                  {n.payload.body && (
                    <p className="mt-2 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-bone-64">
                      {n.payload.body}
                    </p>
                  )}
                  <p className="meta meta-caps mt-3 text-bone-32">scout interest · reply on your own terms</p>
                </>
              ) : (
                <p className="text-sm text-bone-64">{n.kind}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
