"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteCollection } from "@/lib/collections/actions";
import { buttonClasses, Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CollectionFollow({
  collectionId,
  initialFollowing,
  authed,
}: {
  collectionId: string;
  initialFollowing: boolean;
  authed: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [, start] = useTransition();
  function toggle() {
    if (!authed) return router.push("/login");
    const next = !following;
    setFollowing(next);
    start(async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      if (next) await supabase.from("collection_follows").insert({ collection_id: collectionId, follower_id: uid });
      else await supabase.from("collection_follows").delete().eq("collection_id", collectionId).eq("follower_id", uid);
    });
  }
  return (
    <button onClick={toggle} className={cn(buttonClasses(following ? "outline" : "solid", "sm"), following && "text-bone-64")}>
      {following ? "following" : "follow board"}
    </button>
  );
}

export function DeleteCollection({ collectionId }: { collectionId: string }) {
  const [confirm, setConfirm] = useState(false);
  const [, start] = useTransition();
  if (!confirm) {
    return (
      <button onClick={() => setConfirm(true)} className="meta text-bone-32 hover:text-bone">delete board</button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="meta text-bone-46">sure?</span>
      <Button variant="outline" size="sm" onClick={() => start(() => deleteCollection(collectionId).then(() => {}))}>delete</Button>
      <button onClick={() => setConfirm(false)} className="meta text-bone-32 hover:text-bone">cancel</button>
    </div>
  );
}
