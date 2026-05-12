/**
 * Upload real-estate photos from ~/Downloads/Listing - 27 February... into
 * existing seed events so the UI shows actual gallery thumbnails instead of
 * "אין תמונה" placeholders.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json npx tsx tools/seed-photos.ts
 *
 * Bypasses storage + firestore rules via Admin SDK. Dev only.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "openhousemap",
    storageBucket: "openhousemap.firebasestorage.app",
  });
}

const db = getFirestore();
const bucket = getStorage().bucket();

const SOURCE_DIR = join(
  homedir(),
  "Downloads",
  "Listing - 27 February, 2026 01_40 PM - Photos"
);
const PHOTOS_PER_EVENT = 6;
const EVENTS_TO_FILL = 5; // top 5 active events

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function uploadPhoto(eventId: string, idx: number, srcPath: string) {
  const ext = srcPath.split(".").pop()?.toLowerCase() ?? "jpg";
  const destPath = `events/${eventId}/photo_${Date.now()}_${idx}.${ext}`;
  const data = readFileSync(srcPath);
  const file = bucket.file(destPath);
  await file.save(data, {
    contentType: ext === "png" ? "image/png" : "image/jpeg",
    public: true,
    metadata: { cacheControl: "public, max-age=31536000" },
  });
  await file.makePublic();
  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destPath)}?alt=media`;
  return { full: publicUrl, medium: publicUrl, thumb: publicUrl };
}

async function main() {
  const allPhotos = readdirSync(SOURCE_DIR)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .map((f) => join(SOURCE_DIR, f));
  console.log(`Found ${allPhotos.length} source photos`);

  const eventsSnap = await db
    .collection("events")
    .where("status", "==", "active")
    .where("mapVisible", "==", true)
    .limit(EVENTS_TO_FILL)
    .get();

  console.log(`Filling ${eventsSnap.size} events with ${PHOTOS_PER_EVENT} photos each`);

  let pool = shuffle(allPhotos);

  for (const eventDoc of eventsSnap.docs) {
    const existing = eventDoc.data().photos ?? [];
    if (existing.length > 0) {
      console.log(`  skip ${eventDoc.id} — already has ${existing.length} photos`);
      continue;
    }
    if (pool.length < PHOTOS_PER_EVENT) pool = shuffle(allPhotos);
    const batch = pool.splice(0, PHOTOS_PER_EVENT);
    const uploaded = await Promise.all(
      batch.map((src, i) => uploadPhoto(eventDoc.id, i, src))
    );
    await eventDoc.ref.update({ photos: uploaded });
    console.log(
      `  ✓ ${eventDoc.id} — uploaded ${uploaded.length} photos (${eventDoc.data().address})`
    );
  }

  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
