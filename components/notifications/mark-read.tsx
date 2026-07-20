"use client";

import { useEffect, useRef } from "react";
import { markNotificationsRead } from "@/lib/notifications/actions";

/** Marks the caller's notifications read once, on view. */
export function MarkNotificationsRead() {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void markNotificationsRead();
  }, []);
  return null;
}
