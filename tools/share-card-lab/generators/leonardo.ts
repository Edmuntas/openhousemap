/**
 * Leonardo.ai — Phoenix model via /generations endpoint.
 * Pricing: covered by Apprentice subscription ($10/mo, 8500 fast tokens).
 * Docs: https://docs.leonardo.ai/reference
 *
 * Note: Leonardo's API is ASYNC — generate returns a job ID, then poll
 * /generations/{id} until status=COMPLETE. This implementation polls
 * for up to 60s with 2s intervals.
 */
import type { EventInput, GeneratorOutput } from "../types";

const PHOENIX_MODEL = "6b645e3a-d64f-4341-a6d8-7a3690fbf042"; // Leonardo Phoenix 1.0

export async function renderLeonardoCard(event: EventInput): Promise<GeneratorOutput> {
  const key = process.env.LEONARDO_API_KEY;
  if (!key) throw new Error("LEONARDO_API_KEY not set");

  const prompt = [
    "Minimalist real-estate marketing background.",
    "Premium Israeli property aesthetic. Sage green and warm cream tones.",
    "Soft natural lighting. Architectural detail abstract.",
    "No text, no watermarks. Photography style.",
    `Mood: ${event.city}, warm inviting.`,
  ].join(" ");

  const headers = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // 1) Submit generation job
  const submit = await fetch("https://cloud.leonardo.ai/api/rest/v1/generations", {
    method: "POST",
    headers,
    body: JSON.stringify({
      prompt,
      modelId: PHOENIX_MODEL,
      width: 1024,
      height: 1024,
      num_images: 1,
      contrast: 3.5,
      ultra: false,
    }),
  });
  if (!submit.ok) {
    const body = await submit.text();
    throw new Error(`Leonardo submit ${submit.status}: ${body.slice(0, 300)}`);
  }
  const submitData = (await submit.json()) as { sdGenerationJob?: { generationId?: string } };
  const jobId = submitData.sdGenerationJob?.generationId;
  if (!jobId) throw new Error("Leonardo returned no generationId");

  // 2) Poll until complete (max 60s)
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const poll = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${jobId}`, { headers });
    if (!poll.ok) continue;
    const pdata = (await poll.json()) as {
      generations_by_pk?: { status?: string; generated_images?: Array<{ url?: string }> };
    };
    if (pdata.generations_by_pk?.status === "COMPLETE") {
      const url = pdata.generations_by_pk?.generated_images?.[0]?.url;
      if (!url) throw new Error("Leonardo complete but no image URL");
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Leonardo CDN fetch failed: ${r.status}`);
      const buffer = Buffer.from(await r.arrayBuffer());
      return {
        buffer,
        estimatedCost: 0.012, // ~30 tokens per image at Phoenix non-ultra; $10 / 8500 fast
        metadata: { model: "leonardo-phoenix-1.0", jobId },
      };
    }
    if (pdata.generations_by_pk?.status === "FAILED") {
      throw new Error("Leonardo generation FAILED");
    }
  }
  throw new Error("Leonardo polling timeout after 60s");
}
