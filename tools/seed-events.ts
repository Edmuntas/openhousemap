/**
 * Seed test events into Firestore for development.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json npx tsx tools/seed-events.ts
 *
 * Or via Application Default Credentials:
 *   gcloud auth application-default login
 *   npx tsx tools/seed-events.ts
 *
 * Bypasses Firestore security rules via Admin SDK. Use only for dev seeding.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import ngeohash from "ngeohash";

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "openhousemap",
  });
}

const db = getFirestore();

// Sample listings spread across major Israeli cities
const seeds = [
  {
    address: "רוטשילד 22, תל אביב",
    city: "Tel Aviv",
    coordinates: { lat: 32.0653, lng: 34.7747 },
    propertyType: "apartment",
    price: 3_200_000,
    rooms: 4,
    bathrooms: 2,
    size: 110,
    floor: 3,
    totalFloors: 8,
    parking: true,
    mamad: true,
    mirpeset: true,
    date: addDays(2),
    startTime: "17:00",
    endTime: "19:00",
    visibility: "public" as const,
    realtor: { name: "משה", surname: "כהן", office: "Cohen Realty", license: "12345" },
  },
  {
    address: "אבן גבירול 110, תל אביב",
    city: "Tel Aviv",
    coordinates: { lat: 32.0853, lng: 34.7818 },
    propertyType: "apartment",
    price: 2_900_000,
    rooms: 3,
    bathrooms: 1,
    size: 85,
    floor: 5,
    totalFloors: 5,
    parking: false,
    mamad: false,
    mirpeset: true,
    date: addDays(0),
    startTime: "11:00",
    endTime: "13:00",
    visibility: "public" as const,
    realtor: { name: "דנה", surname: "לוי", office: "Premium Estate", license: "54321" },
  },
  {
    address: "Yefe Nof 8, ירושלים",
    city: "Jerusalem",
    coordinates: { lat: 31.7857, lng: 35.2104 },
    propertyType: "penthouse",
    price: 7_500_000,
    rooms: 5,
    bathrooms: 3,
    size: 180,
    floor: 10,
    totalFloors: 10,
    parking: true,
    mamad: true,
    mirpeset: true,
    date: addDays(5),
    startTime: "16:00",
    endTime: "18:00",
    visibility: "public" as const,
    realtor: { name: "אבי", surname: "פרץ", office: "Capital Homes", license: "67890" },
  },
  {
    address: "Herzl 34, חיפה",
    city: "Haifa",
    coordinates: { lat: 32.8156, lng: 34.989 },
    propertyType: "apartment",
    price: 1_650_000,
    rooms: 3,
    bathrooms: 1,
    size: 75,
    floor: 2,
    totalFloors: 4,
    parking: false,
    mamad: false,
    mirpeset: false,
    date: addDays(7),
    startTime: "15:00",
    endTime: "17:00",
    visibility: "public" as const,
    realtor: { name: "רותי", surname: "מזרחי", office: "North Realty", license: "11111" },
  },
  {
    address: "אבן עזרא 5, רמת גן",
    city: "Ramat Gan",
    coordinates: { lat: 32.0789, lng: 34.815 },
    propertyType: "apartment",
    price: 2_400_000,
    rooms: 4,
    bathrooms: 2,
    size: 95,
    floor: 4,
    totalFloors: 6,
    parking: true,
    mamad: true,
    mirpeset: true,
    date: addDays(3),
    startTime: "10:00",
    endTime: "12:00",
    visibility: "public" as const,
    realtor: { name: "יעל", surname: "אברהמי", office: "Open Doors", license: "22222" },
  },
];

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log(`Seeding ${seeds.length} events to project ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "openhousemap"}...`);
  for (const s of seeds) {
    const ref = db.collection("events").doc();
    const geohash = ngeohash.encode(s.coordinates.lat, s.coordinates.lng, 9);
    await ref.set({
      ownerId: "seed-script",
      address: s.address,
      city: s.city,
      coordinates: s.coordinates,
      geohash,
      propertyType: s.propertyType,
      price: s.price,
      rooms: s.rooms,
      bathrooms: s.bathrooms,
      size: s.size,
      floor: s.floor,
      totalFloors: s.totalFloors,
      parking: s.parking,
      mamad: s.mamad,
      mirpeset: s.mirpeset,
      photos: [],
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      visibility: s.visibility,
      description: {
        he: `דירה ב${s.city} עם ${s.rooms} חדרים, ${s.size} מ"ר. מיקום מצוין.`,
        en: `${s.rooms}-room apartment in ${s.city}, ${s.size}m². Excellent location.`,
        ru: `Квартира в ${s.city}: ${s.rooms} комнат, ${s.size} м². Отличное расположение.`,
      },
      realtorInputText: "",
      status: "active",
      archiveStatus: "active",
      cancelledAt: null,
      completedAt: null,
      archivedAt: null,
      feedbackRequested: false,
      mapVisible: true,
      realtorSnapshot: {
        name: s.realtor.name,
        surname: s.realtor.surname,
        officeName: s.realtor.office,
        licenseNumber: s.realtor.license,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`  + ${s.address} (${s.city}) → ${ref.id}`);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
