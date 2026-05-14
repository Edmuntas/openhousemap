/**
 * Share-card model comparison lab.
 *
 * Pulls a real event from Firestore, runs it through 1+ generators,
 * saves all outputs side-by-side, and creates an HTML viewer.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=.serviceAccountKey.json \
 *     npx tsx tools/share-card-lab/compare.ts --event=bhA0zn3fxvU04cCJ9Lt2
 *
 *   # With AI provider keys (optional, any subset):
 *   GOOGLE_APPLICATION_CREDENTIALS=.serviceAccountKey.json \
 *   GOOGLE_AI_API_KEY=... \
 *   OPENAI_API_KEY=... \
 *   IDEOGRAM_API_KEY=... \
 *   LEONARDO_API_KEY=... \
 *     npx tsx tools/share-card-lab/compare.ts --event=bhA0zn3fxvU04cCJ9Lt2
 *
 * Outputs to tools/share-card-lab/output/<eventId>/
 */
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { renderBaselineCard } from "./generators/baseline";
import { renderGeminiCard } from "./generators/gemini";
import { renderOpenAiCard } from "./generators/openai";
import { renderIdeogramCard } from "./generators/ideogram";
import { renderLeonardoCard } from "./generators/leonardo";
import type { EventInput, Generator } from "./types";

const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credsPath) {
  console.error("Set GOOGLE_APPLICATION_CREDENTIALS=.serviceAccountKey.json");
  process.exit(1);
}
const serviceAccount = JSON.parse(readFileSync(credsPath, "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

function parseArgs() {
  const args: Record<string, string> = {};
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

async function loadEvent(eventId: string): Promise<EventInput> {
  const snap = await db.doc(`events/${eventId}`).get();
  if (!snap.exists) {
    throw new Error(`Event ${eventId} not found`);
  }
  const e = snap.data()!;
  return {
    id: snap.id,
    address: e.address,
    city: e.city,
    price: e.price,
    rooms: e.rooms ?? null,
    size: e.size ?? null,
    date: e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    photoUrl: e.photos?.[0]?.full ?? null,
    realtor: {
      name: `${e.realtorSnapshot?.name ?? ""} ${e.realtorSnapshot?.surname ?? ""}`.trim(),
      office: e.realtorSnapshot?.officeName ?? "",
      logoUrl: e.realtorSnapshot?.logoUrl ?? null,
      brandColor: e.realtorSnapshot?.officeBrandColor ?? null,
    },
  };
}

const ALL_GENERATORS: Generator[] = [
  { name: "baseline-vercel-og", label: "Vercel OG (baseline)", requires: [], run: renderBaselineCard },
  { name: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image", requires: ["GOOGLE_AI_API_KEY"], run: renderGeminiCard },
  { name: "gpt-image-1", label: "OpenAI gpt-image-1", requires: ["OPENAI_API_KEY"], run: renderOpenAiCard },
  { name: "ideogram-3", label: "Ideogram 3.0", requires: ["IDEOGRAM_API_KEY"], run: renderIdeogramCard },
  { name: "leonardo-phoenix", label: "Leonardo.ai Phoenix", requires: ["LEONARDO_API_KEY"], run: renderLeonardoCard },
];

async function main() {
  const args = parseArgs();
  const eventId = args.event;
  if (!eventId) {
    console.error("Usage: --event=<eventId>");
    process.exit(1);
  }

  console.log(`=== Share card comparison for ${eventId} ===`);
  const event = await loadEvent(eventId);
  console.log(`  ${event.address} — ${event.price} ILS`);
  if (event.photoUrl) console.log(`  photo: ${event.photoUrl.slice(0, 80)}...`);

  const outDir = join(process.cwd(), "tools/share-card-lab/output", eventId);
  mkdirSync(outDir, { recursive: true });

  // Pick which generators to run based on available env vars
  const available = ALL_GENERATORS.filter((g) => {
    if (g.requires.length === 0) return true;
    const ok = g.requires.every((k) => !!process.env[k]);
    if (!ok) {
      console.log(`  ⏭  skip ${g.name} (missing ${g.requires.filter((k) => !process.env[k]).join(", ")})`);
    }
    return ok;
  });

  console.log(`\nRunning ${available.length} generator(s)...\n`);

  const results: { generator: string; label: string; ok: boolean; path?: string; cost?: number; ms?: number; error?: string }[] = [];

  for (const gen of available) {
    const t0 = Date.now();
    console.log(`▶ ${gen.label}`);
    try {
      const png = await gen.run(event);
      const path = join(outDir, `${gen.name}.png`);
      writeFileSync(path, png.buffer);
      const ms = Date.now() - t0;
      console.log(`  ✓ saved ${path}  (${(png.buffer.length / 1024).toFixed(1)} KB, ${ms}ms, $${png.estimatedCost.toFixed(4)})`);
      results.push({ generator: gen.name, label: gen.label, ok: true, path: `${gen.name}.png`, cost: png.estimatedCost, ms });
    } catch (e) {
      const ms = Date.now() - t0;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ✗ failed (${ms}ms): ${msg}`);
      results.push({ generator: gen.name, label: gen.label, ok: false, ms, error: msg });
    }
  }

  // Write HTML viewer
  const html = renderViewer(event, results);
  writeFileSync(join(outDir, "index.html"), html, "utf-8");
  console.log(`\n=== Done — open file://${join(outDir, "index.html")} ===`);
}

function renderViewer(event: EventInput, results: ReturnType<typeof Array.prototype.map<unknown>>) {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<title>Share card lab — ${event.address}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Rubik", sans-serif; background: #F6F8F2; color: #141C0A; margin: 0; padding: 32px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .meta { color: #4A6E30; font-size: 14px; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px; }
  .card { background: white; border-radius: 16px; padding: 16px; box-shadow: 0 4px 20px rgba(20,28,10,0.08); }
  .label { font-weight: 700; margin-bottom: 6px; }
  .stats { font-size: 12px; color: #4A6E30; margin: 6px 0; }
  .preview { width: 100%; aspect-ratio: 1/1; background: #F0E8D0; border-radius: 12px; object-fit: cover; }
  .error { color: #C04848; font-size: 13px; padding: 12px; background: #C0484811; border-radius: 8px; }
</style>
</head>
<body>
<h1>${event.address}</h1>
<div class="meta">${event.price.toLocaleString()} ₪ · ${event.date} ${event.startTime}–${event.endTime} · ${event.realtor.office}</div>
<div class="grid">
${(results as Array<Record<string, unknown>>).map((r) => `
  <div class="card">
    <div class="label">${r.label}</div>
    ${r.ok
      ? `<img class="preview" src="${r.path}" alt="${r.label}">
         <div class="stats">${r.ms}ms · $${(r.cost as number)?.toFixed(4) ?? "0.0000"}</div>`
      : `<div class="error">${r.error}</div>`}
  </div>
`).join("")}
</div>
</body>
</html>`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
