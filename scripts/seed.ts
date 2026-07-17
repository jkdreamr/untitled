/**
 * UNTITLED seed — 8 believable fictional artists and ~40 pieces across all media.
 * Media is generated programmatically (small WAV melodies, SVG-derived webp art);
 * no fabricated display metrics — reactions/follows are real seeded interactions.
 *
 *   pnpm seed
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (see .env.example).
 * Idempotent: re-running removes the previous seed artists first.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { encode } from "blurhash";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import type { Database } from "../lib/supabase/types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. See .env.example.");
  process.exit(1);
}
const db = createClient<Database>(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

const SEED_DOMAIN = "seed.untitled.novum";

// ---------------------------------------------------------------------------
// artists (obviously fictional)
// ---------------------------------------------------------------------------
const ARTISTS = [
  { handle: "wren_hums", name: "Wren Adeyemi", bio: "voice memos from the kitchen table. mostly at night.", interests: ["bedroom-pop", "voice-memo", "nocturnal", "lo-fi"] },
  { handle: "ilse_draws", name: "Ilse Kováč", bio: "ink and figure studies. i draw what won't sit still.", interests: ["ink", "figure-drawing", "sketch", "raw"] },
  { handle: "tomas_writes", name: "Tomás Rivera", bio: "fragments, mostly. i keep the receipts.", interests: ["fragment", "poem", "tender", "prose"] },
  { handle: "junko", name: "Junko Vance", bio: "one-take covers. no second takes, that's the rule.", interests: ["acoustic-cover", "singer-songwriter", "one-take", "warm"] },
  { handle: "film_bea", name: "Bea Sorokin", bio: "35mm, expired stock, warm light.", interests: ["film-photo", "street-photo", "warm", "nostalgic"] },
  { handle: "otis_plays", name: "Otis Delacroix", bio: "piano at odd hours. field recordings of the room.", interests: ["instrumental", "field-recording", "jazz", "minimal"] },
  { handle: "moss_and_rust", name: "Priya Menon", bio: "watercolor, mostly plants, mostly failing.", interests: ["watercolor", "still-life", "hopeful", "mixed-media"] },
  { handle: "late_rap", name: "Dmitri Osei", bio: "raps over cassette beats. 2am energy.", interests: ["rap", "beat", "lo-fi", "restless"] },
] as const;

// ---------------------------------------------------------------------------
// media generators
// ---------------------------------------------------------------------------

/** A short WAV melody (mono, 22.05kHz, 16-bit). Returns bytes + peaks + duration. */
function makeWav(seed: number, seconds: number): { bytes: Buffer; peaks: number[]; duration: number } {
  const rate = 22050;
  const n = Math.floor(seconds * rate);
  const scale = [0, 2, 4, 7, 9, 12]; // pentatonic-ish
  let rng = (seed * 2654435761) >>> 0;
  const rand = () => ((rng = (rng * 1664525 + 1013904223) >>> 0), rng / 0xffffffff);
  const samples = new Float32Array(n);
  const noteLen = Math.floor(rate * 0.4);
  for (let i = 0; i < n; i++) {
    const note = Math.floor(i / noteLen);
    const semi = scale[(note * 3 + Math.floor(rand() * 2)) % scale.length]! + (note % 2 ? 12 : 0);
    const freq = 220 * Math.pow(2, semi / 12);
    const t = (i % noteLen) / rate;
    const env = Math.exp(-t * 3) * (0.6 + 0.4 * Math.sin((i / n) * Math.PI));
    samples[i] = Math.sin(2 * Math.PI * freq * (i / rate)) * env * 0.35;
  }
  // WAV
  const bytes = Buffer.alloc(44 + n * 2);
  bytes.write("RIFF", 0); bytes.writeUInt32LE(36 + n * 2, 4); bytes.write("WAVE", 8);
  bytes.write("fmt ", 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36); bytes.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) bytes.writeInt16LE(Math.max(-32767, Math.min(32767, samples[i]! * 32767)), 44 + i * 2);
  // peaks (~800)
  const buckets = 800, block = Math.max(1, Math.floor(n / buckets)), peaks: number[] = [];
  let max = 0;
  for (let i = 0; i < buckets; i++) {
    let m = 0;
    for (let j = 0; j < block; j++) m = Math.max(m, Math.abs(samples[i * block + j] ?? 0));
    peaks.push(m); if (m > max) max = m;
  }
  const norm = max > 0 ? peaks.map((p) => Math.round((p / max) * 1000) / 1000) : peaks;
  return { bytes, peaks: norm, duration: seconds };
}

