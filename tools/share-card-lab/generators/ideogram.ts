/**
 * Ideogram 3.0 API — strongest text rendering across image models.
 * Pricing: $0.05-0.08 per image depending on quality.
 * Docs: https://developer.ideogram.ai
 */
import type { EventInput, GeneratorOutput } from "../types";

export async function renderIdeogramCard(event: EventInput): Promise<GeneratorOutput> {
  const key = process.env.IDEOGRAM_API_KEY;
  if (!key) throw new Error("IDEOGRAM_API_KEY not set");

  const prompt = [
    "Minimalist real-estate marketing background image, square 1:1.",
    "Premium Israeli property listing aesthetic. Sage green and cream palette.",
    "Soft warm natural lighting. Architectural detail abstract.",
    "No text. No watermarks. Photography style, not illustration.",
    `Subject mood: ${event.city}, mid-day, inviting.`,
  ].join(" ");

  const res = await fetch("https://api.ideogram.ai/generate", {
    method: "POST",
    headers: { "Api-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      image_request: {
        prompt,
        aspect_ratio: "ASPECT_1_1",
        model: "V_3",
        magic_prompt_option: "OFF",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ideogram ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { data?: Array<{ url?: string }> };
  const url = data.data?.[0]?.url;
  if (!url) throw new Error("Ideogram returned no image URL");

  const r = await fetch(url);
  if (!r.ok) throw new Error(`Ideogram CDN fetch failed: ${r.status}`);
  const buffer = Buffer.from(await r.arrayBuffer());

  return {
    buffer,
    estimatedCost: 0.06,
    metadata: { model: "Ideogram V_3" },
  };
}
