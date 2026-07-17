import { z } from "zod";

export const AudioMeta = z.object({
  path: z.string().min(1),
  duration: z.number().min(0).max(360), // 6 min cap
  peaks: z.array(z.number()).max(2000),
  mime: z.string().max(100),
  bytes: z.number().int().min(0).max(52_428_800),
});

export const ImageMeta = z.object({
  path: z.string().min(1),
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
  blurhash: z.string().max(64),
  bytes: z.number().int().min(0).max(26_214_400),
});

export const VideoMeta = z.object({ upload_id: z.string().max(200) });

export const PublishInput = z
  .object({
    id: z.string().uuid(),
    medium: z.enum(["sound", "video", "image", "words"]),
    attested: z.literal(true, { message: "you must attest this is human-made" }),
    title: z.string().trim().max(120).nullish(),
    caption: z.string().trim().max(280).nullish(),
    body: z.string().max(2000).nullish(),
    tags: z.array(z.string()).max(12).default([]),
    after_piece_id: z.string().uuid().nullish(),
    visibility: z.enum(["public", "followers", "unlisted"]).default("public"),
    audio: AudioMeta.optional(),
    images: z.array(ImageMeta).min(1).max(6).optional(),
    video: VideoMeta.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.medium === "sound" && !v.audio)
      ctx.addIssue({ code: "custom", message: "a sound piece needs an audio file", path: ["audio"] });
    if (v.medium === "image" && (!v.images || v.images.length === 0))
      ctx.addIssue({ code: "custom", message: "an image piece needs at least one image", path: ["images"] });
    if (v.medium === "video" && !v.video)
      ctx.addIssue({ code: "custom", message: "a video piece needs an upload", path: ["video"] });
    if (v.medium === "words" && (!v.body || v.body.trim().length === 0))
      ctx.addIssue({ code: "custom", message: "write something", path: ["body"] });
  });

export type PublishInputT = z.infer<typeof PublishInput>;
