/**
 * Generate a city-themed background image via FAL Flux Schnell.
 * Returns null on any failure — caller should fall back to raw property photo
 * or a solid color background.
 *
 * Pricing: $0.003 per image. Cached at edge so this is hit ~once per event
 * per day after first render.
 */
import { cityBackgroundPrompt } from "./prompt";

const MODEL_ID = "fal-ai/flux/schnell";

export async function generateAiBackground(city: string): Promise<string | null> {
  const key = process.env.FAL_KEY;
  if (!key) return null;

  try {
    const prompt = cityBackgroundPrompt(city);
    const submit = await fetch(`https://queue.fal.run/${MODEL_ID}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_size: "square_hd",
        num_images: 1,
      }),
    });
    if (!submit.ok) return null;

    const submitData = (await submit.json()) as {
      status_url?: string;
      response_url?: string;
    };
    const statusUrl = submitData.status_url;
    if (!statusUrl) return null;

    // Poll up to 30s
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const status = await fetch(statusUrl, {
        headers: { Authorization: `Key ${key}` },
      });
      if (!status.ok) continue;
      const sdata = (await status.json()) as {
        status?: string;
        response_url?: string;
      };
      if (sdata.status === "COMPLETED") {
        const resultUrl = sdata.response_url ?? submitData.response_url;
        if (!resultUrl) return null;
        const result = await fetch(resultUrl, {
          headers: { Authorization: `Key ${key}` },
        });
        if (!result.ok) return null;
        const rdata = (await result.json()) as {
          images?: Array<{ url?: string }>;
        };
        return rdata.images?.[0]?.url ?? null;
      }
      if (sdata.status === "ERROR" || sdata.status === "FAILED") return null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch an image URL and return as data URL — ImageResponse can't follow
 * external URLs reliably in some runtimes, so inline everything as data URLs.
 */
export async function urlToDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const mime = res.headers.get("content-type") || "image/png";
    const buf = await res.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    return `data:${mime};base64,${b64}`;
  } catch {
    return null;
  }
}
