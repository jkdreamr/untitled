import { z } from "zod";

export const AudioMeta = z.object({
  path: z.string().min(1),
  duration: z.number().min(0).max(360), // 6 min cap
  peaks: z.array(z.number()).max(2000),
  mime: z.string().max(100),
  bytes: z.number().int().min(0).max(52_428_800),
});

export const VideoMeta = z.object({ upload_id: z.string().max(200) });

/** Everything here is a track: an audio take, or a performance video. */
export const PublishInput = z
  .object({
    id: z.string().uuid(),
    medium: z.enum(["sound", "video"]),
    track_kind: z.enum(["original", "cover", "beat", "freestyle"]).default("original"),
    has_vocals: z.boolean().default(true),
    attested: z.literal(true, { message: "you must attest this is human-made" }),
    title: z.string().trim().max(120).nullish(),
    caption: z.string().trim().max(280).nullish(),
    cover_of_title: z.string().trim().max(120).nullish(),
    cover_of_artist: z.string().trim().max(120).nullish(),
    lyrics: z.string().max(4000).nullish(),
    lyrics_source: z.enum(["written", "transcribed_confirmed"]).nullish(),
    show_lyrics: z.boolean().default(true),
    tags: z.array(z.string()).max(12).default([]),
    after_piece_id: z.string().uuid().nullish(),
    visibility: z.enum(["public", "followers", "unlisted"]).default("public"),
    audio: AudioMeta.optional(),
    video: VideoMeta.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.medium === "sound" && !v.audio)
      ctx.addIssue({ code: "custom", message: "a track needs an audio file", path: ["audio"] });
    if (v.medium === "video" && !v.video)
      ctx.addIssue({ code: "custom", message: "a performance video needs an upload", path: ["video"] });
    if (v.track_kind === "cover" && !v.cover_of_title?.trim())
      ctx.addIssue({ code: "custom", message: "name the song you're covering", path: ["cover_of_title"] });
  });

export type PublishInputT = z.infer<typeof PublishInput>;
