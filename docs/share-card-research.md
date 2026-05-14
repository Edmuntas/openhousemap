# Share Card Generation — Model Comparison & Pricing

**Last updated:** 2026-05-14
**Goal:** Pick the best stack for generating shareable property cards (Instagram 1080×1080, WhatsApp Status 1080×1920, OG 1200×630) that:

1. Render hebrew text correctly
2. Composite with realtor logo
3. Are downloadable + shareable
4. Stay affordable at MVP scale (10-50 events/day)

> ⚠️ **Prices below are reconstructed from each provider's public pricing page at time of writing.** Verify current pricing on the provider's site before committing — they change frequently.

---

## TL;DR — Recommended stack

| Layer | Tool | Why |
|---|---|---|
| **Hebrew text + logo overlay** | **Vercel OG (`next/og`) — already in stack** | Free, perfect typography, deterministic, $0 |
| **Background image** | **Property photo from Firebase (current)** | $0, already uploaded by realtor |
| **AI-generated backgrounds (optional, Phase 2)** | **Gemini 2.5 Flash Image** ("Nano Banana") | $0.039/image, best value, good with composition |

**Don't use AI to render Hebrew text directly.** Every model is unreliable with Hebrew. Always overlay text via Satori (Vercel OG) on top of either a property photo or an AI background.

---

## Why pure AI image generation fails for OUR use case

Two big issues:

1. **Hebrew text rendering is unreliable across ALL models.** Even Ideogram (best-in-class for text) makes character substitution mistakes 30-50% of the time with Hebrew. Property cards need exact prices like `₪4,500,000` and addresses — no room for hallucination.
2. **Brand consistency.** AI generates different output every time. We need predictable, on-brand cards. Same template, different content.

**Hybrid solution wins:**
- Compose card structure (typography, layout, colors, logo placement) via deterministic Satori
- Use AI only for *aesthetic backgrounds* if we want fancier visuals than raw photos

---

## Model-by-model breakdown

### Category A — Pure API, pay-per-image

| Model | Cost/image (USD) | Hebrew text | Use case | Notes |
|---|---|---|---|---|
| **Gemini 2.5 Flash Image** ("Nano Banana") | $0.039 | ⚠️ ~60% accuracy | Best value composition | Released as `gemini-2.5-flash-image` |
| **Imagen 3** (Vertex AI) | $0.04 | ⚠️ ~50% accuracy | High-quality, slower | Available via Google Cloud |
| **GPT-image-1** (OpenAI) | $0.04 – $0.17 | ⚠️ ~50% accuracy | Strong realism, expensive | `gpt-image-1` model |
| **Ideogram 3.0 API** | $0.05 – $0.08 | ⚠️ Best-in-class but still ~60% | Specifically designed for text | Has Magic Prompt feature |
| **Stable Diffusion XL** (Replicate) | $0.003 – $0.005 | ❌ Very poor | Cheap backgrounds only | Self-host for $0 with GPU |
| **Flux Schnell** (Replicate / BlackForestLabs) | $0.003 | ❌ Very poor for non-Latin | Cheapest fast model | Pro variant at $0.055 |
| **Flux Pro 1.1** (Replicate) | $0.04 | ⚠️ Improving | High quality | |
| **Adobe Firefly Services API** | $0.015 – $0.10 | ⚠️ Hebrew partial | Enterprise tier | Requires Adobe enterprise contract |

### Category B — Flat-rate subscriptions with script automation

These give a **monthly bucket of generations** with API access, so you can automate scripts at predictable cost.

| Service | Plan | Cost/mo | Included | Best for |
|---|---|---|---|---|
| **Leonardo.ai** | Apprentice | **$10/mo** | 8,500 fast tokens (~150-200 images) + API access | Backgrounds, varied styles |
| **Leonardo.ai** | Artisan | $24/mo | 25,000 tokens (~600 images) + API | Higher volume |
| **Ideogram** | Basic | **$8/mo** annual ($16 monthly) | 400 priority generations + API | Best for text-heavy cards |
| **Ideogram** | Plus | $20/mo annual | 1,000 priority + API | Text quality optimization |
| **Recraft** | Basic | $12/mo | 800 credits + API | Vector + raster + brand colors |
| **Krea.ai** | Basic | $10/mo | 1,000 generations + API beta | Realistic photo style |
| **Stability AI** | Pro | $20/mo | 1,250 credits + API | Stable Diffusion ecosystem |

### Category C — Subscriptions WITHOUT clean API (require browser automation = TOS risk)

❌ **Not recommended for production**, but listed for completeness:

| Service | Plan | Cost/mo | Why not |
|---|---|---|---|
| ChatGPT Plus (DALL-E + gpt-image-1) | $20/mo | ~50 imgs/3h | Browser automation breaks TOS |
| Gemini Advanced | $20/mo | Imagen 3 in chat | No legit script automation |
| Midjourney Basic | $10/mo | 200 imgs | Discord-only, no API in Basic |
| Adobe Firefly (consumer) | $5-10/mo | ~100 credits | Limited API on consumer plans |

### Category D — Template composition (NO AI generation, deterministic)

