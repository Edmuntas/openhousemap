---
name: openhouse-mobile-test
description: Playwright recipe for testing OpenHouseMap UX on iPhone 17 Pro viewport (393x852). Use after mobile UI changes — map, bottom sheet, popup, dashboard responsive flows.
---

# Test mobile UX on iPhone 17 Pro viewport

## Setup

iPhone 17 Pro device size: **393 × 852** dpr 3.

```js
await page.setViewportSize({ width: 393, height: 852 });
```

## Key flows to verify

1. **Homepage** — fullscreen map, brand chip on top under Dynamic Island (not behind it), bottom sheet 58px collapsed
2. **Cluster tap** — auto-zoom to expanded pins
3. **Pin tap** → popup as bottom sheet up to 85vh, drag handle on top, X + ★ in corner
4. **Drag handle swipe down** — popup closes (touchstart/move/end > 80px translate)
5. **★ tap when signed-out** — redirect `/login?next=/e/{id}`
6. **★ tap when signed-in** — flip gold, doc created in `/favourites/{userId__eventId}`
7. **RSVP buttons** — three coloured states (green/gold/red), tapping active toggles off
8. **פרטים מלאים** link — navigate to `/e/{id}` SSR detail page
9. **Tap on map background while popup open** → wait, popup stays. **Tap on backdrop of lightbox** → closes
10. **Sheet expanded (half/full)** + tap on map → sheet collapses

## Heuristics for catching bugs

- `getComputedStyle(button).pointerEvents` should never be `none` on actionable controls
- Sheet collapsed height should be ≤60px (was 92px with peek bug)
- Brand chip `getBoundingClientRect().top` should be ≥ ~10px (above this hides under Dynamic Island)
- After RSVP tap, listener fires within ~300ms — wait 500ms in tests before asserting

## Photo flow

Upload via Playwright file_upload — paths must be inside `.playwright-mcp/` root. To stage:

```bash
cp ~/Downloads/some-photo.jpg .playwright-mcp/test-photo.jpg
```

Then in playwright: `mcp__plugin_playwright_playwright__browser_file_upload paths=["/abs/path/.playwright-mcp/test-photo.jpg"]`.

Storage rules accept admin uploads up to 10MB. Files > 10MB fail silently — resize first via `sips -Z 1600 source.jpg --out resized.jpg`.

## Screenshots

```js
await page.screenshot({ path: "./step-X.jpg", quality: 90, type: "jpeg" });
```

The Read tool can render JPEGs back so you can verify visually.

## Pitfall

After cluster click, Leaflet zooms but you still see `.ohm-cluster-wrap` for ~500ms during animation. Wait 2s before asserting individual pins.
