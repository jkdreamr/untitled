import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { getSessionUser } from "@/lib/data/profiles";

export const metadata: Metadata = { title: "come in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(next && next.startsWith("/") ? next : "/feed");

  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/feed";
  return <LoginForm next={safeNext} hadError={error === "link"} />;
}
