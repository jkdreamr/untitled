import type { Metadata } from "next";
import { Composer } from "@/components/compose/composer";
import { FEATURES } from "@/lib/env.server";

export const metadata: Metadata = { title: "post" };
export const dynamic = "force-dynamic";

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  return <Composer videoEnabled={FEATURES.video} welcome={welcome === "1"} />;
}
