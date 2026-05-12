# CLAUDE.md — OpenHouse Map
> Persistent memory bridge for Claude Code sessions
> Last updated: May 2026 | AdmontREM / Edmont

---

## 🎯 What Is This Project

**OpenHouse Map** — national map of open house events for Israeli real estate agents.

Not a listings board. A live network of events. The Israeli equivalent of MLS, built around the open house format. Platform-neutral — works for all realtors regardless of which CRM or portal they use.

**Slogan:** "כל הבתים הפתוחים — במקום אחד" / "All Open Houses — In One Place"

**Founder:** Edmont — 10 years in Israeli real estate, former realtor, understands the pain firsthand.

---

## 🏗️ Tech Stack

```
Framework:    Next.js (SSR for SEO — not React SPA)
Hosting:      Firebase Hosting + Cloud Functions (start) → Vercel Pro (at scale)
Database:     Firebase Firestore (isolated project, separate from PhotoDesk/SkyTask)
Auth:         Firebase Auth — Phone+SMS for registration, Google/Apple for login
Storage:      Firebase Storage + Resize Images Extension (auto-optimize photos)
Map:          Leaflet.js + Leaflet.markercluster + MapTiler/Stadia (C3 Sage Premium)
Geocoding:    Mapbox (100K free/month, no TOS issues with Leaflet)
Satellite:    Esri World Imagery (free toggle)
Email:        Resend (transactional + digest)
AI:           Claude API Haiku 4.5 ($1/$5 per MTok) — descriptions + social posts
i18n:         next-intl (Next.js App Router compatible, /app/[locale]/ routing)
Styling:      Tailwind CSS + CSS variables (C3 Sage Premium design tokens)
License check: data.gov.il CKAN API — auto-verify realtor license
```

### ⚠️ Critical: Leaflet + Next.js SSR
Leaflet does NOT work with SSR. Always use dynamic import:
```typescript
// MapContainer.tsx
const MapInner = dynamic(() => import('./MapInner'), { ssr: false });
```
Never import Leaflet directly in server components or pages. MapInner.tsx is client-only.

### Critical: Never put in client code
- Mapbox API key → Cloud Functions only
- Claude API key → Cloud Functions only
- Resend API key → Cloud Functions only
- Firebase Admin SDK → Cloud Functions only
- MapTiler API key → can be in client (tiles are public) — use restricted key

---

## 👥 User Roles

```
anonymous     → public events only (🟢 pins)
realtor       → all events (🟢🟡🔴) + dashboard (requires verified=true)
admin         → full platform control (custom claim: admin=true)
```

**Custom Claims (set via Admin SDK in Cloud Functions):**
```javascript
// Verify realtor:
admin.auth().setCustomUserClaims(uid, { role: 'realtor', verified: true });
// Create admin:
admin.auth().setCustomUserClaims(uid, { admin: true });
```

---

## 🔐 Event Visibility Model

| Type | Color | Who Sees |
|------|-------|----------|
| Public | 🟢 green | Everyone — no login |
| Mixed | 🟡 yellow | All (realtors see full details, public sees limited) |
| Colleagues | 🔴 red | Verified realtors only — שיתוף פעולה |

**One property can have two events:** first 🔴 for colleagues, then 🟢 for public.

---

## 🗄️ Firestore Collections

```
/users/{userId}
  - uid
  - name, surname
  - phone (reference only — do NOT store plaintext, use uid as link to Firebase Auth)
  - officeName
  - licenseNumber
  - licenseData: {name, city, status} — from data.gov.il response
  - role: 'realtor' | 'admin'
  - verificationStatus: 'pending' | 'verified' | 'rejected'
  - verified: boolean
  - licenseVerifiedAt: timestamp
  - language: 'he' | 'en' | 'ru' | 'fr'
  - emailOptIn: boolean
  - emailOptInDate: timestamp
  - digestOptIn: boolean
  - digestOptInDate: timestamp
  - createdAt, updatedAt

/events/{eventId}
  - ownerId (uid)
  - address (full text)
  - city (string — for city search/filter)
  - coordinates: {lat, lng} — final pin position after drag-drop
  - propertyType: 'apartment'|'house'|'penthouse'|'land'|'commercial'
  - price (ILS number, must be > 0)
  - rooms: number
  - bathrooms: number
  - size: number (m²)
  - floor: number (for apartments)
  - totalFloors: number
  - parking: boolean
  - mamad: boolean    — מממ"ד
  - mirpeset: boolean — מרפסת
  - photos: [{full: url, medium: url, thumb: url}, ...] (max 10 objects)
  - date: date (YYYY-MM-DD)
  - startTime: time (HH:MM)
  - endTime: time (HH:MM) — for display "17:00–19:00"
  - visibility: 'public'|'mixed'|'colleagues'
  - description: {he: string, en: string, ru: string} — AI generated
  - realtorInputText: string — realtor's original description text (input to AI)
  - status: 'active'|'cancelled'|'completed'
  - archiveStatus: 'active'|'archived' — realtor manually archives
  - cancelledAt: timestamp | null
  - completedAt: timestamp | null
  - archivedAt: timestamp | null
  - ownerBrief: string — post-event notes from owner
  - attendeesCount: number — filled after event
  - feedbackRequested: boolean — has feedback email been sent
  - mapVisible: boolean — set false by scheduler 48h after cancellation
  - geohash: string — for future geo queries (GeoFirestore), add at creation
  - realtorSnapshot: {name, surname, officeName, licenseNumber} — denormalized for display
  - createdAt, updatedAt

/rsvp/{rsvpId}
  - eventId, realtorId
  - status: 'attending'|'maybe'|'declined'
  - createdAt, updatedAt

/feedback/{feedbackId}
  - eventId, realtorId
  - priceRealistic: 1-5
  - propertyCondition: 1-5
  - locationQuality: 1-5
  - overallImpression: 1-5
  - notes: string
  - createdAt

/favourites/{favId}
  - userId, eventId
  - createdAt

/audit_log/{logId}
  - action, userId, targetId, timestamp, metadata
```

---

## 📋 Event Card Fields (Required)

```
address         string    — full address text
city            string    — city name (for search/filter)
coordinates     {lat,lng} — set by Mapbox geocoding, adjustable by drag-drop
propertyType    enum      — דירה/בית/פנטהאוס/קרקע/מסחרי
price           number    — ILS, must be > 0
rooms           number
bathrooms       number
size            number    — m²
floor           number    — for apartments
totalFloors     number
parking         boolean   — checkmark
mamad           boolean   — מממ"ד checkmark
mirpeset        boolean   — מרפסת checkmark
photos          array     — 5-10 images, each as {full, medium, thumb} URLs
date            date      — YYYY-MM-DD
startTime       time      — HH:MM (start of open house)
endTime         time      — HH:MM (end, for "17:00–19:00" display)
visibility      enum      — public/mixed/colleagues
realtorInputText string   — realtor's own description (optional, input to AI)
description     object    — {he, en, ru} AI-generated from form data + input text
```

**AI Description generation (Cloud Function):**
- Input: all form fields + realtor's `realtorInputText`
- Claude Haiku prompt: "Write a professional selling description for this property in {language}. Data: {fields}. Realtor notes: {inputText}"
- Output: description.he, description.en, description.ru
- Generated once at creation, can be regenerated manually

**Waze deep link format:**
```
https://waze.com/ul?q={encodeURIComponent(address)}&navigate=yes
```

