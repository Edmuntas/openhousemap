# Share-card lab

Local CLI to generate the same property card via multiple AI image models
side-by-side. Outputs are saved into `output/<eventId>/` and an HTML
viewer is generated for easy visual comparison.

## Why

Hebrew text rendering is the bottleneck. The baseline (Vercel OG / Satori)
always wins on text accuracy. The lab lets us test whether AI backgrounds
add enough visual punch to justify the cost vs. raw property photos.

## Setup

```bash
# Install dependencies (one-time)
npm install satori @resvg/resvg-js
```

`firebase-admin` and `tsx` are already in the repo.

## Usage

### Baseline only (no AI keys needed)

```bash
GOOGLE_APPLICATION_CREDENTIALS=.serviceAccountKey.json \
  npx tsx tools/share-card-lab/compare.ts --event=<eventId>
```

Generates Vercel OG card only. $0 cost. Use this to verify the pipeline.

### Full comparison (with AI keys)

Add any subset of these env vars — only those with keys will run:

```bash
GOOGLE_APPLICATION_CREDENTIALS=.serviceAccountKey.json \
GOOGLE_AI_API_KEY=... \
OPENAI_API_KEY=... \
IDEOGRAM_API_KEY=... \
LEONARDO_API_KEY=... \
  npx tsx tools/share-card-lab/compare.ts --event=<eventId>
```

Outputs are saved to `tools/share-card-lab/output/<eventId>/`:
- `baseline-vercel-og.png`
- `gemini-2.5-flash-image.png` (if key set)
- `gpt-image-1.png` (if key set)
- `ideogram-3.png` (if key set)
- `leonardo-phoenix.png` (if key set)
- `index.html` — open this in browser to see side-by-side comparison

## Adding a provider

1. Create `tools/share-card-lab/generators/<name>.ts` exporting an
   `async function render*Card(event: EventInput): Promise<GeneratorOutput>`
2. Add an entry to `ALL_GENERATORS` in `compare.ts` with the env var name
3. Update `docs/share-card-research.md` pricing row

## Cost so far

Run the tool, check the printed totals at the end. The HTML viewer also
shows per-card cost.

## API key sources

| Provider | Where to get key | Pricing reminder |
|---|---|---|
| Gemini 2.5 Flash Image | https://aistudio.google.com/apikey | $0.039/image |
| OpenAI gpt-image-1 | https://platform.openai.com/api-keys | $0.04/medium |
| Ideogram | https://ideogram.ai/api (Basic plan $8/mo) | $0.05-0.08/image OR sub |
| Leonardo.ai | https://app.leonardo.ai/api (Apprentice $10/mo) | included in sub |

See `docs/share-card-research.md` for full pricing analysis.
