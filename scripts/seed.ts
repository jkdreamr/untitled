/**
 * UNTITLED seed — 8 believable fictional musicians and ~30 tracks.
 * Everything is a track: short WAV takes generated programmatically, with a mix
 * of kinds (original / cover / beat / freestyle), vocals, and lyrics (some
 * time-synced). No fabricated display metrics — reactions/follows are real
 * seeded interactions. Video isn't seeded (it needs the Mux upload flow).
 *
 *   pnpm seed
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (see .env.example).
 * Idempotent: re-running removes the previous seed musicians first.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Database, Json } from "../lib/supabase/types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. See .env.example.");
  process.exit(1);
}
const db = createClient<Database>(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

const SEED_DOMAIN = "seed.untitled.novum";

// ---------------------------------------------------------------------------
// musicians (obviously fictional) — talent pages, with roles + openness
// ---------------------------------------------------------------------------
const ARTISTS = [
  { handle: "wren_hums", name: "Wren Adeyemi", bio: "voice memos from the kitchen table. mostly at night.", interests: ["bedroom-pop", "demo", "nocturnal", "lo-fi"], roles: ["vocalist", "songwriter"], open_to: ["collabs", "writing"], voice_note: "low alto, kitchen demos, mostly after midnight" },
  { handle: "junko", name: "Junko Vance", bio: "one-take covers. no second takes, that's the rule.", interests: ["acoustic", "singer-songwriter", "one-take", "warm"], roles: ["vocalist", "instrumentalist"], open_to: ["features", "sessions"], voice_note: "one-take covers, guitar in hand" },
  { handle: "late_rap", name: "Dmitri Osei", bio: "raps over cassette beats. 2am energy.", interests: ["hip-hop", "rap", "lo-fi", "restless"], roles: ["rapper", "songwriter"], open_to: ["features", "collabs"], voice_note: "2am raps over dusty beats" },
  { handle: "otis_plays", name: "Otis Delacroix", bio: "piano at odd hours. the room is part of it.", interests: ["jazz", "piano", "instrumental", "moody"], roles: ["instrumentalist", "composer"], open_to: ["sessions"], voice_note: "piano at odd hours, room and all" },
  { handle: "bea_beats", name: "Bea Sorokin", bio: "lo-fi beats, warm and a little broken.", interests: ["beat", "lo-fi", "instrumental", "warm"], roles: ["producer"], open_to: ["collabs", "features"], voice_note: "warm, dusty beats — looking for a voice" },
  { handle: "ilse_keys", name: "Ilse Kováč", bio: "songs at the piano, written the same night.", interests: ["singer-songwriter", "piano", "tender", "folk"], roles: ["vocalist", "songwriter", "instrumentalist"], open_to: ["writing", "collabs"], voice_note: "songs at the piano, 2am, first drafts" },
  { handle: "tomas_raps", name: "Tomás Rivera", bio: "freestyles and fragments. i keep the receipts.", interests: ["hip-hop", "freestyle", "spoken-word", "restless"], roles: ["rapper", "songwriter"], open_to: ["writing", "features"], voice_note: "freestyles, one mic, no punch-ins" },
  { handle: "priya_sings", name: "Priya Menon", bio: "soul and gospel, big room, small phone.", interests: ["soul", "gospel", "vocals", "hopeful"], roles: ["vocalist"], open_to: ["features", "sessions"], voice_note: "soul & gospel, a big room voice" },
] as const;

// ---------------------------------------------------------------------------
// audio generator — a short WAV take (mono, 22.05kHz, 16-bit)
// ---------------------------------------------------------------------------
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
  const bytes = Buffer.alloc(44 + n * 2);
  bytes.write("RIFF", 0); bytes.writeUInt32LE(36 + n * 2, 4); bytes.write("WAVE", 8);
  bytes.write("fmt ", 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36); bytes.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) bytes.writeInt16LE(Math.max(-32767, Math.min(32767, samples[i]! * 32767)), 44 + i * 2);
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

/** Spread lyric lines evenly across the take, so the synced view has something to scroll. */
function makeSegments(lyrics: string, duration: number): Json {
  const lines = lyrics.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const seg = duration / lines.length;
  return lines.map((text, i) => ({
    start: Math.round(i * seg * 100) / 100,
    end: Math.round((i + 1) * seg * 100) / 100,
    text,
  })) as unknown as Json;
}

