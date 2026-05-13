---
name: openhouse-seed
description: Run the Firebase Admin seed / cleanup scripts in tools/ to populate Firestore + Storage with test events, photos, hebrew addresses. Use when test data drifts or after a database reset.
---

# Seed / maintain OpenHouseMap test data

All scripts require the project's `.serviceAccountKey.json` (gitignored). They bypass Firestore + Storage rules via Admin SDK.

## Available tools

| Script | Purpose |
|---|---|
| `tools/seed-events.ts` | Initial 7 test events spread across Israeli cities (Tel Aviv / Jerusalem / Haifa / Ramat Gan / Zikhron Yaakov) |
| `tools/seed-photos.ts` | Uploads real listing photos from `~/Downloads/Listing - 27 February...` to events without photos. 6 photos each. Idempotent. |
| `tools/fix-hebrew-addresses.ts` | Reverse-geocodes existing event addresses to Hebrew via Nominatim. Latin original kept in `addressLatin`. |
| `tools/clean-test-events.ts` | Removes any event with `photos.length === 0` (cleans throwaway test docs). |
| `tools/check-photos.ts` | Diagnostic — lists events with/without photos. |
| `tools/promote-realtor.ts` | Promotes a user UID to admin via custom claims. |

## Run

```bash
GOOGLE_APPLICATION_CREDENTIALS=.serviceAccountKey.json npx tsx tools/<script>.ts
```

## Common flow after Firestore reset

```bash
GOOGLE_APPLICATION_CREDENTIALS=.serviceAccountKey.json npx tsx tools/seed-events.ts
GOOGLE_APPLICATION_CREDENTIALS=.serviceAccountKey.json npx tsx tools/seed-photos.ts
GOOGLE_APPLICATION_CREDENTIALS=.serviceAccountKey.json npx tsx tools/fix-hebrew-addresses.ts
GOOGLE_APPLICATION_CREDENTIALS=.serviceAccountKey.json npx tsx tools/check-photos.ts
```

## Conventions

- All scripts assume `projectId = openhousemap`
- Storage bucket: `openhousemap.firebasestorage.app`
- Idempotent: skip events that already meet the criterion (photos exist, address already Hebrew, etc.)
- Use Promise.all in scripts that touch many docs — sequential is unnecessarily slow

## Pitfall

Storage `makePublic()` requires the service account to have Storage Admin role. If you see `403 Forbidden`, add the role in Firebase Console → IAM. The seed-photos.ts has this already configured.
