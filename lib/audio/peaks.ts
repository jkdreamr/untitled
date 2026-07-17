/**
 * Decode audio client-side and compute normalized waveform peaks.
 * Runs once at upload; the ~800 values are stored so playback never decodes.
 */
export async function decodeAudioPeaks(
  file: Blob,
  buckets = 800,
): Promise<{ peaks: number[]; duration: number }> {
  const arrayBuf = await file.arrayBuffer();
  const AC: typeof AudioContext =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  try {
    const audio = await ctx.decodeAudioData(arrayBuf.slice(0));
    const channel = audio.getChannelData(0);
    const block = Math.max(1, Math.floor(channel.length / buckets));
    const peaks: number[] = [];
    let max = 0;
    for (let i = 0; i < buckets; i++) {
      let m = 0;
      const start = i * block;
      for (let j = 0; j < block && start + j < channel.length; j++) {
        const v = Math.abs(channel[start + j] ?? 0);
        if (v > m) m = v;
      }
      peaks.push(m);
      if (m > max) max = m;
    }
    const norm = max > 0 ? peaks.map((p) => p / max) : peaks;
    return { peaks: norm, duration: audio.duration };
  } finally {
    ctx.close().catch(() => {});
  }
}