// fabricated, original lyric snippets (no real/copyrighted text anywhere)
const LYRICS = [
  "if the kitchen light is still on\ni'm still awake, still humming this\nsome nights the quiet does the singing",
  "kept the receipt from the night we said nothing\nproof we were both there, both staying\nboth pretending it was fine",
  "you left the porch light on\nlike a question you already knew\nthe answer to, and stayed anyway",
  "small rain on the avenue\nthe street turns the colour\nof a photograph no one took",
  "call it a demo, call it a start\ni'll fix it later, i always say\nthen leave it exactly like this",
  "2am and the piano remembers\nmore than i do, more than i'd admit\nso i let it lead",
];

// ---------------------------------------------------------------------------
// track specs (~30 across musicians + kinds)
// ---------------------------------------------------------------------------
type Kind = "original" | "cover" | "beat" | "freestyle";
type Spec = {
  artist: number;
  kind: Kind;
  hasVocals?: boolean;
  title?: string;
  caption?: string;
  lyrics?: number; // index into LYRICS
  synced?: boolean;
  coverTitle?: string;
  coverArtist?: string;
  tags: string[];
  afterOf?: number;
};

function buildSpecs(): Spec[] {
  const s: Spec[] = [];
  // originals with vocals + lyrics (some synced)
  s.push({ artist: 0, kind: "original", title: "kitchen light", caption: "one take, kept the mistakes.", lyrics: 0, synced: true, tags: ["bedroom-pop", "demo", "nocturnal"] });
  s.push({ artist: 0, kind: "original", lyrics: 2, tags: ["bedroom-pop", "tender"] });
  s.push({ artist: 0, kind: "original", title: "porch light", lyrics: 2, synced: true, tags: ["lo-fi", "warm"] });
  s.push({ artist: 5, kind: "original", title: "first draft", caption: "written the same night.", lyrics: 5, synced: true, tags: ["singer-songwriter", "piano", "tender"] });
  s.push({ artist: 5, kind: "original", lyrics: 3, tags: ["folk", "melancholy"] });
  s.push({ artist: 7, kind: "original", title: "big room", lyrics: 4, synced: true, tags: ["soul", "gospel", "hopeful"] });
  s.push({ artist: 7, kind: "original", lyrics: 0, tags: ["soul", "vocals", "warm"] });
  // covers (attribution set; vocals; no pasted lyrics — the transcribe→confirm flow fills those)
  s.push({ artist: 1, kind: "cover", title: "yellow (one take)", caption: "no second takes.", coverTitle: "Yellow", coverArtist: "Coldplay", tags: ["acoustic", "one-take", "raw"] });
  s.push({ artist: 1, kind: "cover", coverTitle: "Jolene", coverArtist: "Dolly Parton", tags: ["acoustic", "vocals"] });
  s.push({ artist: 1, kind: "cover", title: "the night we met", coverTitle: "The Night We Met", coverArtist: "Lord Huron", tags: ["acoustic", "melancholy"] });
  s.push({ artist: 5, kind: "cover", coverTitle: "Skinny Love", coverArtist: "Bon Iver", tags: ["singer-songwriter", "tender"] });
  s.push({ artist: 7, kind: "cover", title: "a change is gonna come", coverTitle: "A Change Is Gonna Come", coverArtist: "Sam Cooke", tags: ["soul", "gospel"] });
  // freestyles / raps with lyrics
  s.push({ artist: 2, kind: "freestyle", title: "cassette freestyle", caption: "off the top, one mic.", lyrics: 1, tags: ["hip-hop", "freestyle", "one-take"], afterOf: 18 });
  s.push({ artist: 2, kind: "original", lyrics: 4, tags: ["hip-hop", "rap", "restless"] });
  s.push({ artist: 2, kind: "freestyle", lyrics: 3, tags: ["hip-hop", "freestyle"], afterOf: 19 });
  s.push({ artist: 6, kind: "freestyle", title: "receipts", lyrics: 1, synced: true, tags: ["hip-hop", "spoken-word", "restless"] });
  s.push({ artist: 6, kind: "original", lyrics: 5, tags: ["hip-hop", "rap", "moody"] });
  // instrumentals + beats (no vocals, no lyrics)
  s.push({ artist: 3, kind: "original", hasVocals: false, title: "room 4", caption: "the room is part of it.", tags: ["jazz", "piano", "instrumental"] });
  s.push({ artist: 3, kind: "original", hasVocals: false, tags: ["jazz", "instrumental", "moody"] });
  s.push({ artist: 4, kind: "beat", title: "dusty 74", tags: ["beat", "lo-fi", "instrumental"] });
  s.push({ artist: 4, kind: "beat", tags: ["beat", "lo-fi"] });
  s.push({ artist: 4, kind: "beat", title: "warm loop", caption: "looking for a voice.", tags: ["beat", "warm", "instrumental"] });
  // a few more to round out ~30, spread across artists
  s.push({ artist: 0, kind: "cover", coverTitle: "River", coverArtist: "Joni Mitchell", tags: ["acoustic", "nocturnal"] });
  s.push({ artist: 1, kind: "original", title: "b-side", lyrics: 4, tags: ["singer-songwriter", "demo"] });
  s.push({ artist: 5, kind: "original", lyrics: 2, synced: true, tags: ["folk", "tender"] });
  s.push({ artist: 7, kind: "cover", coverTitle: "Feeling Good", coverArtist: "Nina Simone", tags: ["soul", "vocals"] });
  s.push({ artist: 2, kind: "original", title: "cassette tape", lyrics: 0, tags: ["hip-hop", "lo-fi"] });
  s.push({ artist: 6, kind: "freestyle", lyrics: 3, tags: ["hip-hop", "freestyle", "one-take"] });
  s.push({ artist: 3, kind: "original", hasVocals: false, title: "late practice", tags: ["jazz", "piano", "nocturnal"] });
  s.push({ artist: 4, kind: "beat", title: "broken tape", tags: ["beat", "lo-fi", "moody"] });
  return s;
}

