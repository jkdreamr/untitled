# UNTITLED

**The platform for raw, human-made art.** A product of NOVUM Labs.

Post the voice memo, the one-take cover, the phone video at the piano, the
sketchbook page, the film photo, the lyric fragment — the raw thing itself.
No polishing, no captions to optimize, no algorithm to feed.

Position: **human-made art, human-made discovery.** AI never generates or
"improves" the work. Its only jobs are search, recommendation, and enrichment —
making every piece findable by exactly the people looking for it.

---

## Stack

- **Next.js 16** (App Router, RSC + Suspense streaming) · **TypeScript strict**
- **Tailwind v4** (CSS-first `@theme` tokens) — the NOVUM design system
- **Supabase** — Postgres + `pgvector` + `pg_cron`, Auth (`@supabase/ssr`),
  Storage, Edge Functions
- **Mux** — video end-to-end (direct upload → webhook → HLS via `@mux/mux-player-react`)
- **wavesurfer-style peaks** computed client-side (Web Audio) · **sharp** ·
  **blurhash** · **zod** on every server input
- Search: **Gemini Embedding 2** (unified multimodal) with a **gte-small** edge
  fallback, fused with Postgres FTS

The app **runs with only the two public Supabase variables set.** Every other
key unlocks one capability and degrades gracefully when absent (no Gemini →
gte-small → FTS; no Mux → video posting hidden; no Anthropic/Groq → tags + FTS
only).

---

## Quick start (local)

```bash
pnpm install
cp .env.example .env.local        # fill in the two required NEXT_PUBLIC_ vars
pnpm dev                          # http://localhost:3000
```

To connect your own Supabase project:

