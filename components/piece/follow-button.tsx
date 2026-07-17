"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FollowButton({
  targetId,
  initialFollowing,
  authed,
  size = "sm",
}: {
  targetId: string;
  initialFollowing: boolean;
  authed: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [, start] = useTransition();

  function toggle() {
    if (!authed) {
      router.push("/login");
      return;
    }
    const next = !following;
    setFollowing(next);
    start(async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      if (next) await supabase.from("follows").insert({ follower_id: uid, following_id: targetId });
      else await supabase.from("follows").delete().eq("follower_id", uid).eq("following_id", targetId);
    });
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={following}
      className={cn(
        buttonClasses(following ? "outline" : "solid", size),
        following && "text-bone-64",
      )}
    >
      {following ? "following" : "follow"}
    </button>
  );
}
