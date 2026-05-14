/**
 * FAL.AI — unified aggregator for many image-gen models behind one API.
 *
 * One FAL_KEY env var unlocks all hosted models. Pricing varies per model
 * (see https://fal.ai/models). The lab registers multiple "generator"
 * entries that all call this function with different modelIds.
 *
 * Docs: https://fal.ai/docs/clients/javascript
 * Note: we use the REST API directly (no fal-client SDK) to keep deps light.
 */
import type { EventInput, GeneratorOutput } from "../types";

interface FalSubmitResponse {
  request_id?: string;
  status_url?: string;
  response_url?: string;
}

interface FalResultResponse {
  images?: Array<{ url?: string; content_type?: string }>;
  image?: { url?: string };
  data?: { images?: Array<{ url?: string }>; image?: { url?: string } };
}

/** Build the prompt — same wording across models for fair comparison. */
function backgroundPrompt(event: EventInput): string {
  return [
    "Minimalist real-estate marketing background photo.",
    "Premium Israeli property listing aesthetic.",
    "Muted sage green and warm cream palette.",
    "Soft natural daylight. Architectural detail abstract.",
    "No text. No watermarks. No logos.",
    "Photography style, not illustration. Square 1:1 framing.",
    `Subject mood: ${event.city}, mid-day, inviting.`,
  ].join(" ");
}

export interface FalModelConfig {
  modelId: string;       // e.g. "fal-ai/flux/schnell"
  estimatedCost: number; // USD per image
  /** Extra body params per model (image_size, num_inference_steps, etc.) */
  extraInput?: Record<string, unknown>;
}

export async function renderFalCard(
  event: EventInput,
  cfg: FalModelConfig
): Promise<GeneratorOutput> {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY not set");

  const prompt = backgroundPrompt(event);
  const submitUrl = `https://queue.fal.run/${cfg.modelId}`;

  const submit = await fetch(submitUrl, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_size: "square_hd", // 1024x1024 for most models; some accept "square"
      num_images: 1,
      ...cfg.extraInput,
    }),
  });

  if (!submit.ok) {
    const body = await submit.text();
    throw new Error(`FAL submit ${submit.status} for ${cfg.modelId}: ${body.slice(0, 300)}`);
  }
  const submitData = (await submit.json()) as FalSubmitResponse;
  const statusUrl = submitData.status_url;
  if (!statusUrl) throw new Error(`FAL: no status_url in submit response`);

  // Poll status (FAL is async-via-queue)
  let resultUrl: string | null = null;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const status = await fetch(statusUrl, {
      headers: { Authorization: `Key ${key}` },
    });
    if (!status.ok) continue;
    const sdata = (await status.json()) as { status?: string; response_url?: string };
    if (sdata.status === "COMPLETED") {
      resultUrl = sdata.response_url ?? submitData.response_url ?? null;
      break;
    }
    if (sdata.status === "ERROR" || sdata.status === "FAILED") {
      throw new Error(`FAL job ${sdata.status} for ${cfg.modelId}`);
    }
  }
  if (!resultUrl) throw new Error(`FAL polling timeout for ${cfg.modelId}`);

  const result = await fetch(resultUrl, {
    headers: { Authorization: `Key ${key}` },
  });
  if (!result.ok) {
    const body = await result.text();
    throw new Error(`FAL result fetch ${result.status}: ${body.slice(0, 300)}`);
  }
  const rdata = (await result.json()) as FalResultResponse;

  // Different FAL endpoints return slightly different shapes; pick the first
  // image URL we can find.
  const imageUrl =
    rdata.images?.[0]?.url ??
    rdata.image?.url ??
    rdata.data?.images?.[0]?.url ??
    rdata.data?.image?.url ??
    null;
  if (!imageUrl) {
    throw new Error(`FAL: no image URL in result for ${cfg.modelId}`);
  }

  const img = await fetch(imageUrl);
  if (!img.ok) throw new Error(`FAL CDN fetch failed: ${img.status}`);
  const buffer = Buffer.from(await img.arrayBuffer());

  return {
    buffer,
    estimatedCost: cfg.estimatedCost,
    metadata: { provider: "fal.ai", model: cfg.modelId },
  };
}