1. **Create a project** at supabase.com, then apply the migrations in order.
   With the [Supabase CLI](https://supabase.com/docs/guides/cli):
   ```bash
   supabase link --project-ref <your-ref>
   supabase db push                       # applies supabase/migrations/*.sql
   supabase functions deploy embed        # gte-small fallback edge function
   ```
   (Or paste each `supabase/migrations/000N_*.sql` into the SQL editor in order.)
2. **Buckets** `media` and `avatars` are created by migration `0006` (private).
3. Put `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
4. **Seed** believable content (needs `SUPABASE_SERVICE_ROLE_KEY`):
   ```bash
   pnpm seed        # 8 fictional artists, ~40 pieces, generated media
   ```
5. `pnpm dev`, sign up with your email (magic link), and you're in.

Grant yourself admin for the `/admin` moderation queue:
```sql
update profiles set role = 'admin' where handle = '<your-handle>';
```

---

## Environment

See [`.env.example`](./.env.example) for the full, annotated list. Summary:

| Variable | Required | Unlocks |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | ✅ | the app |
| `SUPABASE_SERVICE_ROLE_KEY` † | — | seed, enrichment writes, Mux webhook, hard delete |
| `GEMINI_API_KEY` † | — | unified multimodal search (Layer A) |
| `ANTHROPIC_API_KEY` † | — | image descriptions (search recall + alt text) |
| `GROQ_API_KEY` † | — | vocal transcription (searchable lyrics) |
| `MUX_TOKEN_ID` / `_SECRET` / `_WEBHOOK_SECRET` † | — | video |
| `CRON_SECRET` † | — | protects `/api/enrichment/run` |
| `ENABLE_SCOUT` | — | the `/scout` teaser + waitlist |

† server-only — never reaches a client bundle (enforced by `server-only` imports).

---

## Deploy (Vercel)

```bash
vercel                            # or import the repo in the Vercel dashboard
```

Set the env vars above in the Vercel project. Two things wire up automatically:

- `vercel.json` schedules a cron hitting `/api/enrichment/run` every 2 minutes;
  Vercel adds the `Authorization: Bearer $CRON_SECRET` header when `CRON_SECRET`
  is set, so no route is left open.
- **Mux webhook**: point a Mux webhook at `https://<your-domain>/api/mux/webhook`
  (event `video.asset.ready`) and set `MUX_WEBHOOK_SECRET` to its signing secret.

Recommendation neighborhoods refresh nightly via `pg_cron` (migration `0013`).

---

## Architecture

### Feeds — no engagement ranking
- **Following**: strictly reverse-chronological, single column, mixed media,
  **keyset pagination** on `(published_at, id)` (never offset). RSC-streamed
  load-more; audio keeps playing across navigation through one global `<audio>`.
- **Wander**: similarity + interest + co-collection scoring, then **forced
  diversity** applied in the app — never >2 consecutive same-medium/same-artist,
  ~20% exploration slots (artists with <5 followers), a calm interstitial every
  ~40 pieces. No trending, no leaderboards, nothing optimized for time-on-app.

### Search — the centerpiece (one Postgres RPC)
`search_pieces` runs FTS and pgvector **in parallel** and fuses them with
**reciprocal rank fusion** (k=60). Vectors arrive as text and are cast, so
PostgREST needs no vector binding. Graceful degradation is baked in:
Gemini (1536-dim) → gte-small (384-dim, edge function) → **FTS only** — and
every layer failing silently falls through. The UI is as-you-type with a 200ms
debounce and request cancellation; results never error to the user.

Pieces are searchable by tags/FTS **the instant they post** (a trigger builds
the initial search doc); semantic enrichment lands within ~a minute via the
async job queue.

### Media pipeline
- **Sound** (≤6 min): client decodes with Web Audio and computes ~800 peaks,
  uploads the original directly to Storage via a signed URL; the waveform draws
  from stored peaks — playback never downloads a file to draw.
- **Image** (≤6/roll): originals stage to Storage, a server route runs sharp to
  **strip all EXIF (incl. GPS)**, convert HEIC → webp, downscale (never crop),
  and emit a blurhash. Bytes stay off the serverless request body.
- **Video** (≤3 min): Mux direct upload → `video.asset.ready` webhook (signature
  verified) writes the playback id + a video media row. "developing…" until then.
- **Words** (≤2000): rendered in Instrument Serif via a whitespace-safe
  component (no `dangerouslySetInnerHTML`).

### Enrichment (async — posting never waits)
A trigger enqueues `embed` / `describe|transcribe` / `index` jobs. The worker
(`/api/enrichment/run`, drained by cron) calls Anthropic vision, Groq Whisper,
and the embedding provider, writing to `piece_search`. Missing keys → the stage
is a no-op and the piece stays FTS-searchable.

### Security model
- **RLS on every table.** Public read only where `visibility='public' AND
  status='active'`; artists get full CRUD on their own rows; social writes only
  as `auth.uid()`. `piece_search` / `enrichment_jobs` / `rate_limits` /
  `piece_neighbors` are never client-readable.
- **Column-level GRANTs** (not table-grant + column-revoke — that doesn't work):
  authenticated cannot write `role`, `suspended`, `sequence_no`, or the
  denormalized counters, and cannot read the count columns (quiet-mode masking
  is real, not just cosmetic). All count reads go through SECURITY DEFINER RPCs.
- **Quiet mode**: reaction/follower counts are masked for everyone but the owner
  (and admins), enforced in the RPC layer and by the column revoke.
- **Storage**: private buckets, per-user-folder upload scoping, visibility-gated
  reads, short-lived signed URLs only.
- **Rate limits** (sliding window in Postgres): posts 10/day, comments 60/hr,
  reactions 300/hr, reports 20/day, search 60/min, auth 10/15min.
- **Uploads validated by magic bytes**, not extension. Strict CSP (incl. Mux),
  `X-Frame-Options: DENY`, `Referrer-Policy`, `X-Content-Type-Options`,
  `X-Robots-Tag: noai, noimageai` (+ matching meta on every page).
- **Account deletion** hard-deletes DB rows (cascade), Storage files, and Mux
  assets via the API.

Run the RLS suite (pgTAP):
```bash
supabase test db          # runs supabase/tests/rls.test.sql
```
It verifies: anon can't read private pieces · user A can't edit B's piece ·
`artist_id` can't be forged · deleted pieces invisible · quiet-mode counts not
exposed to others · `piece_search` never client-readable.

---

## Performance

RSC + Suspense streaming for all feeds; `next/image` with blurhash + explicit
dimensions (CLS-safe); one global `<audio>` with `preload="none"`; Mux
poster-first; keyset pagination everywhere; HNSW on embeddings; composite
indexes on every feed/profile/wander path.

### `EXPLAIN ANALYZE` — the five hottest queries

Measured on a 600-piece / 8-artist dataset (Supabase, `us-east-1`), stats
freshly `ANALYZE`d. Server-side execution time:

| Query | Plan | Exec time |
| --- | --- | --- |
| Following feed (keyset) | `Index Scan using pieces_feed_idx` | **0.53 ms** |
| Profile grid (keyset) | `pieces_feed_idx` + memoized profile join | **0.97 ms** |
| Search — FTS path | GIN `piece_search_fts_idx` (seq-scan here only because the synthetic docs are identical → 100% selectivity) | **4.5 ms** |
| Wander candidate scan | `Index Scan using pieces_visibility_idx` | **0.53 ms** |
| Feed card assembly (20 cards via `piece_card_json`) | 1 index scan + per-card jsonb build | **19.3 ms** (~1 ms/card) |

Search server-side p95 (FTS + fuse + assemble) lands well under the 250 ms
target; the vector path adds an HNSW scan of similar cost when embeddings exist.

Budget targets (verify with Lighthouse on landing / feed / piece): LCP < 1.5s,
INP < 200ms, CLS < 0.05, Lighthouse ≥ 90 performance & accessibility.

---

## Product rules (non-negotiable)

Human-made only (one-tap "I made this" attestation; TOS no-AI-training clause).
AI never touches the art. Untitled by default (`untitled no. {n}`). Reactions
visible but quiet-mode-toggleable. No engagement-ranked feeds. Artists never
pay. Consent & rights baked in; account deletion hard-deletes media everywhere;
no download buttons on others' work.

---

## Project structure

```
app/
  (marketing)/        landing chrome · scout · terms · privacy · dmca
  (auth)/             login · onboarding
  (app)/              feed · wander · search · compose · piece · [handle] ·
                      collections · c/[id] · dashboard · settings · admin
  api/                media/process-image · media/avatar · mux/* · search ·
                      enrichment/run
  auth/callback/      magic-link / OAuth exchange
components/           brand · nav · player · piece · feed · wander · search · …
lib/
  supabase/           browser · server · admin · proxy clients + types
  data/               RPC-backed read layer (feed, piece, profile, collections)
  embeddings/         provider interface (Gemini + gte-small)
  enrichment/         worker + vision + transcription
  compose/ piece/ account/ admin/ …   server actions
supabase/
  migrations/         0001–0014 (schema, RLS, RPCs, storage, recs, cron, hardening)
  functions/embed/    gte-small edge function
  tests/rls.test.sql  pgTAP
scripts/seed.ts       pnpm seed
```

---

Built by NOVUM Labs. No AI training on this work.
