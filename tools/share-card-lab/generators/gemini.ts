/**
 * Gemini 2.5 Flash Image ("Nano Banana") — Google AI Studio API.
 * Approach: ask the model to generate a clean property-marketing background
 * (NO text — text overlay is done via baseline Satori in production).
 *
 * Pricing: $0.039 per image as of 2026-05.
 * Docs: https://ai.google.dev/gemini-api/docs/image-generation
 */
import type { EventInput, GeneratorOutput } from "../types";

export async function renderGeminiCard(event: EventInput): Promise<GeneratorOutput> {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_AI_API_KEY not set");

  const prompt = buildBackgroundPrompt(event);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data: string; mimeType: string } }> } }>;
  };
  const inline = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
  if (!inline) {
    throw new Error("Gemini returned no image data");
  }
  const buffer = Buffer.from(inline.data, "base64");

  return {
    buffer,
    estimatedCost: 0.039,
    metadata: { model: "gemini-2.5-flash-image", mimeType: inline.mimeType },
  };
}

function buildBackgroundPrompt(event: EventInput): string {
  // English prompt — Gemini is more reliable in English. We're asking for a
  // BACKGROUND only — final text/logo overlay happens via Satori on top.
  return [
    "Generate a 1080x1080 minimalist real-estate marketing background image",
    "in the style of premium Israeli property listings.",
    "Subtle muted sage and cream tones. Soft natural lighting.",
    "No text, no watermarks, no logos. Architectural detail abstract.",
    `Mood: ${event.city} mid-day, warm and inviting.`,
    "Photography style, not illustration. Square aspect ratio.",
  ].join(" ");
}