**Google Calendar / Apple Calendar export (ICS):**
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//OpenHouse Map//EN
BEGIN:VEVENT
UID:{eventId}@openhousemap.online
SUMMARY:Open House — {address}
DTSTART:{date}T{startTime without colon}00
DTEND:{date}T{endTime without colon}00
LOCATION:{address}
DESCRIPTION:₪{price} | {rooms} rooms | https://openhousemap.online/e/{id}
END:VEVENT
END:VCALENDAR
```
Example: `DTSTART:20260615T170000` (date=2026-06-15, startTime=17:00)
Download as `.ics` — works with Google Calendar and Apple Calendar.

**WhatsApp share button:**
```
https://wa.me/?text={encodeURIComponent(shareText + ' ' + url)}
```
shareText = "Open House: {address} | {date} {startTime}–{endTime} | ₪{price}"

---

## 🗺️ Map Behavior

**Zoom-dependent pins (3 levels):**
- City/Country (0-40%): small colored dot only
- Neighborhood (40-70%): classic pin with needle
- Street (70-100%): price pill — "₪2.9M · 4 rooms"

**Clustering:** Leaflet.markercluster — styled to C3 palette

**Active/selected pin:** green background on pill, glow effect

**Cancelled event pin:** gray + semitransparent + ✕ icon, stays 48h then disappears

**Map layers toggle:** 🗺 Map (styled) ↔ 🛰 Satellite (Esri)

---

## 🎨 Design System

### Colors — C3 Sage Premium

```css
/* Light Mode */
--color-deep:   #141C0A  /* primary text, buttons */
--color-forest: #2E4E1A
--color-moss:   #4A6E30  /* main accent */
--color-sage:   #8AB060  /* secondary accent */
--color-gold:   #EAA830  /* badges, highlights */
--color-cream:  #F0E8D0
--color-ivory:  #F6F8F2  /* page background */

/* Dark Mode — Forest Night */
--color-void:   #0C1208  /* page background */
--color-deep-d: #182410  /* card background */
--color-sage-d: #8AB060  /* main accent in dark */

/* Visibility colors (both themes) */
--vis-green:  #4A9B5C   /* 🟢 public */
--vis-red:    #C04848   /* 🔴 colleagues */
--vis-yellow: #D4980C   /* 🟡 mixed */
```

### Typography
```css
--font-display: 'Syne', sans-serif;    /* headings, logo, prices */
--font-body:    'DM Sans', sans-serif; /* everything else */
```

### Key Rules
- RTL for Hebrew (`dir="rtl"`), LTR for EN/RU/FR
- Animations: `cubic-bezier(0.4, 0, 0.2, 1)` — luxury feel
- `prefers-reduced-motion`: `@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }`
- Dark/light mode: follows system `prefers-color-scheme` + manual toggle
- Bottom sheet mobile pattern (Waze style)
- Zoom-dependent pins on map

### Breakpoints
```css
--mobile:  < 768px    /* Bottom sheet, full-screen map, single column */
--tablet:  768-1024px /* Transitional */
--desktop: > 1024px   /* Map + sidebar, full dashboard */
```

---

## 🌍 Languages

| Language | Code | Direction | Phase |
|----------|------|-----------|-------|
| Hebrew | he | RTL | MVP primary |
| English | en | LTR | MVP |
| Russian | ru | LTR | MVP |
| French | fr | LTR | Phase 2 |

**Translation:** Claude-generated, manual review by native Hebrew speaker before launch.

---

## 🔐 Security Rules Pattern

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isVerifiedRealtor() {
      return request.auth != null
        && request.auth.token.role == 'realtor'
        && request.auth.token.verified == true;
    }
    function isAdmin() { return request.auth != null && request.auth.token.admin == true; }
    function isOwner(uid) { return request.auth != null && request.auth.uid == uid; }

    // Events — public visible to all (only active + mapVisible)
    match /events/{eventId} {
      allow read: if resource.data.visibility == 'public'
        && resource.data.status == 'active'
        && resource.data.mapVisible == true;
      allow read: if resource.data.visibility in ['public', 'mixed']
        && isVerifiedRealtor();
      allow read: if resource.data.visibility == 'colleagues'
        && isVerifiedRealtor();
      allow read: if isOwner(resource.data.ownerId) || isAdmin();
      allow create: if isVerifiedRealtor()
        && request.resource.data.ownerId == request.auth.uid
        && request.resource.data.price > 0;
      allow update, delete: if isOwner(resource.data.ownerId) || isAdmin();
    }

    // Users — own profile only
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isOwner(userId);
      // Prevent self-modification of verified/role/verificationStatus
      allow update: if isAdmin()
        || (isOwner(userId)
          && !request.resource.data.diff(resource.data)
             .affectedKeys().hasAny(['verified', 'role', 'verificationStatus']));
      allow delete: if isAdmin();
    }

    // RSVP, Feedback, Favourites — own records
    match /rsvp/{id} {
      allow read: if isVerifiedRealtor()
        && (resource.data.realtorId == request.auth.uid
        || get(/databases/$(database)/documents/events/$(resource.data.eventId))
           .data.ownerId == request.auth.uid);
      allow create: if isVerifiedRealtor() && request.resource.data.realtorId == request.auth.uid;
      allow update, delete: if isVerifiedRealtor() && resource.data.realtorId == request.auth.uid;
    }

    match /feedback/{id} {
      allow read: if isAdmin() || (isVerifiedRealtor() && resource.data.realtorId == request.auth.uid);
      allow create: if isVerifiedRealtor() && request.resource.data.realtorId == request.auth.uid;
    }

    match /favourites/{id} {
      allow read, delete: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }

    match /admin/{document=**} { allow read, write: if isAdmin(); }
    match /audit_log/{document=**} { allow read: if isAdmin(); allow create: if isAdmin(); }
    match /{document=**} { allow read, write: if false; }
  }
}
```

---

## 📱 Registration Flow (Mobile-first)

```
Step 1 → Phone number (+972...)
Step 2 → SMS OTP (6 digits, auto-fill from SMS)
Step 3 → Name + surname
Step 4 → Office / company name
Step 5 → License number (רישיון תיווך)
         → Cloud Function calls data.gov.il API immediately
         → IF found: verified=true, verificationStatus='verified' ✅
         → IF not found: verificationStatus='pending', admin reviews
Step 6 → ✅ Done — CTA "Add first open house" → /create
```

**Subsequent logins:** Google Sign-In / Apple Sign-In (fast) OR phone again

**Soft launch bypass:** Admin can set verified=true manually for known realtors

