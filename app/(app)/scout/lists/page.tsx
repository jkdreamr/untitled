import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScoutNav } from "@/components/scout/scout-nav";
import { ScoutListsManager } from "@/components/scout/scout-lists-manager";
import { isApprovedScout, getScoutLists } from "@/lib/data/scout";

export const metadata: Metadata = { title: "scout · lists", robots: "noindex" };
export const dynamic = "force-dynamic";

export default async function ScoutListsPage() {
  if (!(await isApprovedScout())) notFound();
  const lists = await getScoutLists();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <ScoutNav active="lists" />
      <ScoutListsManager lists={lists} />
    </div>
  );
}