| Tool | Cost | Hebrew | Use case |
|---|---|---|---|
| **Vercel OG / `next/og`** | **$0 (already in stack)** | ✅ Perfect | Recommended baseline |
| **Bannerbear API** | $99-149/mo unlimited | ✅ Perfect | Drag-and-drop templates |
| **Placid API** | $19-79/mo | ✅ Perfect | Template marketplace |
| **Canva API** | $1/user/mo + per-call | ✅ Perfect | Has real estate templates |
| **Cloudinary transformations** | $89/mo | ✅ Perfect | Image transforms via URL params |
| **Sharp.js / Jimp** | $0 self-host | ✅ Perfect | Programmatic composition |

---

## Cost simulation at OpenHouseMap scale

**Assumptions:** Each event generates 3 share cards (square, story, OG). 30 events/month at MVP. 300 events/month at scale.

| Stack | MVP cost/mo (90 cards) | Scale cost/mo (900 cards) | Hebrew quality |
|---|---|---|---|
| Vercel OG only | **$0** | **$0** | ✅ Perfect |
| Vercel OG + Gemini 2.5 Flash bg | $3.50 | $35 | ✅ Perfect (Hebrew via Satori) |
| Vercel OG + Flux Schnell bg | $0.27 | $2.70 | ✅ Perfect (Hebrew via Satori) |
| Vercel OG + Leonardo.ai sub | $10 fixed (under budget) | $10 fixed | ✅ Perfect |
| Vercel OG + Ideogram Basic | $8 fixed | $8 fixed | ✅ Perfect |
| Bannerbear (no AI) | $99 | $99 | ✅ Perfect |
| Pure Ideogram API | $4.50 – $7.20 | $45 – $72 | ⚠️ Mixed |
| Pure Gemini Flash Image | $3.50 | $35 | ⚠️ Mixed |

---

## My recommendation

### Phase 1 — Ship NOW: Vercel OG baseline (FREE)

Build 3 endpoints using the `next/og` infrastructure already in the repo:

```
/api/share-card/[eventId]?format=square   → 1080×1080
/api/share-card/[eventId]?format=story    → 1080×1920
/api/share-card/[eventId]?format=og       → 1200×630
```

Each composes: property photo (background) → dark gradient overlay → price (huge bold) → address → date/time → realtor logo (corner) → OpenHouseMap brand mark.

**Cost: $0. Hebrew: perfect. Deterministic.** Ships in 1 day.

Add download + share buttons on `/e/[eventId]`. Adds a `📤 שתף` button on each dashboard event card.

### Phase 2 — When marketing demands "wow" backgrounds: add Leonardo.ai $10/mo

When you decide the raw-photo backgrounds aren't fancy enough, **buy Leonardo.ai Apprentice plan ($10/mo)** and use their API:

- 8,500 fast tokens = ~150-200 backgrounds/month
- Use prompts like "minimal pastel illustration of a sunlit balcony, modern flat design" → use as background instead of property photo for premium feel
- Hebrew text still rendered by Satori on top

Why Leonardo over alternatives:
- ✅ $10/mo flat = predictable budget
- ✅ Legit API access (not browser automation)
- ✅ Style consistency via model presets
- ✅ Plenty of credits for MVP

### Phase 3 — When volume justifies: consider Gemini 2.5 Flash Image per-call

If usage grows past Leonardo's monthly bucket, switch to Gemini 2.5 Flash Image API:
- $0.039/image flat
- Google AI Studio account (free tier first ~100 imgs)
- Better composition quality than most $/image alternatives

### What to AVOID

- ❌ Don't rely on AI for Hebrew text rendering — overlay via Satori instead
- ❌ Don't pay $99+/mo for Bannerbear at MVP scale — Vercel OG gets you there free
- ❌ Don't try to automate ChatGPT Plus / Midjourney via browser — TOS risk + flaky
- ❌ Don't use SVG-only image generators — most platforms reject SVG (WhatsApp, FB)

---

## Things still to verify (when picking final stack)

1. **Hebrew accuracy benchmark** — generate 10 cards from each model, count how many render exact prices correctly. Use `tools/share-card-lab/` (next section).
2. **Style preference** — even with perfect Hebrew text overlay, the AI-generated *backgrounds* differ in vibe. User preference matters.
3. **Generation latency** — Vercel OG = <500ms. AI models = 2-10s. For real-time generation during share, latency matters.
4. **Caching strategy** — cards should cache at edge after first generation. Vercel OG does this automatically.

---

## Comparison tool — see `tools/share-card-lab/`

Run locally to test multiple providers on the same event:

```bash
# Generate baseline (Vercel OG) — no keys needed
npx tsx tools/share-card-lab/compare.ts --event=<eventId>

# With API keys (any subset):
GOOGLE_AI_API_KEY=... \
OPENAI_API_KEY=... \
IDEOGRAM_API_KEY=... \
LEONARDO_API_KEY=... \
  npx tsx tools/share-card-lab/compare.ts --event=<eventId>
```

Outputs a folder `tools/share-card-lab/output/<eventId>/<provider>/...` with side-by-side comparison + an `index.html` viewer.

---

## Decision log

Pending — fill in after running the comparison tool:

- [ ] Hebrew text quality verified across N=10 samples for each model
- [ ] Style preference picked (raw photo vs AI background)
- [ ] Production stack chosen
- [ ] First subscription (if any) signed up at openhousemap@gmail.com
- [ ] Production endpoint deployed at /api/share-card/[eventId]