**License verification Cloud Function:**
```javascript
const response = await fetch(
  `https://data.gov.il/api/3/action/datastore_search` +
  `?resource_id=a0f56034-88db-4132-8803-854bcdb01ca1&q=${licenseNumber}`
);
const data = await response.json();
const found = data.result?.records?.length > 0;
if (found) {
  await admin.auth().setCustomUserClaims(uid, { role: 'realtor', verified: true });
  await db.doc(`users/${uid}`).update({
    verified: true,
    verificationStatus: 'verified',
    licenseData: data.result.records[0],
    licenseVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}
```

---

## 🔔 Notifications

| Trigger | Channel | Who |
|---------|---------|-----|
| New event in area | — (check dashboard) | Realtors |
| RSVP received | — (check dashboard only) | Event owner |
| Event edited | Email (Resend) | All RSVPs |
| Event cancelled | Email urgent template | All RSVPs |
| Post-event feedback | Email (Resend) | All RSVPs |
| Weekly digest | Email opt-in | All realtors |

**On edit:** subject "📅 Open House עודכן — תאריך/פרטים חדשים"
**On cancel:** subject "⚠️ Open House בוטל — {address}"

**Cancelled event lifecycle:**
- Firestore: status → 'cancelled'
- Map pin: grey + semitransparent + ✕, stays 48h then removed
- Event page /e/id: "בוטל / Cancelled" banner, stays live 30 days then archived

**Email:** Resend only (not SendGrid). Opt-in checkbox at registration. Unsubscribe in every email (חוק הספאם).

---

## 💰 Monthly Costs (MVP)

| Stage | Realtors | Cost/month |
|-------|----------|------------|
| Launch | 0-50 | ~$1.25 (domain only) |
| Growth | ~500 | ~$67 |
| Scale | ~5,000 | ~$502 |

**Main cost driver at scale:** Firebase Auth SMS (~$0.0575/SMS Israel)
**Phase 2 optimization:** WhatsApp OTP (~$0.02-0.03/message)

---

## 🗺️ Filters

**Realtor (logged in):**
- 📍 Near me (geolocation — mandatory MVP)
- Visibility: 🟢🟡🔴
- Time: Today / This week / All
- ⭐ Favourites only → map shows only saved events with gold border pins

**Public user:**
- Step 1 (required): City search with autocomplete (Mapbox cities Israel)
- Step 2 (immediate): Property type — All / 🏢 Apartment / 🏠 House / 🏗 New build
- Step 3 (hidden, "More filters"): Price range, rooms count

**Favourites pin style:** gold/yellow border around pin, distinct from regular pins

---

## 📄 Required Pages

```
/               Map homepage (public)
/register       Registration flow — phone OTP + profile setup
/login          Login — Google/Apple/phone
/e/[id]         Event page (SSR for SEO + OG tags)
/dashboard      Realtor personal cabinet (mini-CRM)
/create         Create event form
/create/[id]    Edit event form (same component, edit mode)
/admin          Admin panel (role protected: admin=true)
/admin/realtors Pending verifications
/admin/events   All events moderation
/admin/users    User management
/admin/stats    Platform statistics
/admin/audit    Audit log viewer
/about          About page — founder story (10 years realtor)
/accessibility  הצהרת נגישות (IS 5568)
/privacy        מדיניות פרטיות
/terms          תנאי שימוש
/cookies        Cookie policy
```

**URL format:** `/e/abc123` — short for WhatsApp sharing

**Open Graph (every `/e/[id]` page — SSR generated):**
```html
<meta property="og:title" content="Open House — {address} | {formatPrice(price)}" />
<meta property="og:description" content="{date} {startTime}–{endTime} | {rooms} rooms · {size}m²" />
<meta property="og:image" content="{photos[0].full}" />
<meta property="og:url" content="https://openhousemap.online/e/{id}" />
<meta property="og:type" content="website" />
<!-- MVP: raw photo. Phase 2: logo overlay via @vercel/og -->
```

---

## ⚖️ Legal Compliance

**IS 5568 (Accessibility):** WCAG 2.0 AA — mandatory from day one
- `eslint-plugin-jsx-a11y` in ESLint config
- `@axe-core/react` in dev mode
- הצהרת נגישות page with accessibility coordinator contact

**חוק הספאם:** Explicit opt-in checkbox (not pre-checked) + unsubscribe in every email

**חוק הגנת הפרטיות:** Privacy policy, data deletion right, Firebase servers location disclosed

**Contrast check C3 palette:**
- #141C0A on #F6F8F2: 16.2:1 ✅
- #4A6E30 on #FFFFFF: 5.8:1 ✅
- ⚠️ #8AB060 on #F6F8F2: 2.8:1 ❌ — never use as body text

---

## 🚫 Hard Rules — Never Do This

```
❌ Never allow read, write: if true in Firestore rules
❌ Never put API keys (Mapbox, Claude, Resend) in client code — use /api/ proxy routes
❌ Never store phone numbers in plain text in Firestore
❌ Never use React SPA (must be Next.js for SEO)
❌ Never import Leaflet directly in server components — use dynamic({ssr:false})
❌ Never skip ARIA labels on map pins and interactive elements
❌ Never use #8AB060 (sage) as body text on light background (contrast 2.8:1 ❌)
❌ Never commit .env files or service account keys to git
❌ Never send email without opt-in consent (חוק הספאם)
❌ Never use overlay plugins for accessibility (IS 5568 requires real code)
❌ Never upload photos without generating eventId client-side first
❌ Never call Mapbox directly from client — proxy via /api/geocode
```

---

## 💲 Price Formatting Rules

Цены всегда сокращаются — пространство ограничено особенно на пинах карты.

```typescript
// lib/utils.ts
export function formatPrice(price: number, locale: string = 'he'): string {
  if (price >= 1_000_000) {
    const m = price / 1_000_000;
    // 1.5M, 2.3M, 10M (без лишних знаков)
    const formatted = m % 1 === 0 ? m.toString() : m.toFixed(1).replace(/\.0$/, '');
    return locale === 'he' ? `₪${formatted}M` : `₪${formatted}M`;
  }
  if (price >= 1_000) {
    const k = Math.round(price / 1_000);
    return `₪${k}K`;
  }
  return `₪${price}`;
}

// Examples:
// 2,900,000 → ₪2.9M
// 1,500,000 → ₪1.5M
// 3,000,000 → ₪3M
//   750,000 → ₪750K
//   999,000 → ₪999K
```

**Где используется:**
- Пин на карте (price pill): `₪2.9M · 4 חד׳`
- Карточка в сайдбаре: `₪2,900,000` (полная цена)
- Попап: `₪2,900,000` (полная цена)
- OG image/WhatsApp share: `₪2.9M`

**Правило:** пин = сокращённо, карточка/попап = полная цена с разделителями.

---

## 🧪 Local Development (Firebase Emulator)

```bash
# Install Firebase tools
npm install -g firebase-tools

# Start all emulators (Firestore, Auth, Storage, Functions)
firebase emulators:start

# Emulator URLs:
# Firestore: http://localhost:8080
# Auth:      http://localhost:9099
# Storage:   http://localhost:9199
# Functions: http://localhost:5001
# UI:        http://localhost:4000
```

Connect app to emulator in `lib/firebase.ts`:
```typescript
if (process.env.NODE_ENV === 'development') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectStorageEmulator(storage, 'localhost', 9199);
}
```

---

## ✅ Definition of Done (per feature)

Before marking any feature complete:
```
☐ Works on mobile (375px) and desktop (1280px+)
☐ Tested in Safari iOS (primary Israeli mobile browser)
☐ Hebrew RTL layout correct
☐ English/Russian LTR layout correct
☐ Keyboard navigable (no mouse required)
☐ ARIA labels on all interactive elements
☐ Firestore security rules cover the new collection/field
☐ Loading state implemented
☐ Error state implemented
☐ Empty state implemented (with illustration + CTA)
☐ Open Graph tags set (for event pages)
☐ SEO meta title + description set (for public pages)
☐ Dark mode tested
☐ prefers-reduced-motion respected
☐ Tested against Firebase Local Emulator
```

---

## 📸 Photo Upload Flow (Important — Storage Path)

**Problem:** When creating an event, the Firestore document doesn't exist yet, so we can't upload to `/events/{eventId}/`.

**Solution:** Generate eventId client-side BEFORE uploading:

```typescript
// EventForm.tsx — generate ID first, use for both storage and Firestore
import { doc, collection } from 'firebase/firestore';
const eventRef = doc(collection(db, 'events')); // generates ID without writing
const eventId = eventRef.id;

// Upload photos to /events/{eventId}/photo_0, /photo_1, etc.
// Firebase Resize Extension creates thumb/medium/full automatically
// Then save Firestore doc using eventRef.id
await setDoc(eventRef, { ownerId, photos, ... });
```

Storage path: `/events/{eventId}/{filename}` — consistent from upload to display.

---

## 🗺️ Map Data Loading (Firestore Query)

For MVP, load all events fitting in view — Israel is small enough:

```typescript
// Public user — only public events
query(collection(db, 'events'),
  where('visibility', '==', 'public'),
  where('status', '==', 'active'),
  where('mapVisible', '==', true),
  where('date', '>=', todayString), // YYYY-MM-DD
  orderBy('date', 'asc'),
  limit(500)
)

// Verified realtor — all visibility types
query(collection(db, 'events'),
  where('visibility', 'in', ['public', 'mixed', 'colleagues']),
  where('status', '==', 'active'),
  where('mapVisible', '==', true),
  where('date', '>=', todayString),
  orderBy('date', 'asc'),
  limit(500)
)
```

**Phase 2 optimization:** Use `geohash` field + GeoFirestore for viewport-bounded queries.

---

## 👁️ Mixed Visibility — Public vs Realtor View

When event is 🟡 Mixed, what public users see vs realtors:

| Field | Public | Realtor |
|-------|--------|---------|
| Photos | ✅ All | ✅ All |
| Price | ✅ Yes | ✅ Yes |
| Address | ✅ Yes | ✅ Yes |
| Date/time | ✅ Yes | ✅ Yes |
| Rooms/size/floor | ✅ Yes | ✅ Yes |
| Agent name | ✅ Yes | ✅ Yes |
| License number | ✅ Yes | ✅ Yes |
| Office name | ✅ Yes | ✅ Yes |
| RSVP button | ❌ No | ✅ Yes |
| Waze button | ✅ Yes | ✅ Yes |

Mixed events are essentially public events that also accept realtor RSVPs.

---

## 🍽️ Post-Event Feedback Form (4 Questions)

Sent via email to all RSVPs after event completes:

```
Q1: "Is the asking price realistic for this property?" ⭐⭐⭐⭐⭐
Q2: "What is the condition of the property?" ⭐⭐⭐⭐⭐
Q3: "How would you rate the location/neighborhood?" ⭐⭐⭐⭐⭐
Q4: "Overall impression of the property?" ⭐⭐⭐⭐⭐
Q5 (optional): Free text notes
```

Results visible only to event owner in their dashboard. Market data aggregate (no individual attribution).

---

## 🏗️ realtorSnapshot Population

When a realtor creates an event, the Cloud Function (or client-side on create) populates:

```typescript
// In EventForm.tsx, fetch from current user's Firestore profile:
const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
const { name, surname, officeName, licenseNumber } = userDoc.data();

// Include in event document:
realtorSnapshot: { name, surname, officeName, licenseNumber }
```

This avoids extra reads when displaying event cards on the map.

---

## 🖼️ Image Handling

**Firebase Resize Images Extension creates 3 sizes automatically:**
```
thumb_400x300   — list views, sidebar cards
medium_800x600  — popup card
full_1600x1200  — event detail page
```
Store all 3 URLs in photos array: `{thumb, medium, full}`

---

## 💬 Popup Card (click on pin)

Large popup, not a small tooltip:
```
[ Photo gallery — swipeable, 5-10 photos          ]
[ ₪3,200,000                                       ]
[ 4 rooms · 110m² · Floor 3/8 · מרפסת · Parking   ]
[ Tel Aviv, Rothschild 22                          ]
[ 📅 Today · 17:00–19:00                           ]
[ 🟢 Public                                        ]
[ AI description text (in user's language)         ]
[ License: 12345 | Agent: Moshe Cohen | Office: X  ]
─────────────────────────────────────────────────
[ 🚗 Navigate with Waze ]      [ ⭐ Save          ]
[ ✓ Attending  ? Maybe  ✗ Decline ] ← realtors only
[ 📤 Share on WhatsApp ]
[ 📅 Add to Calendar ]
```

---

## 🏠 Realtor Dashboard (mini-CRM)

Layout:
- Small map widget on side — shows ONLY realtor's own events as pins
- Main area: 3 tabs

**Tab 1 — Today:** Events happening today + RSVP counts
**Tab 2 — Upcoming:** Future events sorted by date + RSVP lists per event
**Tab 3 — Archive:** Manually archived events (6-month retention)

**Per event card in dashboard:**
- Status badge + RSVP list (Attending / Maybe / Declined names)
- Post-event brief form (appears after event completes)
- Edit / Cancel / Archive action buttons
- Share link copy + WhatsApp share button

**Stats overview (top of dashboard):**
- Total events created | Total RSVPs received | Upcoming count

**Archive mechanics:**
- Realtor clicks "Archive" on any completed event manually
- Event moves to Archive tab, off main view
- Photos auto-deleted after 6 months (Cloud Scheduler)
- Event text/data kept indefinitely

---

## ⏰ Post-Event Automation (Cloud Scheduler)

**Every hour — event completion check:**
Query: `date+startTime < now AND status == 'active' AND feedbackRequested == false`
1. Set `status = 'completed'`, `completedAt = now`
2. Send feedback email to all RSVPs (4-5 questions)
3. Set `feedbackRequested = true`
4. Flag event owner's dashboard to show post-event brief prompt

**Every hour — cancelled pin cleanup:**
Query: `status == 'cancelled' AND cancelledAt < now - 48h AND mapVisible == true`
1. Set `mapVisible = false` (pin disappears from map)

**Every day — archive photo cleanup:**
Query: `archiveStatus == 'archived' AND archivedAt < now - 6months`
1. Delete all photo files from Firebase Storage
2. Clear photos array in Firestore
3. Keep all other event metadata

**Note:** `mapVisible` is already in the /events schema. Default value: `true`. Set to `false` by the cancelled pin cleanup scheduler job.

---

## 🔖 Admin Panel Scope

```
/admin/realtors   — pending verifications → approve / reject / manual override
/admin/events     — all events, flag/remove inappropriate content  
/admin/users      — block / unblock users
/admin/stats      — total events, realtors, RSVPs, active cities
/admin/audit      — full audit log viewer
```

Admin access: custom claim `admin=true` only.
**Soft launch bypass:** admin manually sets `verified=true` for first known realtors.

---

## 📱 Social Media Post Templates

After event creation, realtor can generate shareable posts:
- **10 design templates** to choose from
- **Formats:** 1:1 square (Instagram/WhatsApp) + 9:16 vertical (Stories/WhatsApp Status)
- **Languages:** Hebrew, English, Russian, French, Arabic (realtor selects 1 or more)
- **Content:** property photo + price + address + date/time + OpenHouse Map logo
- **Generation:** Claude Haiku generates caption text per language
- **Export:** PNG download + short event URL `/e/abc123`
- **Platform:** Canva API or AI image generation — Phase 2 decision

---

## 🗂️ Firestore Indexes (firestore.indexes.json)

```json
{
  "indexes": [
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "visibility", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "mapVisible", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "city", "order": "ASCENDING" },
        { "fieldPath": "visibility", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "ownerId", "order": "ASCENDING" },
        { "fieldPath": "archiveStatus", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "feedbackRequested", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "mapVisible", "order": "ASCENDING" },
        { "fieldPath": "cancelledAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "archiveStatus", "order": "ASCENDING" },
        { "fieldPath": "archivedAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "rsvp",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "eventId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "rsvp",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "realtorId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "feedback",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "eventId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "favourites",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 🔑 Environment Variables (.env.local.example)

```bash
# Firebase Client — safe to expose in client
NEXT_PUBLIC_FIREBASE_PROJECT_ID=openhousemap
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=openhousemap.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=openhousemap.appspot.com
# Fill from Firebase Console → Project Settings:
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# MapTiler — restricted key, safe for client (map tiles only)
NEXT_PUBLIC_MAPTILER_KEY=

# Server-side only — never expose to client
MAPBOX_SECRET_KEY=          # Geocoding (Cloud Functions only)
CLAUDE_API_KEY=             # Haiku descriptions (Cloud Functions only)
RESEND_API_KEY=             # Email (Cloud Functions only)
FIREBASE_SERVICE_ACCOUNT=   # Admin SDK as base64 JSON (Cloud Functions only)

# App config
NEXT_PUBLIC_DEFAULT_LOCALE=he
NEXT_PUBLIC_APP_URL=https://openhousemap.online
```

---

## 🔗 Key External Resources

- data.gov.il license API: `https://data.gov.il/api/3/action/datastore_search?resource_id=a0f56034-88db-4132-8803-854bcdb01ca1`
- Waze deep link: `https://waze.com/ul?q={encodeURIComponent(address)}&navigate=yes`
- Mapbox Geocoding (via `/api/geocode?q=...`): proxied server-side to `https://api.mapbox.com/geocoding/v5/mapbox.places/{q}.json?country=IL&types=place,address`
- Esri Satellite tiles: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
- IS 5568 official: `https://aisrael.org`
- WhatsApp share: `https://wa.me/?text={encodeURIComponent(text)}`

---

## 📓 Notion Workspace Setup (Claude Code делает сам)

> Workspace: **openhousemap.online** (отдельный от PhotoDesk/SkyTask)
> Подключить: Settings → Connections → Notion → выбрать workspace openhousemap.online

### Структура Notion (Claude Code создаёт через MCP)

```
openhousemap.online/
│
├── 🏠 Home                        ← главная страница workspace
│   └── Quick links, stats, status
│
├── 📋 Product/
│   ├── Product Brief              ← содержимое OpenHouseMap_ProductBrief.docx
│   ├── Decision Log               ← содержимое OpenHouseMap_Decisions.md
│   └── Roadmap
│       ├── 🔴 MVP Features
│       ├── 🟡 Phase 2
│       └── 🔮 Future
│
├── 🛠️ Technical/
│   ├── CLAUDE.md                  ← содержимое CLAUDE.md (этот файл)
│   ├── Firestore Schema           ← коллекции и поля
│   ├── Security Rules             ← Firestore + Storage rules
│   ├── Firestore Indexes          ← JSON индексы
│   └── API & Integrations
│       ├── data.gov.il License API
│       ├── Mapbox Geocoding
│       ├── Firebase Auth
│       └── Claude Haiku
│
├── 🎨 Design/
│   ├── Design System              ← C3 Sage Premium palette, typography
│   ├── Component Library          ← все компоненты из repo structure
│   └── UX Decisions               ← popup, filters, dashboard layout
│
├── ⚖️ Legal/
│   ├── IS 5568 Compliance         ← полная спецификация
│   ├── Privacy Policy (draft)
│   ├── Terms of Service (draft)
│   └── חוק הספאם Compliance
│
├── 🔒 Security/
│   ├── Security Checklist
│   └── Firestore Rules (full)
│
├── 🚀 Launch/
│   ├── Launch Readiness Checklist ← из CLAUDE.md
│   ├── Beta Tester List           ← таблица: имя, телефон, офис, статус
│   ├── Domain & Infrastructure
│   └── Success Metrics
│
└── 📝 Dev Log/                    ← дневник разработки
    └── 2026-05 Session 1          ← резюме этой сессии
```

### Claude Code команды для Notion (через MCP)

```
1. Создать страницы по структуре выше
2. Вставить содержимое CLAUDE.md → Technical/CLAUDE.md
3. Вставить Decision Log → Product/Decision Log
4. Создать таблицу Beta Testers в Launch/Beta Tester List:
   Колонки: Имя | Телефон | Офис | Город | Статус | Дата регистрации | Заметки
5. Создать Dev Log запись с резюме текущего прогресса
```

---

## 📚 Obsidian Vault на Google Drive

> Vault name: **OpenHouseMap**
> Location: Google Drive → Obsidian → OpenHouseMap/

### Claude Code создаёт через Google Drive MCP:

```
Google Drive/
└── Obsidian/
    └── OpenHouseMap/
        ├── .obsidian/              ← настройки vault
        │   ├── app.json
        │   ├── appearance.json
        │   └── plugins/
        ├── 00-Index.md             ← главный индекс всех заметок
        ├── 01-CLAUDE.md            ← копия CLAUDE.md
        ├── 02-Decisions.md         ← копия Decision Log
        ├── 03-Architecture/
        │   ├── Firestore-Schema.md
        │   ├── Security-Rules.md
        │   ├── Indexes.md
        │   └── Repo-Structure.md
        ├── 04-Design/
        │   ├── Design-System.md
        │   └── UX-Decisions.md
        ├── 05-Legal/
        │   ├── IS-5568.md
        │   └── Privacy-Compliance.md
        ├── 06-Launch/
        │   ├── Launch-Checklist.md
        │   └── Success-Metrics.md
        └── 07-Dev-Log/
            └── 2026-05-12.md       ← сегодняшняя сессия
```

### Obsidian app.json (минимальный конфиг):
```json
{
  "legacyEditor": false,
  "livePreview": true,
  "defaultViewMode": "preview",
  "attachmentFolderPath": "assets"
}
```

---

## 🤖 Полная инструкция для Claude Code (старт)

Скопируй и вставь это в Claude Code при первом запуске:

```
Прочитай файл CLAUDE.md. Выполни следующие задачи последовательно:

ЗАДАЧА 1 — Инициализация проекта:
- Firebase project: openhousemap
- Domain: openhousemap.online
- Выполни все шаги из раздела "Claude Code — Что делает сам"

ЗАДАЧА 2 — Notion workspace "openhousemap.online":
- Создай структуру страниц из раздела "Notion Workspace Setup"
- Заполни каждую страницу соответствующим контентом из CLAUDE.md и Decisions.md
- Создай таблицу Beta Testers
- Создай Dev Log запись на сегодня

ЗАДАЧА 3 — Obsidian vault на Google Drive:
- Создай папку: Google Drive/Obsidian/OpenHouseMap/
- Создай все MD файлы из раздела "Obsidian Vault"
- Скопируй содержимое CLAUDE.md и Decisions.md в соответствующие файлы

ЗАДАЧА 4 — Деплой Firebase:
- Задеплой firestore.rules, storage.rules, firestore.indexes.json
- Проверь что все сервисы доступны

После каждой задачи отчитайся что сделано.
Firebase Project ID: openhousemap
Domain: openhousemap.online
```

---

> Читай этот раздел первым при начале новой Claude Code сессии.
> Claude Code выполняет всё ниже самостоятельно через bash — без участия человека.

---

### Шаг 1 — Firebase CLI (Claude Code делает сам)

```bash
# Установить Firebase CLI
npm install -g firebase-tools

# Войти в Firebase (потребует один раз открыть браузер)
firebase login

# Подключиться к проекту openhousemap
firebase use openhousemap

# Включить сервисы через CLI
firebase init firestore    # создаёт firestore.rules + firestore.indexes.json
firebase init storage      # создаёт storage.rules
firebase init hosting      # настраивает firebase.json
firebase init functions    # создаёт functions/ папку (Node.js 20, TypeScript)
```

---

### Шаг 2 — Next.js проект (Claude Code делает сам)

```bash
# Создать Next.js проект
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"

# Установить зависимости
npm install firebase next-intl leaflet leaflet.markercluster geohash file-saver
npm install --save-dev @types/leaflet @types/leaflet.markercluster \
  eslint-plugin-jsx-a11y @axe-core/react \
  @firebase/rules-unit-testing
```

---

### Шаг 3 — Файлы конфигурации (Claude Code создаёт сам)

Claude Code создаёт все файлы из раздела "Complete Repository Structure":
- `i18n.ts`, `middleware.ts`
- `tailwind.config.js` — C3 Sage Premium токены
- `next.config.js` — next-intl + Leaflet CSS fix
- `.firebaserc` — `{"projects": {"default": "openhousemap"}}`
- `firebase.json` — hosting + functions конфиг
- `firestore.rules` — полные security rules из этого файла
- `storage.rules` — storage security rules
- `firestore.indexes.json` — все индексы из этого файла
- `.env.local.example` — все переменные
- `.gitignore`
- `.github/workflows/deploy.yml` — CI/CD
- `functions/.nvmrc` — "20"
- Всю структуру `app/`, `components/`, `lib/`, `hooks/`, `types/`, `messages/`

---

### Шаг 4 — Firebase деплой (Claude Code делает сам)

```bash
# Задеплоить Firestore правила и индексы
firebase deploy --only firestore

# Задеплоить Storage правила
firebase deploy --only storage

# Задеплоить Hosting (статика)
firebase deploy --only hosting

# Задеплоить Functions
firebase deploy --only functions
```

---

### ⚠️ Что требует ONE ручного действия от тебя

Только эти вещи нельзя сделать через CLI — нужен браузер:

| Действие | Где | Время |
|----------|-----|-------|
| Получить Firebase API ключи | Console → Project Settings → General → SDK config | 1 мин |
| Включить Phone Auth | Console → Authentication → Sign-in method → Phone | 30 сек |
| Включить Google Auth | Console → Authentication → Google | 30 сек |
| Включить Apple Auth | Console → Authentication → Apple | 2 мин |
| Upgrade to Blaze (для Functions) | Console → Upgrade plan | 2 мин |
| Включить App Check | Console → App Check → reCAPTCHA v3 | 2 мин |
| Подключить домен | Console → Hosting → Add custom domain → openhousemap.online | 5 мин |
| Firebase Resize Images Extension | Console → Extensions → Install | 3 мин |

**Итого ручной работы: ~15-20 минут.**
Всё остальное Claude Code делает сам.

---

### GoDaddy DNS — после подключения домена в Firebase

Firebase даст два A-records и TXT для верификации. Claude Code не может менять DNS напрямую, но может показать точные значения для вставки в GoDaddy:

```
Firebase предоставит:
A record: @ → <IP1>
A record: @ → <IP2>
TXT record: @ → <verification-string>
```

Вставить в GoDaddy → My Domains → openhousemap.online → DNS → Add Records.

---

### Быстрый старт для Claude Code

Когда начинаешь сессию Claude Code — скажи:

> "Прочитай CLAUDE.md и выполни полную инициализацию проекта OpenHouse Map.
> Firebase project ID: openhousemap. Domain: openhousemap.online.
> Начни с Шага 1, потом Notion, потом Obsidian."

---

## 📓 Notion — через браузер Chrome (Claude Code делает сам)

> Claude Code открывает Chrome, заходит в Notion, создаёт всё вручную.
> Workspace: **openhousemap.online**

```
ШАГИ ДЛЯ CLAUDE CODE:

1. Открыть Chrome → https://notion.so
2. Войти в аккаунт Edmont
3. Левый верхний угол → имя workspace → переключить на "openhousemap.online"
4. Нажать "+" для создания новой страницы
5. Создать структуру страниц (каждую через "+ New page"):

🏠 Home
├── 📋 Product
│   ├── Decision Log          ← скопировать из OpenHouseMap_Decisions.md
│   └── Roadmap
│       ├── 🔴 MVP
│       ├── 🟡 Phase 2
│       └── 🔮 Future
├── 🛠️ Technical
│   ├── CLAUDE.md             ← скопировать из CLAUDE.md (этот файл)
│   ├── Firestore Schema
│   ├── Security Rules
│   └── Firestore Indexes
├── 🎨 Design
│   ├── Design System (C3 Sage Premium)
│   └── UX Decisions
├── ⚖️ Legal
│   ├── IS 5568 Compliance
│   ├── Privacy Policy (draft)
│   └── Terms of Service (draft)
├── 🚀 Launch
│   ├── Launch Checklist      ← скопировать из CLAUDE.md раздел Launch
│   └── Beta Testers          ← создать Table: Имя|Телефон|Офис|Город|Статус
└── 📝 Dev Log
    └── 2026-05-12            ← первая запись: резюме что сделано

6. Для каждой страницы с контентом — вставить через /code или обычный текст
7. Для Beta Testers — создать через /table (inline database)
```

---

## 📚 Obsidian Vault на Google Drive (Claude Code делает сам)

> Два шага: создать файлы локально через bash, потом загрузить в Drive.

### Шаг A — создать файлы локально (bash):

```bash
# Создать структуру vault
mkdir -p ~/OpenHouseMap-Obsidian/.obsidian
mkdir -p ~/OpenHouseMap-Obsidian/03-Architecture
mkdir -p ~/OpenHouseMap-Obsidian/04-Design
mkdir -p ~/OpenHouseMap-Obsidian/05-Legal
mkdir -p ~/OpenHouseMap-Obsidian/06-Launch
mkdir -p ~/OpenHouseMap-Obsidian/07-Dev-Log

# Создать .obsidian/app.json
echo '{
  "legacyEditor": false,
  "livePreview": true,
  "defaultViewMode": "preview",
  "attachmentFolderPath": "assets"
}' > ~/OpenHouseMap-Obsidian/.obsidian/app.json

# Скопировать основные файлы
cp CLAUDE.md ~/OpenHouseMap-Obsidian/01-CLAUDE.md
cp OpenHouseMap_Decisions.md ~/OpenHouseMap-Obsidian/02-Decisions.md

# Создать Index
echo "# OpenHouse Map — Knowledge Base
[[01-CLAUDE.md]] | [[02-Decisions.md]]
## Architecture
[[03-Architecture/Firestore-Schema]] | [[03-Architecture/Security-Rules]]
## Launch
[[06-Launch/Launch-Checklist]]" > ~/OpenHouseMap-Obsidian/00-Index.md

# Dev Log сегодня
echo "# Dev Log — 2026-05-12
## Что сделано
- Полная product planning сессия
- CLAUDE.md создан
- Decision Log создан
- Firebase project: openhousemap
- Domain: openhousemap.online зарегистрирован
- Notion workspace: openhousemap.online создан" \
> ~/OpenHouseMap-Obsidian/07-Dev-Log/2026-05-12.md
```

### Шаг B — загрузить в Google Drive (браузер):

```
1. Открыть Chrome → https://drive.google.com
2. Перейти в папку Obsidian (или создать если нет)
3. Drag-and-drop папку OpenHouseMap-Obsidian из Finder/Explorer
4. Подождать загрузки
5. Открыть Obsidian desktop app → Open vault → Google Drive → OpenHouseMap-Obsidian
```

---

### 🌐 Domain & Infrastructure
```
✅ openhousemap.online — ЗАРЕГИСТРИРОВАН на GoDaddy
☐ openhousemap.co — взять как redirect (страховка, ~$3/год)
☐ Настроить DNS на Firebase Hosting
☐ Set up Google Workspace — hello@openhousemap.online

Firebase Project ID: openhousemap
Firebase Console: https://console.firebase.google.com/project/openhousemap
☐ Включить: Firestore, Auth, Storage, Functions, Hosting, App Check
☐ Создать второй проект: openhousemap-staging (для тестирования)
☐ Firebase billing alerts: $10 / $50 / $100
☐ Firebase project created — name: "openhousemap-prod" (isolated)
☐ Firebase project staging — name: "openhousemap-staging"
☐ Firebase billing alerts set — alert at $10, $50, $100/month
☐ App Check enabled for Firestore + Storage + Functions
☐ Firebase Local Emulator configured for dev
```

### 📊 Analytics & Monitoring (CRITICAL — without this flying blind)
```
☐ Google Analytics 4 — track: page views, event views, registrations, RSVP clicks
☐ Key events to track:
   - map_pin_clicked
   - event_page_viewed
   - register_started / register_completed
   - event_created
   - rsvp_submitted
   - waze_opened
   - whatsapp_shared
☐ Sentry (error monitoring) — free tier sufficient for MVP
☐ Firebase Performance Monitoring — Core Web Vitals
☐ Firebase Alerts — unusual read/write spikes, auth failures
```

### ✉️ Business Email & Communication
```
☐ hello@openhousemap.online — general support
☐ legal@openhousemap.online — privacy/legal contact (required for IS 5568)
☐ noreply@openhousemap.online — transactional emails via Resend
☐ Resend: verify domain openhousemap.online for email sending
```

### 📝 Content That Must Be Written (Hebrew first)
```
☐ Landing page hero text — 1 headline + 2 lines max
☐ About page — founder story (10 years realtor, the pain, the solution)
☐ הצהרת נגישות (accessibility statement) — IS 5568 required
☐ מדיניות פרטיות (privacy policy) — LEGAL REVIEW REQUIRED
☐ תנאי שימוש (terms of service) — LEGAL REVIEW REQUIRED
☐ Cookie consent banner text
☐ All UI strings in he.json, en.json, ru.json — NATIVE REVIEW
☐ Email templates (edit/cancel/feedback/welcome) — Hebrew primary
```

### 🧪 Beta Launch Plan
```
☐ 10 trusted realtors from personal network — beta testers
☐ WhatsApp group for beta testers (direct feedback channel)
☐ Feedback form for beta testers (Google Forms or Typeform)
☐ Minimum 5 events on map before opening to others
☐ Manual verification for all beta realtors (soft launch bypass)
```

### 📱 Social Presence (minimal for launch)
```
☐ Instagram: @openhousemap — Israeli real estate community
☐ LinkedIn: OpenHouse Map company page
☐ WhatsApp Business account for platform support
☐ Reserve: Facebook page (realtors in Israel use Facebook heavily)
```

### ⚖️ Legal (must do BEFORE launch)
```
☐ Legal consultation — Privacy policy + Terms (חוק הגנת הפרטיות)
☐ Legal consultation — SMS Auth + GDPR equivalent
☐ Named accessibility coordinator (מרכז נגישות) — required for IS 5568
☐ Verify חוק הספאם compliance — opt-in checkboxes + unsubscribe tested
☐ Data deletion workflow — user can request account deletion + confirmation
```

### 🏗️ Technical Launch Requirements
```
☐ Staging environment deployed + tested (openhousemap-staging)
☐ All 6 Firestore Security Rules tested in Rules Playground
☐ License verification Cloud Function tested with real license numbers
☐ Email sending tested (registration, edit, cancel notifications)
☐ ICS calendar file tested on iPhone + Android
☐ Waze deep link tested on iOS + Android
☐ WhatsApp share tested — preview card renders correctly
☐ OG tags tested — use opengraph.xyz or metatags.io to verify
☐ Lighthouse score: Performance >85, Accessibility >95, SEO >95
☐ Safari iOS tested (iPhone 13+) — primary Israeli mobile
☐ Hebrew RTL tested across all pages
☐ Dark mode tested across all pages
☐ Cookie consent banner appears on first visit
☐ CI/CD via GitHub Actions (auto-deploy on merge to main)
```

---

## ⚠️ Missing Decisions — Need Answers

### Phone number format
Israel uses both formats: `+972-52-123-4567` and `052-123-4567`. Registration must accept both and normalize to E.164 (`+972521234567`) for Firebase Auth.

### Event photo order
Can realtor reorder photos after upload? (Drag-and-drop reorder). **Recommend: YES** — first photo = OG image, cover photo. Not decided yet.

### Event duplication
Can realtor duplicate a past event for the same property? Useful when property had two open houses. **Recommend: YES** — "Duplicate event" button in dashboard.

### Data deletion flow
When realtor requests account deletion:
1. Delete Firebase Auth account
2. Delete /users/{uid} document
3. Delete all their events (or anonymize?)
4. Delete all their RSVPs/favourites
Required by חוק הגנת הפרטיות. Flow not implemented.

### Staging vs Production
Two Firebase projects: `openhousemap-staging` and `openhousemap-prod`. Environment variable `NEXT_PUBLIC_FIREBASE_PROJECT_ID` determines which. Different `.env.local` files.

---

## 📦 npm Dependencies (Key Packages)

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "firebase": "^10.0.0",
    "next-intl": "^3.0.0",
    "leaflet": "^1.9.0",
    "leaflet.markercluster": "^1.5.0",
    "tailwindcss": "^3.4.0",
    "@tailwindcss/forms": "^0.5.0",
    "geohash": "^1.1.0",
    "file-saver": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "eslint-plugin-jsx-a11y": "^6.8.0",
    "@axe-core/react": "^4.9.0",
    "firebase-tools": "^13.0.0",
    "@firebase/rules-unit-testing": "^3.0.0"
  }
}
```

---

## 🔄 CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Firebase
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: openhousemap
```

---

## 📈 Success Metrics (MVP)

**Week 1:** 10 registered realtors, 5 events on map
**Month 1:** 50 realtors, 30 events, first viral WhatsApp share
**Month 3:** 200 realtors, 3 cities, organic referrals
**Month 6:** 500 realtors, national coverage → consider monetization

**Key metric to watch:** Events per active realtor per month.
If > 1 event/month → product is sticky. If < 0.5 → need to investigate why.

---

```
✅ Product brief → OpenHouseMap_ProductBrief.docx
✅ Decision log → OpenHouseMap_Decisions.md
✅ Design system → fully documented
✅ Technical decisions → all answered
✅ Legal compliance → IS 5568, חוק הספאם, privacy
✅ Security → Firestore rules, App Check, headers
✅ CLAUDE.md → this file
✅ Firestore indexes → documented

☐ Register domain (openhousemap.com / .app / .io / .co / .online)
☐ Legal consultation — Phone Auth + Email חוק הספאם
☐ Create new Notion workspace for OpenHouse Map
☐ Save all docs to Notion
☐ Set up Firebase project (isolated, new project)
☐ Initialize Next.js project from this CLAUDE.md
☐ Build security rules and test in Firebase Rules Playground
☐ Wire up data.gov.il license verification Cloud Function
☐ Set up Firebase Local Emulator for development
```

---

*CLAUDE.md | OpenHouse Map | AdmontREM | May 2026*
*Read this file at the start of every Claude Code session*

---

## 📁 Complete Repository Structure

```
openhousemap/
│
├── .env.local                    ← GITIGNORED — real secrets
├── .env.local.example            ← template (committed)
├── .gitignore
├── .eslintrc.json                ← jsx-a11y plugin included
├── next.config.js                ← next-intl + Leaflet CSS import
├── tailwind.config.js            ← C3 Sage Premium design tokens
├── tsconfig.json
├── package.json
├── i18n.ts                       ← next-intl config
├── middleware.ts                 ← next-intl locale routing
│
├── firebase.json                 ← Hosting + Functions config
├── .firebaserc                   ← {"projects": {"default": "openhousemap"}}
├── firestore.rules               ← Full security rules
├── storage.rules                 ← Storage security rules
├── firestore.indexes.json        ← Composite indexes
│
├── app/
│   ├── layout.tsx                ← Root layout (Syne + DM Sans fonts)
│   ├── not-found.tsx             ← Global 404
│   ├── sitemap.ts                ← Dynamic sitemap (public event pages)
│   ├── robots.ts                 ← Dynamic robots.txt
│   ├── api/
│   │   └── geocode/
│   │       └── route.ts          ← Proxy Mapbox geocoding (keeps key server-side)
│   └── [locale]/
│       ├── layout.tsx            ← Locale layout (dir, lang, providers)
│       ├── page.tsx              ← Map homepage
│       ├── loading.tsx           ← Map loading skeleton
│       ├── error.tsx             ← Error boundary
│       ├── register/page.tsx     ← 6-step registration
│       ├── login/page.tsx        ← Google / Apple / Phone login
│       ├── e/[id]/page.tsx       ← Event page (SSR + OG tags)
│       ├── dashboard/
│       │   ├── page.tsx          ← Realtor mini-CRM
│       │   └── loading.tsx
│       ├── create/
│       │   ├── page.tsx          ← Create event form
│       │   └── [id]/page.tsx     ← Edit event (same form)
│       ├── admin/
│       │   ├── layout.tsx        ← Admin guard (admin=true)
│       │   ├── page.tsx          ← Redirect → /admin/realtors
│       │   ├── realtors/page.tsx ← Pending verifications
│       │   ├── events/page.tsx   ← Moderation
│       │   ├── users/page.tsx    ← Block/unblock
│       │   ├── stats/page.tsx    ← Platform metrics
│       │   └── audit/page.tsx    ← Audit log
│       ├── about/page.tsx        ← Founder story
│       ├── accessibility/page.tsx← הצהרת נגישות (IS 5568)
│       ├── privacy/page.tsx      ← מדיניות פרטיות
│       ├── terms/page.tsx        ← תנאי שימוש
│       └── cookies/page.tsx      ← Cookie policy
│
├── components/
│   ├── map/
│   │   ├── MapContainer.tsx      ← dynamic(MapInner, {ssr:false}) ← CRITICAL
│   │   ├── MapInner.tsx          ← CLIENT ONLY — Leaflet map
│   │   ├── MapPin.tsx            ← dot / needle / price pill (zoom)
│   │   ├── PinCluster.tsx        ← markercluster C3 styling
│   │   ├── MapControls.tsx       ← +/- buttons
│   │   ├── LayerToggle.tsx       ← Map ↔ Satellite
│   │   └── LocationButton.tsx    ← "Near me" geolocation
│   ├── events/
│   │   ├── EventCard.tsx         ← sidebar list card
│   │   ├── EventPopup.tsx        ← map popup (gallery+RSVP+Waze)
│   │   ├── EventForm.tsx         ← create/edit shared form
│   │   ├── EventFilters.tsx      ← realtor filters + public filters
│   │   ├── EventList.tsx         ← sidebar list
│   │   ├── RSVPButtons.tsx       ← Attending / Maybe / Decline
│   │   ├── FeedbackForm.tsx      ← post-event 4-5 questions
│   │   ├── PostBriefForm.tsx     ← owner brief form
│   │   ├── ShareButtons.tsx      ← WhatsApp + ICS + link
│   │   └── CancelledBanner.tsx   ← "בוטל" banner
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx             ← RTL support
│   │   ├── Badge.tsx             ← 🟢🟡🔴 visibility
│   │   ├── BottomSheet.tsx       ← mobile Waze-style sheet
│   │   ├── PhotoGallery.tsx      ← swipeable
│   │   ├── PhotoUpload.tsx       ← drag/drop + camera
│   │   ├── EmptyState.tsx        ← illustration + CTA
│   │   ├── LoadingSkeleton.tsx
│   │   ├── Toast.tsx             ← success/error
│   │   ├── Modal.tsx
│   │   └── LanguageSwitcher.tsx
│   ├── auth/
│   │   ├── PhoneStep.tsx         ← +972 input
│   │   ├── OTPStep.tsx           ← 6-digit + auto-fill
│   │   ├── ProfileStep.tsx       ← name + office
│   │   ├── LicenseStep.tsx       ← license + verify
│   │   └── SocialLogin.tsx       ← Google / Apple
│   ├── dashboard/
│   │   ├── MiniMap.tsx           ← own events only
│   │   ├── DashboardTabs.tsx     ← Today / Upcoming / Archive
│   │   ├── EventDashCard.tsx     ← with RSVP list
│   │   ├── RSVPList.tsx
│   │   └── StatsBar.tsx          ← events / RSVPs / upcoming
│   ├── admin/
│   │   ├── RealtorRow.tsx
│   │   ├── EventRow.tsx
│   │   └── StatsWidgets.tsx
│   └── layout/
│       ├── Navbar.tsx
│       ├── Footer.tsx            ← legal links only
│       └── CookieBanner.tsx      ← cookie consent (Israeli law)
│
├── lib/
│   ├── firebase.ts               ← Client SDK (safe)
│   ├── firebase-admin.ts         ← Admin SDK (server only)
│   ├── mapbox.ts                 ← Geocoding + city search (country=IL)
│   ├── resend.ts                 ← Email templates
│   ├── ics.ts                    ← Calendar file generator
│   ├── waze.ts                   ← Waze deep link builder
│   └── utils.ts                  ← Formatters, helpers
│
├── hooks/
│   ├── useAuth.ts                ← Auth state + role
│   ├── useEvents.ts              ← Firestore queries + filters
│   ├── useGeolocation.ts         ← Browser geolocation
│   └── useRealtime.ts            ← New events counter listener
│
├── types/
│   ├── event.ts                  ← Event, EventVisibility, EventStatus
│   ├── user.ts                   ← User, UserRole, VerificationStatus
│   └── index.ts                  ← Re-exports
│
├── messages/                     ← next-intl translations
│   ├── he.json                   ← Hebrew (primary, RTL)
│   ├── en.json
│   ├── ru.json
│   └── fr.json                   ← Phase 2 placeholder
│
├── functions/                    ← Firebase Cloud Functions (Node.js 20)
│   ├── .nvmrc                    ← "20" — Node.js version
│   ├── src/
│   │   ├── index.ts              ← Exports all functions
│   │   ├── verifyLicense.ts      ← data.gov.il + set custom claims
│   │   ├── generateDescription.ts← Claude Haiku → {he, en, ru}
│   │   ├── generateSocialPost.ts ← Claude Haiku → captions per language
│   │   ├── sendEmail.ts          ← Resend all email types
│   │   ├── scheduler.ts          ← Hourly/daily jobs
│   │   └── auth.ts               ← setCustomClaims helper
│   ├── package.json
│   └── tsconfig.json
│
└── public/
    ├── favicon.ico
    ├── logo.svg
    ├── manifest.json             ← PWA — Add to Home Screen
    └── icons/
        ├── icon-192.png
        └── icon-512.png
```

> ⚠️ **robots.txt** — Do NOT put in `/public/robots.txt`. Use `app/robots.ts` (Next.js dynamic). Both cannot coexist — `app/robots.ts` takes priority but having both creates confusion.

> ⚠️ **sitemap.xml** — Similarly use `app/sitemap.ts` (dynamic, fetches all public event IDs from Firestore). Do not create a static file in `/public/`.

### Key Config Snippets

**next.config.js:**
```javascript
const withNextIntl = require('next-intl/plugin')('./i18n.ts');
module.exports = withNextIntl({
  webpack: (config) => {
    // Required for Leaflet CSS
    config.resolve.alias['leaflet'] = require.resolve('leaflet');
    return config;
  },
});
```

**tailwind.config.js:**
```javascript
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: { extend: {
    colors: {
      deep: '#141C0A', forest: '#2E4E1A', moss: '#4A6E30',
      sage: '#8AB060', gold: '#EAA830', cream: '#F0E8D0', ivory: '#F6F8F2',
      void: '#0C1208', 'deep-d': '#182410',
      'vis-green': '#4A9B5C', 'vis-red': '#C04848', 'vis-yellow': '#D4980C',
    },
    fontFamily: {
      display: ['Syne', 'sans-serif'],
      body: ['DM Sans', 'sans-serif'],
    },
  }},
};
```

**middleware.ts:**
```typescript
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['he', 'en', 'ru', 'fr'],
  defaultLocale: 'he',
  localePrefix: 'as-needed'  // Hebrew = /e/abc123, others = /en/e/abc123
});

// Protected paths — redirect to login if no session token
// Note: Firebase Auth uses __session cookie only with server-side session cookies.
// For MVP: rely on client-side auth redirect (useAuth hook in layout.tsx).
// For production: implement Firebase session cookies via /api/auth route.
export default function middleware(req: NextRequest) {
  return intlMiddleware(req);
}

export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] };
```

**Client-side auth guard (layout.tsx for protected routes):**
```typescript
// app/[locale]/dashboard/layout.tsx
'use client';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);
  if (loading || !user) return <LoadingSkeleton />;
  return <>{children}</>;
}
```

**app/robots.ts (dynamic robots):**
```typescript
import { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: ['/', '/e/'], disallow: ['/dashboard', '/admin', '/create'] },
    sitemap: 'https://openhousemap.online/sitemap.xml',
  };
}
```

**app/sitemap.ts (dynamic sitemap — fetches public events):**
```typescript
import { MetadataRoute } from 'next';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all active public event IDs from Firestore
  // Return [{url, lastModified, changeFrequency: 'daily', priority: 0.8}]
}
```

**manifest.json:**
```json
{
  "name": "OpenHouse Map",
  "short_name": "OpenHouse",
  "description": "כל הבתים הפתוחים — במקום אחד",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F6F8F2",
  "theme_color": "#4A6E30",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192" },
    { "src": "/icons/icon-512.png", "sizes": "512x512" }
  ]
}
```

---

*CLAUDE.md | OpenHouse Map | AdmontREM | May 2026*
*Read this file at the start of every Claude Code session*
