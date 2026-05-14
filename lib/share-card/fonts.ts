/**
 * Lazy-load Rubik (Hebrew + Latin subsets) fonts for ImageResponse rendering.
 * Cached at module scope so subsequent requests reuse the loaded buffers.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Weight = 400 | 500 | 700;

interface LoadedFont {
  name: "Rubik";
  data: Buffer;
  weight: Weight;
  style: "normal";
}

let cached: LoadedFont[] | null = null;

export function loadShareCardFonts(): LoadedFont[] {
  if (cached) return cached;
  const base = join(process.cwd(), "node_modules/@fontsource/rubik/files");
  const fonts: LoadedFont[] = [
    { name: "Rubik", data: readFileSync(join(base, "rubik-latin-500-normal.woff")), weight: 500, style: "normal" },
    { name: "Rubik", data: readFileSync(join(base, "rubik-latin-700-normal.woff")), weight: 700, style: "normal" },
    { name: "Rubik", data: readFileSync(join(base, "rubik-hebrew-500-normal.woff")), weight: 500, style: "normal" },
    { name: "Rubik", data: readFileSync(join(base, "rubik-hebrew-700-normal.woff")), weight: 700, style: "normal" },
  ];
  cached = fonts;
  return fonts;
}