// ---------------------------------------------------------------------------
async function main() {
  console.log("→ clearing previous seed…");
  const { data: existing } = await db.auth.admin.listUsers({ perPage: 1000 });
  for (const u of existing?.users ?? []) {
    if (u.email?.endsWith(`@${SEED_DOMAIN}`)) await db.auth.admin.deleteUser(u.id);
  }

  console.log("→ creating musicians…");
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
      roles: a.roles as unknown as string[], open_to: a.open_to as unknown as string[],
      voice_note: a.voice_note,
    });
    if (pErr) throw new Error(`profile ${a.handle}: ${pErr.message}`);
  }

  console.log("→ posting tracks…");
  const specs = buildSpecs();
  const pieceIds: string[] = [];
  let n = 0;
  for (const spec of specs) {
    const artistId = ids[spec.artist]!;
    const pieceId = randomUUID();
    const afterId = spec.afterOf != null ? pieceIds[spec.afterOf] : (n % 11 === 10 && pieceIds.length ? pieceIds[n % pieceIds.length] : undefined);
    const hasVocals = spec.kind === "beat" ? false : (spec.hasVocals ?? true);
    const lyricText = spec.lyrics != null ? LYRICS[spec.lyrics]! : null;
    const { bytes, peaks, duration } = makeWav(n + 1, 8 + (n % 5) * 4);

    const { error: pieceErr } = await db.from("pieces").insert({
      id: pieceId, artist_id: artistId, medium: "sound",
      track_kind: spec.kind, has_vocals: hasVocals,
      title: spec.title ?? null, caption: spec.caption ?? null,
      cover_of_title: spec.coverTitle ?? null, cover_of_artist: spec.coverArtist ?? null,
      lyrics: lyricText,
      lyrics_source: lyricText ? "written" : null,
      lyric_segments: lyricText && spec.synced ? makeSegments(lyricText, duration) : null,
      show_lyrics: true,
      tags: spec.tags, visibility: "public", attested: true, status: "active",
      sequence_no: 0, after_piece_id: afterId ?? null,
      published_at: new Date(Date.now() - n * 37 * 60_000).toISOString(),
    });
    if (pieceErr) throw new Error(`track ${n}: ${pieceErr.message}`);

    const path = `${artistId}/${pieceId}/audio.wav`;
    await db.storage.from("media").upload(path, bytes, { contentType: "audio/wav", upsert: true });
    await db.from("piece_media").insert({ piece_id: pieceId, kind: "audio", storage_path: path, duration_seconds: duration, peaks, mime: "audio/wav", bytes: bytes.byteLength, position: 0 });

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
  const { data: coll } = await db.from("collections").insert({ owner_id: ids[4]!, title: "on repeat, late", slug: "on-repeat-late", description: "the takes i come back to when it's quiet." }).select("id").single();
  if (coll) for (const pid of pieceIds.filter((_, i) => i % 4 === 0).slice(0, 8)) await db.from("collection_items").upsert({ collection_id: coll.id, piece_id: pid });

  console.log("→ creating an approved scout…");
  const scoutRes = await db.auth.admin.createUser({
    email: `nadia_scout@${SEED_DOMAIN}`,
    email_confirm: true,
    password: randomUUID(),
  });
  if (scoutRes.error || !scoutRes.data.user) throw new Error(`createUser scout: ${scoutRes.error?.message}`);
  const scoutId = scoutRes.data.user.id;
  await db.from("profiles").insert({
    id: scoutId,
    handle: "nadia_ar",
    display_name: "Nadia Okonkwo",
    bio: "a&r, independent. always listening.",
    onboarded: true,
  });
  await db.from("scout_accounts").insert({
    profile_id: scoutId,
    org_name: "Slow Loris Records",
    status: "approved",
  });

  console.log("→ seeding listen telemetry…");
  const listenRows: { piece_id: string; listener_id: string; quartile: number }[] = [];
  for (let i = 0; i < pieceIds.length; i++) {
    const ownerId = ids[specs[i]!.artist]!;
    const reach = 2 + (i % 4); // a spread of listeners per track
    for (let l = 0; l < reach; l++) {
      const listener = ids[(i * 5 + l) % ids.length]!;
      if (listener === ownerId) continue; // never the owner
      listenRows.push({ piece_id: pieceIds[i]!, listener_id: listener, quartile: 25 });
      if (l % 2 === 0) listenRows.push({ piece_id: pieceIds[i]!, listener_id: listener, quartile: 50 });
      if (l % 3 === 0) listenRows.push({ piece_id: pieceIds[i]!, listener_id: listener, quartile: 100 });
    }
  }
  if (listenRows.length) await db.from("listen_events").insert(listenRows);

  console.log("→ refreshing recommendations + talent signals…");
  await db.rpc("refresh_recommendations");
  await db.rpc("refresh_artist_signals");

  console.log(`\n✓ seeded ${ARTISTS.length} musicians · ${pieceIds.length} tracks · 1 scout (nadia_ar)`);
  console.log("  sign up with your own email to explore as a listener.");
  console.log("  to grant yourself admin: update profiles set role='admin' where handle='<you>';");
  console.log("  to explore scout tools, approve your own account:");
  console.log("    insert into scout_accounts(profile_id,org_name,status) select id,'Your Org','approved' from profiles where handle='<you>';");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
