---
name: openhouse-test-suite
description: Comprehensive end-to-end + regression test suite for OpenHouseMap. Use whenever the user wants to verify the whole product works, after big refactors, before launch, or to chase a "something broke" report. Covers geocode hebrew prefix bugs, RTL desktop layout, popup, mobile bottom sheet, RSVP, favourites, dashboard tabs, photo upload, AI description, and Israeli legal-pages presence.
---

# OpenHouseMap full test suite

Use this skill to drive a methodical pass over every flow the product supports. Each block is independently runnable. Report results as a markdown table to the user at the end with green ✓ / red ✗ per check.

## Pre-flight

```bash
# Production is live + responding
curl -sI https://www.openhousemap.online/ | grep -E "HTTP|cache"
# Latest deploy bundles loaded
curl -s https://www.openhousemap.online/ | grep -oE '/_next/static/chunks/[^"]*\.js' | head -3
```

## 1. Geocode API — hebrew prefix matching

These are the biggest production bugs we've hit. Always run after any change to `app/api/geocode/route.ts` or `data/il-cities.json`.

```bash
# Top 10 majors — all must return canonical hebrew name
for q in חדרה תל-אביב ירושלים חיפה "באר שבע" "ראשון לציון" "פרדס חנה" "זכרון יעקב" אילת נצרת; do
  encoded=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote('$q'))")
  res=$(curl -s "https://www.openhousemap.online/api/geocode?q=${encoded}&type=city")
  count=$(echo "$res" | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('features',[])))")
  first=$(echo "$res" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['features'][0]['place_name'] if d.get('features') else 'MISSING')")
  echo "  $q → $count results, top: $first"
done
```

```bash
# Hebrew partial prefix — must surface the full city
# "חדר" → "חדרה" expected
for q in חדר תל יר חיפ באר ראש פר זכ; do
  encoded=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote('$q'))")
  res=$(curl -s "https://www.openhousemap.online/api/geocode?q=${encoded}&type=city")
  first=$(echo "$res" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['features'][0]['place_name'] if d.get('features') else 'EMPTY')")
  echo "  partial '$q' → $first"
done
```

```bash
# Address search inside a city — common cases
curl -s "https://www.openhousemap.online/api/geocode?q=$(python3 -c "import urllib.parse;print(urllib.parse.quote('בן גוריון 35'))")&type=address&city=$(python3 -c "import urllib.parse;print(urllib.parse.quote('זכרון יעקב'))")&near=32.5712,34.9530" | python3 -m json.tool | head -30
```

PASS criteria: every full-name search returns at least 1 result. Every partial (3+ char) prefix returns the corresponding full city as top hit.

## 2. Homepage map — public flow

Use the playwright skill OR claude-in-chrome MCP. Resize viewport to mobile (393x852) AND desktop (1440x900) and re-run.

- [ ] Page loads under 3s on a cold visit
- [ ] Map tiles render (CartoDB Voyager)
- [ ] Pins/clusters visible (≥1 cluster for current dataset)
- [ ] Mobile: bottom sheet collapsed at 72px showing "N בתים פתוחים" + `+ Open House` leading action when realtor
- [ ] Mobile: top chrome = brand chip (right in RTL) + profile FAB (left in RTL); no Leaflet zoom buttons overlapping
- [ ] Desktop: sidebar on VISUAL RIGHT in RTL (DOM-first child); map on visual left; sidebar header has `+ Open House` + profile pill aligned right
- [ ] Tap on cluster → leaflet auto-zooms to expand
- [ ] Tap on individual pin → EventPopup opens

## 3. EventPopup

- [ ] `סגור` pill labeled X visible at top of popup (NOT covered by drag handle on mobile)
- [ ] Drag handle ABOVE the close pill on mobile, swipe down still works
- [ ] Photo gallery scrolls + counter shows "1 / 6" (dir=ltr — NOT "6 / 1")
- [ ] Date pill icon then "YYYY-MM-DD · HH:MM–HH:MM" (start time on left)
- [ ] Price h2 is font-bold + tracking-tight
- [ ] Address `font-semibold text-lg`
- [ ] Visibility chip color matches (green / gold / red)
- [ ] RSVP buttons (אגיע / אולי / לא) render with Lucide icons (Check / HelpCircle / X), not emoji
- [ ] Favourite ★ button: tap toggles fill (gold filled when fav, outline when not), 3 taps in a row all work (state-ref bug protection)
- [ ] Waze deep link points to `waze.com/ul?q=<encoded address>&navigate=yes`
- [ ] WhatsApp share link points to `wa.me/?text=...`
- [ ] `פרטים מלאים` link → `/e/{id}` SSR detail page
- [ ] Desktop: popup floats on VISUAL LEFT (not overlapping sidebar)