/** SVG-derived abstract webp + blurhash + dims. */
async function makeImage(seed: number): Promise<{ bytes: Buffer; width: number; height: number; blurhash: string }> {
  const palettes = [["#2b2a26", "#0c0c0b"], ["#3a2f24", "#0b0a09"], ["#20261a", "#0a0b08"], ["#2a2430", "#0b0a0d"]];
  const [a, b] = palettes[seed % palettes.length]!;
  const w = 1000, h = 800 + (seed % 3) * 150;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>
    <defs><radialGradient id='g' cx='${30 + (seed % 40)}%' cy='${25 + (seed % 45)}%' r='95%'>
    <stop offset='0%' stop-color='${a}'/><stop offset='100%' stop-color='${b}'/></radialGradient>
    <filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/>
    <feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncA type='linear' slope='0.08'/></feComponentTransfer></filter></defs>
    <rect width='${w}' height='${h}' fill='url(#g)'/><rect width='${w}' height='${h}' filter='url(#n)' opacity='0.5'/>
    <circle cx='${w * 0.5}' cy='${h * 0.5}' r='${120 + (seed % 5) * 30}' fill='none' stroke='#EDE8DF' stroke-opacity='0.08' stroke-width='1.5'/></svg>`;
  const bytes = await sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer();
  const meta = await sharp(bytes).metadata();
  const raw = await sharp(bytes).raw().ensureAlpha().resize(32, 32, { fit: "inside" }).toBuffer({ resolveWithObject: true });
  const blurhash = encode(new Uint8ClampedArray(raw.data), raw.info.width, raw.info.height, 4, 3);
  return { bytes, width: meta.width ?? w, height: meta.height ?? h, blurhash };
}

// ---------------------------------------------------------------------------
// piece specs (~40 across artists + media)
// ---------------------------------------------------------------------------
type Spec = { artist: number; medium: "sound" | "image" | "words"; title?: string; caption?: string; body?: string; tags: string[]; afterOf?: number };
const WORDS = [
  "i kept the receipt from the night\nwe didn't say anything —\nproof we were both there,\nboth quiet, both staying.",
  "the kettle again.\nsteam on the cold window\nspelling nothing.",
  "you left the porch light on\nlike a question\nyou already knew the answer to.",
  "practice room, 2am.\nthe piano remembers\nmore than i do.",
  "small rain. the street\nturns the colour of a photograph\nno one took.",
];
function buildSpecs(): Spec[] {
  const s: Spec[] = [];
  // sound (hero) — ~14
  for (let i = 0; i < 14; i++) s.push({ artist: [0, 3, 5, 7][i % 4]!, medium: "sound", title: i % 3 === 0 ? undefined : ["late demo", "yellow (one take)", "kitchen tape", "room 4"][i % 4], caption: i % 2 ? "one take, kept the mistakes." : undefined, tags: [["bedroom-pop", "demo"], ["acoustic-cover", "warm"], ["instrumental", "field-recording"], ["rap", "beat"]][i % 4]! });
  // image — ~14
  for (let i = 0; i < 14; i++) s.push({ artist: [1, 4, 6][i % 3]!, medium: "image", title: i % 4 === 0 ? ["morning, unmade", "expired 200", "still, failing"][i % 3] : undefined, tags: [["ink", "figure-drawing"], ["film-photo", "warm"], ["watercolor", "still-life"]][i % 3]! });
  // words — ~8
  for (let i = 0; i < 8; i++) s.push({ artist: 2, medium: "words", body: WORDS[i % WORDS.length], tags: ["fragment", i % 2 ? "tender" : "nostalgic"] });
  // words+sound pairing — ~4
  for (let i = 0; i < 4; i++) s.push({ artist: 3, medium: "sound", title: "cover w/ words", caption: "lyric + demo", body: WORDS[(i + 2) % WORDS.length], tags: ["acoustic-cover", "lyrics"] });
  return s;
}

// ---------------------------------------------------------------------------
async function main() {
  console.log("→ clearing previous seed…");
  const { data: existing } = await db.auth.admin.listUsers({ perPage: 1000 });
  for (const u of existing?.users ?? []) {
    if (u.email?.endsWith(`@${SEED_DOMAIN}`)) await db.auth.admin.deleteUser(u.id);
  }

  console.log("→ creating artists…");
  const ids: string[] = [];
  for (const a of ARTISTS) {
    const { data, error } = await db.auth.admin.createUser({
      email: `${a.handle}@${SEED_DOMAIN}`,
      email_confirm: true,
      password: randomUUID(),
    });
    if (error || !data.user) throw new Error(`createUser ${a.handle}: ${error?.message}`);
    ids.push(data.user.id);
    const { error: pErr } = await db.from("profiles").insert({
      id: data.user.id, handle: a.handle, display_name: a.name, bio: a.bio,
      interests: a.interests as unknown as string[], onboarded: true,
    });
    if (pErr) throw new Error(`profile ${a.handle}: ${pErr.message}`);
  }

  console.log("→ posting pieces…");
  const specs = buildSpecs();
  const pieceIds: string[] = [];
  let n = 0;
  for (const spec of specs) {
    const artistId = ids[spec.artist]!;
    const pieceId = randomUUID();
    const afterId = spec.afterOf != null ? pieceIds[spec.afterOf] : (n % 9 === 8 && pieceIds.length ? pieceIds[n % pieceIds.length] : undefined);

    const { error: pieceErr } = await db.from("pieces").insert({
      id: pieceId, artist_id: artistId, medium: spec.medium,
      title: spec.title ?? null, caption: spec.caption ?? null, body: spec.body ?? null,
      tags: spec.tags, visibility: "public", attested: true, status: "active",
      sequence_no: 0, after_piece_id: afterId ?? null,
      published_at: new Date(Date.now() - n * 37 * 60_000).toISOString(),
    });
    if (pieceErr) throw new Error(`piece ${n}: ${pieceErr.message}`);

    if (spec.medium === "sound") {
      const { bytes, peaks, duration } = makeWav(n + 1, 8 + (n % 5) * 4);
      const path = `${artistId}/${pieceId}/audio.wav`;
      await db.storage.from("media").upload(path, bytes, { contentType: "audio/wav", upsert: true });
      await db.from("piece_media").insert({ piece_id: pieceId, kind: "audio", storage_path: path, duration_seconds: duration, peaks, mime: "audio/wav", bytes: bytes.byteLength, position: 0 });
    } else if (spec.medium === "image") {
      const { bytes, width, height, blurhash } = await makeImage(n + 3);
      const path = `${artistId}/${pieceId}/0.webp`;
      await db.storage.from("media").upload(path, bytes, { contentType: "image/webp", upsert: true });
      await db.from("piece_media").insert({ piece_id: pieceId, kind: "image", storage_path: path, width, height, blurhash, mime: "image/webp", bytes: bytes.byteLength, position: 0 });
    }
    pieceIds.push(pieceId);
    n++;
  }

  console.log("→ weaving the graph (follows, reactions, a board)…");
  const REACT = ["keep_going", "felt_this", "on_repeat", "teach_me"] as const;
  for (let i = 0; i < ids.length; i++) {
    for (const j of [1, 3, 5]) {
      const other = ids[(i + j) % ids.length]!;
      if (other !== ids[i]) await db.from("follows").upsert({ follower_id: ids[i]!, following_id: other });
    }
  }
  for (let i = 0; i < pieceIds.length; i++) {
    const reactor = ids[(i * 3) % ids.length]!;
    const owner = specs[i]!.artist;
    if (ids[owner] !== reactor) await db.from("reactions").upsert({ piece_id: pieceIds[i]!, user_id: reactor, kind: REACT[i % 4]! });
  }
  const { data: coll } = await db.from("collections").insert({ owner_id: ids[4]!, title: "warm light, kept quiet", slug: "warm-light", description: "the ones i return to when it's late." }).select("id").single();
  if (coll) for (const pid of pieceIds.filter((_, i) => i % 4 === 0).slice(0, 8)) await db.from("collection_items").upsert({ collection_id: coll.id, piece_id: pid });

  console.log("→ refreshing recommendations…");
  await db.rpc("refresh_recommendations");

  console.log(`\n✓ seeded ${ARTISTS.length} artists · ${pieceIds.length} pieces`);
  console.log("  sign up with your own email to explore as a viewer.");
  console.log("  to grant yourself admin: update profiles set role='admin' where handle='<you>';");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
