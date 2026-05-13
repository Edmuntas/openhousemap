/**
 * Seed 2 open-house events in each of the 5 biggest Israeli cities (10 total),
 * with 6 listing photos each from the Downloads folder.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=.serviceAccountKey.json npx tsx tools/seed-cities-events.ts
 *
 * Idempotent: if 5 unfilled cities already have ≥2 active events, exits without
 * creating duplicates.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
} from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import ngeohash from "ngeohash";

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

// Edmont as default owner (admin). Could be replaced with any seed realtor UID.
const OWNER_UID = "cDEAAhJSQ9ZdXQGd6zCVuVERGHO2"; // edmont.nadlan@gmail.com
const OWNER_SNAPSHOT = {
  name: "Edmont",
  surname: "Pogoriler",
  officeName: "OpenHouse Map",
  licenseNumber: "00000",
};

interface CityEvent {
  street: string;       // hebrew street name (without number)
  number: number;
  lat: number;
  lng: number;
  rooms: number;
  bathrooms: number;
  size: number;
  floor?: number;
  totalFloors?: number;
  price: number;
  propertyType: "apartment" | "garden_apartment" | "penthouse" | "duplex" | "house";
  features: {
    parking?: boolean;
    mamad?: boolean;
    mirpeset?: boolean;
    elevator?: boolean;
    ac?: boolean;
    renovated?: boolean;
    garden?: boolean;
    pool?: boolean;
  };
}

const SEED: { city: string; events: CityEvent[] }[] = [
  {
    city: "ירושלים",
    events: [
      {
        street: "יפו",
        number: 24,
        lat: 31.7822,
        lng: 35.2174,
        rooms: 3,
        bathrooms: 1,
        size: 78,
        floor: 3,
        totalFloors: 4,
        price: 2_650_000,
        propertyType: "apartment",
        features: { mamad: true, mirpeset: true, ac: true, renovated: true },
      },
      {
        street: "עזה",
        number: 14,
        lat: 31.7702,
        lng: 35.2080,
        rooms: 5,
        bathrooms: 2,
        size: 145,
        floor: 6,
        totalFloors: 6,
        price: 5_200_000,
        propertyType: "penthouse",
        features: { mamad: true, mirpeset: true, parking: true, elevator: true, ac: true },
      },
    ],
  },
  {
    city: "תל אביב - יפו",
    events: [
      {
        street: "אבן גבירול",
        number: 78,
        lat: 32.0833,
        lng: 34.7811,
        rooms: 4,
        bathrooms: 2,
        size: 105,
        floor: 5,
        totalFloors: 8,
        price: 4_500_000,
        propertyType: "apartment",
        features: { mamad: true, mirpeset: true, parking: true, elevator: true, ac: true, renovated: true },
      },
      {
        street: "פרישמן",
        number: 12,
        lat: 32.0793,
        lng: 34.7722,
        rooms: 3.5,
        bathrooms: 2,
        size: 92,
        floor: 4,
        totalFloors: 5,
        price: 3_950_000,
        propertyType: "apartment",
        features: { mirpeset: true, ac: true, elevator: true },
      },
    ],
  },
  {
    city: "חיפה",
    events: [
      {
        street: "הנביאים",
        number: 30,
        lat: 32.8156,
        lng: 34.9892,
        rooms: 4,
        bathrooms: 2,
        size: 110,
        floor: 2,
        totalFloors: 4,
        price: 1_950_000,
        propertyType: "apartment",
        features: { mamad: true, mirpeset: true, parking: true, ac: true },
      },
      {
        street: "מורדות הכרמל",
        number: 12,
        lat: 32.8120,
        lng: 34.9760,
        rooms: 6,
        bathrooms: 3,
        size: 220,
        price: 3_400_000,
        propertyType: "house",
        features: { mamad: true, parking: true, garden: true, ac: true },
      },
    ],
  },
  {
    city: "ראשון לציון",
    events: [
      {
        street: "הרצל",
        number: 56,
        lat: 31.9730,
        lng: 34.7925,
        rooms: 4,
        bathrooms: 2,
        size: 100,
        floor: 4,
        totalFloors: 9,
        price: 2_450_000,
        propertyType: "apartment",
        features: { mamad: true, mirpeset: true, parking: true, elevator: true, ac: true },
      },
      {
        street: "ז'בוטינסקי",
        number: 88,
        lat: 31.9820,
        lng: 34.7910,
        rooms: 5,
        bathrooms: 2,
        size: 130,
        floor: 7,
        totalFloors: 12,
        price: 3_100_000,
        propertyType: "duplex",
        features: { mamad: true, mirpeset: true, parking: true, elevator: true, ac: true, renovated: true },
      },
    ],
  },
  {
    city: "פתח תקווה",
    events: [
      {
        street: "ביאליק",
        number: 22,
        lat: 32.0855,
        lng: 34.8870,
        rooms: 4,
        bathrooms: 2,
        size: 95,
        floor: 3,
        totalFloors: 6,
        price: 2_150_000,
        propertyType: "apartment",
        features: { mamad: true, mirpeset: true, parking: true, ac: true },
      },
      {
        street: "רוטשילד",
        number: 41,
        lat: 32.0890,
        lng: 34.8820,
        rooms: 4.5,
        bathrooms: 2,
        size: 115,
        floor: 5,
        totalFloors: 8,
        price: 2_750_000,
        propertyType: "garden_apartment",
        features: { mamad: true, parking: true, elevator: true, ac: true, renovated: true },
      },
    ],
  },
];

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
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
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destPath)}?alt=media`;
  return { full: url, medium: url, thumb: url };
}

async function main() {
  const allPhotos = readdirSync(SOURCE_DIR)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .map((f) => join(SOURCE_DIR, f));
  console.log(`Source photos: ${allPhotos.length}`);

  let pool = shuffle(allPhotos);
  let daysOffset = 2;
  let created = 0;

  for (const { city, events } of SEED) {
    for (const ev of events) {
      // Create Firestore doc reference up-front to get the ID for storage path
      const eventRef = db.collection("events").doc();
      const eventId = eventRef.id;

      // Upload photos
      if (pool.length < PHOTOS_PER_EVENT) pool = shuffle(allPhotos);
      const batch = pool.splice(0, PHOTOS_PER_EVENT);
      const photos = await Promise.all(
        batch.map((src, i) => uploadPhoto(eventId, i, src))
      );

      const address = `${ev.street} ${ev.number}, ${city}`;
      const geohash = ngeohash.encode(ev.lat, ev.lng, 9);
      const docData: Record<string, unknown> = {
        ownerId: OWNER_UID,
        address,
        city,
        coordinates: { lat: ev.lat, lng: ev.lng },
        geohash,
        propertyType: ev.propertyType,
        price: ev.price,
        rooms: ev.rooms,
        bathrooms: ev.bathrooms,
        size: ev.size,
        ...(ev.floor != null && { floor: ev.floor }),
        ...(ev.totalFloors != null && { totalFloors: ev.totalFloors }),
        parking: !!ev.features.parking,
        mamad: !!ev.features.mamad,
        mirpeset: !!ev.features.mirpeset,
        elevator: !!ev.features.elevator,
        ac: !!ev.features.ac,
        renovated: !!ev.features.renovated,
        garden: !!ev.features.garden,
        pool: !!ev.features.pool,
        photos,
        date: futureDate(daysOffset),
        startTime: "17:00",
        endTime: "19:00",
        visibility: "public",
        description: { he: "", en: "", ru: "" },
        status: "active",
        archiveStatus: "active",
        cancelledAt: null,
        completedAt: null,
        archivedAt: null,
        feedbackRequested: false,
        mapVisible: true,
        realtorSnapshot: OWNER_SNAPSHOT,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await eventRef.set(docData);
      console.log(`  ✓ ${eventId} — ${address} (₪${ev.price.toLocaleString()}, ${photos.length} photos)`);
      created++;
      daysOffset += 1;
    }
  }
  console.log(`done — created ${created} events`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
