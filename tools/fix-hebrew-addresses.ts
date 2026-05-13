/**
 * Re-geocode existing event addresses to Hebrew via Nominatim reverse lookup.
 * Skips events that are already in Hebrew.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=.serviceAccountKey.json npx tsx tools/fix-hebrew-addresses.ts
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "openhousemap",
  });
}

const db = getFirestore();
const HEBREW_RE = /[֐-׿]/;

interface NominatimReverse {
  display_name: string;
  address?: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
}

async function reverseHe(lat: number, lng: number): Promise<{ address: string; city: string } | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?` +
    `lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=he`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "OpenHouseMap/1.0 (https://openhousemap.online)" },
  });
  if (!resp.ok) return null;
  const data = (await resp.json()) as NominatimReverse;
  if (!HEBREW_RE.test(data.display_name)) return null;
  const a = data.address ?? {};
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? "";
  const road = a.road ?? "";
  const num = a.house_number ?? "";
  const street = [road, num].filter(Boolean).join(" ");
  const address = street && city ? `${street}, ${city}` : data.display_name;
  return { address, city };
}

async function main() {
  const snap = await db.collection("events").get();
  console.log(`Scanning ${snap.size} events`);
  let fixed = 0;
  for (const doc of snap.docs) {
    const ev = doc.data();
    if (HEBREW_RE.test(ev.address ?? "")) continue;
    const { lat, lng } = ev.coordinates ?? {};
    if (!lat || !lng) continue;

    const he = await reverseHe(lat, lng);
    if (!he) {
      console.log(`  skip ${doc.id} — no hebrew name for ${lat},${lng}`);
      continue;
    }
    await doc.ref.update({
      address: he.address,
      city: he.city,
      addressLatin: ev.address,
    });
    console.log(`  ✓ ${doc.id}  ${ev.address}  →  ${he.address}`);
    fixed++;
    // Rate-limit nominatim (1/sec policy)
    await new Promise((r) => setTimeout(r, 1200));
  }
  console.log(`done — fixed ${fixed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
