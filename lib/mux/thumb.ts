/** Pure Mux image helpers — safe to import from client or server (no secrets). */

export function muxThumbnail(playbackId: string, width = 800, time?: number): string {
  const params = new URLSearchParams({ width: String(width), fit_mode: "preserve" });
  if (time != null) params.set("time", String(time));
  return `https://image.mux.com/${playbackId}/thumbnail.webp?${params.toString()}`;
}

export function muxAnimated(playbackId: string, width = 480): string {
  return `https://image.mux.com/${playbackId}/animated.webp?width=${width}`;
}
