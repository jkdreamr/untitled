import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "./onboarding-flow";
import { getSessionUser, getCurrentProfile } from "@/lib/data/profiles";

export const metadata: Metadata = { title: "welcome" };

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/onboarding");
  const profile = await getCurrentProfile();
  if (profile?.onboarded) redirect("/feed");

  return <OnboardingFlow seed={user.email ?? "artist"} />;
}
