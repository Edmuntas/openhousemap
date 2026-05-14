/**
 * Baseline generator: Vercel OG / Satori — same infrastructure that powers
 * our /api/share-card endpoint in production. $0 per generation, perfect
 * hebrew, deterministic.
 *
 * We use the standalone `satori` + `@resvg/resvg-js` packages locally so
 * the same JSX renders identically server-side and in this lab tool.
 */
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { EventInput, GeneratorOutput } from "../types";

const SIZE = 1080;

// Load BOTH hebrew and latin Rubik subsets so satori finds a glyph for
// every codepoint we throw at it. Hebrew subset covers hebrew letters,
// latin subset covers digits + ₪ + brand name + brand URL. Satori picks
// the right glyph per char automatically.
let cachedFonts: { name: string; data: Buffer; weight: 500 | 700; style: "normal" }[] | null = null;
async function loadFonts() {
  if (cachedFonts) return cachedFonts;
  const base = "node_modules/@fontsource/rubik/files";
  // Satori falls through the list per-glyph: it tries each font for a
  // codepoint until it finds one that has it. So we register Latin FIRST
  // (digits + ₪ + brand URL chars) then Hebrew (hebrew letters).
  const fonts: { name: string; data: Buffer; weight: 500 | 700; style: "normal" }[] = [
    { name: "Rubik", data: readFileSync(join(process.cwd(), base, "rubik-latin-500-normal.woff")), weight: 500, style: "normal" },
    { name: "Rubik", data: readFileSync(join(process.cwd(), base, "rubik-latin-700-normal.woff")), weight: 700, style: "normal" },
    { name: "Rubik", data: readFileSync(join(process.cwd(), base, "rubik-hebrew-500-normal.woff")), weight: 500, style: "normal" },
    { name: "Rubik", data: readFileSync(join(process.cwd(), base, "rubik-hebrew-700-normal.woff")), weight: 700, style: "normal" },
  ];
  cachedFonts = fonts;
  return fonts;
}

/**
 * Fetch a remote image as a data URL so satori can embed it.
 * Returns null if the image can't be fetched (logo missing / CORS / 404).
 */
async function urlToDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const mime = res.headers.get("content-type") || "image/png";
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

// Pre-reverse hebrew strings for Satori (it doesn't apply Unicode bidi)
function reverseHebrew(s: string): string {
  return s.split("").reverse().join("");
}

function formatPriceShort(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `₪${m % 1 === 0 ? m : m.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 1000) return `₪${Math.round(n / 1000)}K`;
  return `₪${n}`;
}

export async function renderBaselineCard(event: EventInput): Promise<GeneratorOutput> {
  void readFileSync;
  void join;
  const fonts = await loadFonts();
  const brandColor = event.realtor.brandColor || "#4A6E30";
  // Satori's <img> can't follow remote URLs in node — fetch + inline as data:
  const [photoDataUrl, logoDataUrl] = await Promise.all([
    urlToDataUrl(event.photoUrl),
    urlToDataUrl(event.realtor.logoUrl),
  ]);
  const photoUrl = photoDataUrl;
  const logoUrl = logoDataUrl;

  const jsx: React.ReactElement = {
    type: "div",
    props: {
      style: {
        width: SIZE,
        height: SIZE,
        display: "flex",
        flexDirection: "column",
        background: "#141C0A",
        position: "relative",
      },
      children: [
        // Background photo
        photoUrl && {
          type: "img",
          key: "bg",
          props: {
            src: photoUrl,
            width: SIZE,
            height: SIZE,
            style: {
              position: "absolute",
              inset: 0,
              objectFit: "cover",
              width: "100%",
              height: "100%",
            },
          },
        },
        // Dark gradient overlay for legibility
        {
          type: "div",
          key: "grad",
          props: {
            style: {
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(20,28,10,0.10) 0%, rgba(20,28,10,0.05) 40%, rgba(20,28,10,0.85) 100%)",
              display: "flex",
            },
          },
        },
        // Top brand strip
        {
          type: "div",
          key: "top",
          props: {
            style: {
              position: "absolute",
              top: 36,
              left: 36,
              right: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            },
            children: [
              {
                type: "div",
                key: "brand",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "rgba(246,248,242,0.95)",
                    borderRadius: 999,
                    padding: "10px 18px",
                  },
                  children: [
                    {
                      type: "span",
                      key: "dot",
                      props: {
                        style: {
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          background: brandColor,
                          display: "flex",
                        },
                      },
                    },
                    {
                      type: "span",
                      key: "name",
                      props: {
                        style: { fontSize: 22, fontWeight: 700, color: "#141C0A" },
                        children: "openhousemap.online",
                      },
                    },
                  ],
                },
              },
              logoUrl && {
                type: "img",
                key: "logo",
                props: {
                  src: logoUrl,
                  width: 80,
                  height: 80,
                  style: {
                    width: 80,
                    height: 80,
                    borderRadius: 16,
                    background: "white",
                    objectFit: "contain",
                  },
                },
              },
            ].filter(Boolean),
          },
        },
        // Bottom content block (price + address + date)
        {
          type: "div",
          key: "bot",
          props: {
            style: {
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "44px 48px 56px",
              display: "flex",
              flexDirection: "column",
            },
            children: [
              {
                type: "div",
                key: "date",
                props: {
                  style: {
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#EAA830",
                    marginBottom: 14,
                    letterSpacing: "0.04em",
                    display: "flex",
                  },
                  children: `${event.date} · ${event.startTime}–${event.endTime}`,
                },
              },
              {
                type: "div",
                key: "price",
                props: {
                  style: {
                    fontSize: 132,
                    fontWeight: 700,
                    color: "#F6F8F2",
                    lineHeight: 1,
                    marginBottom: 20,
                    letterSpacing: "-0.02em",
                    display: "flex",
                  },
                  children: formatPriceShort(event.price),
                },
              },
              {
                type: "div",
                key: "addr",
                props: {
                  style: {
                    fontSize: 44,
                    fontWeight: 700,
                    color: "#F6F8F2",
                    marginBottom: 10,
                    display: "flex",
                  },
                  children: reverseHebrew(event.address),
                },
              },
              event.rooms && {
                type: "div",
                key: "rooms",
                props: {
                  style: {
                    fontSize: 28,
                    fontWeight: 500,
                    color: "rgba(246,248,242,0.8)",
                    display: "flex",
                  },
                  children: `${event.rooms} ${reverseHebrew("חד׳")}${event.size ? ` · ${event.size}m²` : ""}`,
                },
              },
            ].filter(Boolean),
          },
        },
      ].filter(Boolean),
    },
  } as React.ReactElement;

  const svg = await satori(jsx, { width: SIZE, height: SIZE, fonts });
  const png = new Resvg(svg, { background: "#141C0A" }).render().asPng();

  return {
    buffer: png,
    estimatedCost: 0,
    metadata: { engine: "satori + resvg-js" },
  };
}