## 4. Event detail SSR `/e/{id}`

- [ ] HTTP 200 even for visibility=mixed/colleagues events (not just public)
- [ ] OG metadata: `<title>Open House — {address} | {price}</title>`
- [ ] Hero: text-5xl bold price, address below, visibility chip top-right
- [ ] Date pill correct order (start–end)
- [ ] Stats grid: each card has a Lucide icon (Sofa / Ruler / Layers / etc.) above the value
- [ ] Description block: FileText icon next to "תיאור" heading
- [ ] Realtor block: User icon next to name, Briefcase next to office, BadgeCheck next to license
- [ ] Action row: Navigation2 (Waze) / MessageCircle (WhatsApp) / CalendarPlus (ICS) — Lucide, not emoji
- [ ] Mobile: stats grid-cols-2; Desktop: grid-cols-4
- [ ] Photo gallery same checks as popup, lightbox: tap any photo opens fullscreen; tap on dark backdrop closes (not just X)

## 5. Create form `/create`

Requires verified realtor / admin session.

- [ ] H1 "Open House" with eyebrow "פרסום אירוע" — NOT "Open House חדש"
- [ ] Property type chips: 7 types
- [ ] City autocomplete: hebrew query → hebrew suggestions only, no English. "חדר" → "חדרה" appears.
- [ ] Address picker disabled until city chosen
- [ ] Address search after city: returns streets in city. Number suffix optional — falls back to street-level coords if exact number not found
- [ ] Map preview centers on selected city/address with draggable pin
- [ ] Photo upload: rejects DNG/RAW with hebrew error, accepts JPEG/PNG/HEIC up to 10MB
- [ ] Submit: validates price > 0, date, address; shows hebrew error inline if invalid; auto-geocodes on submit if no pin
- [ ] Successful submit → redirect to `/e/{id}` showing the new event

## 6. Dashboard `/dashboard`

- [ ] Header: "שלום" eyebrow + display name + role pill (admin / verified) with Lucide icons
- [ ] Action row: Map / Plus / LogOut icons; "+ Open House" for realtors only
- [ ] Stat cards ARE the tabs (no duplicate nav row); active card has moss bg + ivory text
- [ ] Tab "אני אגיע": shows events user RSVPed to, sorted by date, split into קרובים / היסטוריה
- [ ] Tab "מועדפים": shows ★-saved events
- [ ] Tab "האירועים שלי" (realtors): shows own events with per-event RSVP attendee list (`✓ משה כהן · Cohen Realty`)
- [ ] Empty states: gradient background, friendly hebrew text, CTA to map

## 7. Authentication

- [ ] Anonymous user can browse map + open popups
- [ ] Unauthenticated tap on ★ Favourite → `/login?next=/e/{id}`
- [ ] Unauthenticated tap on RSVP → `/login?next=/e/{id}?rsvp=<status>`
- [ ] Signed-in but unverified → `/register?next=...` (license verification flow)
- [ ] `/login` page renders Google sign-in button (popup, not redirect)
- [ ] Sign-out from dashboard → redirect to `/`

## 8. Israeli legal pages (PRE-LAUNCH)

- [ ] `/privacy` — Privacy Policy in hebrew (חוק הגנת הפרטיות)
- [ ] `/terms` — Terms of Service in hebrew
- [ ] `/accessibility` — IS 5568 statement with named coordinator + contact
- [ ] `/cookies` — Cookie policy
- [ ] Footer links present on every public page
- [ ] License verification via data.gov.il `verifyLicense` Cloud Function works

These pages must exist before public launch. Beta with known testers is OK without them.

## 9. Performance

- [ ] Lighthouse mobile Performance ≥ 80
- [ ] Lighthouse Accessibility ≥ 95
- [ ] Lighthouse SEO ≥ 90
- [ ] Initial JS bundle < 250KB compressed
- [ ] No CLS on initial paint (map placeholder skeleton)

```bash
# Quick bundle size check
curl -s https://www.openhousemap.online/_next/static/chunks/main.js | wc -c
```

## 10. Reporting

After every run, output a single markdown table to the user with:
- Section | check | result | notes

Then commit any seed-data refreshes:

```bash
GOOGLE_APPLICATION_CREDENTIALS=.serviceAccountKey.json npx tsx tools/seed-events.ts
GOOGLE_APPLICATION_CREDENTIALS=.serviceAccountKey.json npx tsx tools/seed-photos.ts
GOOGLE_APPLICATION_CREDENTIALS=.serviceAccountKey.json npx tsx tools/seed-test-rsvps.ts
```
