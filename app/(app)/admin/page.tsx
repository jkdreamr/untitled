import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportRow } from "@/components/admin/report-row";
import { getCurrentProfile } from "@/lib/data/profiles";
import { getReportQueue } from "@/lib/admin/data";

export const metadata: Metadata = { title: "admin", robots: "noindex" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();

  const reports = await getReportQueue();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="font-serif text-3xl text-bone">moderation</h1>
      <p className="meta mt-1">{reports.length} open {reports.length === 1 ? "report" : "reports"}</p>

      <div className="mt-8 space-y-3">
        {reports.length === 0 ? (
          <p className="py-16 text-center text-sm text-bone-32">nothing in the queue. quiet is good.</p>
        ) : (
          reports.map((r) => <ReportRow key={r.id} report={r} />)
        )}
      </div>
    </div>
  );
}
