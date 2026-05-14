/**
 * OpenAI gpt-image-1 — generate background image via /v1/images/generations.
 * Pricing: $0.04-0.17 per image depending on quality tier.
 * Docs: https://platform.openai.com/docs/api-reference/images/create
 */
import type { EventInput, GeneratorOutput } from "../types";

export async function renderOpenAiCard(event: EventInput): Promise<GeneratorOutput> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");

  const prompt = [
    "Minimalist real-estate marketing background, square 1024x1024.",
    "Premium Israeli property listing aesthetic. Muted sage and cream.",
    "No text. No watermarks. No logos. Soft natural lighting. Photography style.",
    `Mood: ${event.city}, warm inviting.`,
  ].join(" ");

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      quality: "medium",
      n: 1,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const item = data.data?.[0];
  if (!item) throw new Error("OpenAI returned no image");

  let buffer: Buffer;
  if (item.b64_json) {
    buffer = Buffer.from(item.b64_json, "base64");
  } else if (item.url) {
    const r = await fetch(item.url);
    buffer = Buffer.from(await r.arrayBuffer());
  } else {
    throw new Error("OpenAI response has no image data");
  }

  return {
    buffer,
    estimatedCost: 0.04, // medium quality 1024x1024
    metadata: { model: "gpt-image-1", quality: "medium" },
  };
}
