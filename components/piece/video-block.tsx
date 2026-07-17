"use client";

import MuxPlayer from "@mux/mux-player-react";
import { muxThumbnail } from "@/lib/mux/thumb";

/**
 * Video via Mux Player only (HLS adaptive). Muted poster, tap-to-play — never
 * autoplay with sound. Shows a "developing…" state until the webhook lands.
 */
export function VideoBlock({
  playbackId,
  title,
  aspect = 16 / 9,
}: {
  playbackId: string | null;
  title: string;
  aspect?: number;
}) {
  if (!playbackId) {
    return (
      <div
        className="grid place-items-center rounded-lg bg-ink-sunken"
        style={{ aspectRatio: String(aspect) }}
      >
        <div className="text-center">
          <div className="mx-auto mb-3 h-[2px] w-8 animate-[pulse-lime_1.6s_ease-in-out_infinite] bg-bone-32" />
          <p className="meta text-bone-46">developing…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg bg-ink-sunken" style={{ aspectRatio: String(aspect) }}>
      <MuxPlayer
        streamType="on-demand"
        playbackId={playbackId}
        poster={muxThumbnail(playbackId, 1200)}
        accentColor="#C8FF5E"
        metadata={{ video_title: title }}
        muted
        style={{ width: "100%", height: "100%", ["--controls" as string]: undefined }}
      />
    </div>
  );
}
