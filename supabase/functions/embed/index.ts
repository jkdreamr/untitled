// Supabase Edge Function — gte-small (384-dim) text embeddings.
// The graceful fallback for search when GEMINI_API_KEY is absent: the query
// path and the enrichment index both use this to stay in the same 384-dim space.
// Deno runtime — not part of the Next.js TypeScript project.

// @ts-expect-error edge runtime types are provided by Supabase at deploy time
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// @ts-expect-error Supabase.ai is injected by the edge runtime
const model = new Supabase.ai.Session("gte-small");

// @ts-expect-error Deno global exists in the edge runtime
Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  try {
    const { input } = (await req.json()) as { input?: string };
    if (typeof input !== "string" || input.trim().length === 0) return json({ error: "no input" }, 400);
    const embedding = await model.run(input.slice(0, 4000), { mean_pool: true, normalize: true });
    return json({ embedding });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
