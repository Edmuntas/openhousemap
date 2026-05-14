/**
 * One-shot backfill: copies users.logoUrl + officeBrandColor into each
 * event's realtorSnapshot, so existing events get branding without
 * waiting for the realtor to re-edit them.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=.serviceAccountKey.json npx tsx tools/backfill-realtor-logos.ts
 *
 * Idempotent — safe to re-run after realtors update their logo.
 */
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credsPath) {
  console.error("Set GOOGLE_APPLICATION_CREDENTIALS=.serviceAccountKey.json");
  process.exit(1);
}
const serviceAccount = JSON.parse(readFileSync(credsPath, "utf-8"));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

async function main() {
  console.log("=== Backfilling realtor logos into events ===");

  // Build a cache of uid → {logoUrl, officeBrandColor} from users collection
  const users = await db.collection("users").get();
  const brandByUid = new Map<string, { logoUrl: string | null; officeBrandColor: string | null }>();
  for (const doc of users.docs) {
    const data = doc.data();
    brandByUid.set(doc.id, {
      logoUrl: data.logoUrl ?? null,
      officeBrandColor: data.officeBrandColor ?? null,
    });
  }
  console.log(`  loaded ${brandByUid.size} users into cache`);

  // Iterate all events and patch realtorSnapshot
  const events = await db.collection("events").get();
  let updated = 0;
  let skipped = 0;

  for (const evDoc of events.docs) {
    const ev = evDoc.data();
    const ownerId = ev.ownerId;
    const brand = brandByUid.get(ownerId);
    if (!brand) {
      skipped++;
      continue;
    }
    const currentSnap = ev.realtorSnapshot ?? {};
    if (
      currentSnap.logoUrl === brand.logoUrl &&
      currentSnap.officeBrandColor === brand.officeBrandColor
    ) {
      skipped++;
      continue;
    }
    await evDoc.ref.update({
      "realtorSnapshot.logoUrl": brand.logoUrl,
      "realtorSnapshot.officeBrandColor": brand.officeBrandColor,
      updatedAt: FieldValue.serverTimestamp(),
    });
    updated++;
    console.log(`  + patched ${evDoc.id}  owner=${ownerId.slice(0, 8)}  logo=${brand.logoUrl ? "yes" : "no"}`);
  }

  console.log(`=== Done: ${updated} updated, ${skipped} skipped (already up-to-date or no user) ===`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
