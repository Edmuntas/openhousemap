/**
 * Seed 6 fake verified-realtor accounts and have them RSVP to Edmont's
 * open-house events, so the dashboard 'האירועים שלי' tab shows a realistic
 * attendee list per event.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=.serviceAccountKey.json npx tsx tools/seed-test-rsvps.ts
 *
 * Idempotent: existing users are reused; existing RSVPs are overwritten.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  getFirestore,
  FieldValue,
} from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: "openhousemap",
  });
}
const auth = getAuth();
const db = getFirestore();

const OWNER_UID = "cDEAAhJSQ9ZdXQGd6zCVuVERGHO2"; // Edmont

interface TestRealtor {
  email: string;
  password: string;
  name: string;
  surname: string;
  officeName: string;
  licenseNumber: string;
  phone: string;
}

const REALTORS: TestRealtor[] = [
  {
    email: "moshe.cohen@openhousemap.test",
    password: "TestPass123!",
    name: "משה",
    surname: "כהן",
    officeName: "Cohen Realty",
    licenseNumber: "12345",
    phone: "+972501111111",
  },
  {
    email: "david.levi@openhousemap.test",
    password: "TestPass123!",
    name: "דוד",
    surname: "לוי",
    officeName: "Re/Max Star",
    licenseNumber: "23456",
    phone: "+972502222222",
  },
  {
    email: "ruth.mizrahi@openhousemap.test",
    password: "TestPass123!",
    name: "רותי",
    surname: "מזרחי",
    officeName: "Anglo-Saxon",
    licenseNumber: "34567",
    phone: "+972503333333",
  },
  {
    email: "yael.avrahami@openhousemap.test",
    password: "TestPass123!",
    name: "יעל",
    surname: "אברהמי",
    officeName: "Open Doors",
    licenseNumber: "22222",
    phone: "+972504444444",
  },
  {
    email: "avi.israeli@openhousemap.test",
    password: "TestPass123!",
    name: "אבי",
    surname: "ישראלי",
    officeName: "TLV Properties",
    licenseNumber: "55555",
    phone: "+972505555555",
  },
  {
    email: "merav.peri@openhousemap.test",
    password: "TestPass123!",
    name: "מירב",
    surname: "פרי",
    officeName: "Group 7 Real Estate",
    licenseNumber: "77777",
    phone: "+972506666666",
  },
];

const STATUSES = ["attending", "attending", "attending", "maybe", "declined"] as const;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sample<T>(arr: T[], n: number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

async function ensureRealtor(r: TestRealtor): Promise<string> {
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(r.email);
    uid = existing.uid;
    console.log(`  ↻ reuse ${r.email}  uid=${uid}`);
  } catch {
    const created = await auth.createUser({
      email: r.email,
      password: r.password,
      displayName: `${r.name} ${r.surname}`,
      emailVerified: true,
    });
    uid = created.uid;
    console.log(`  + create ${r.email}  uid=${uid}`);
  }

  await auth.setCustomUserClaims(uid, {
    role: "realtor",
    verified: true,
  });

  await db.collection("users").doc(uid).set(
    {
      uid,
      name: r.name,
      surname: r.surname,
      phone: r.phone,
      officeName: r.officeName,
      licenseNumber: r.licenseNumber,
      role: "realtor",
      verificationStatus: "verified",
      verified: true,
      language: "he",
      emailOptIn: false,
      digestOptIn: false,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return uid;
}

async function main() {
  console.log("=== Seeding test realtors ===");
  const realtorUids: { uid: string; profile: TestRealtor }[] = [];
  for (const r of REALTORS) {
    const uid = await ensureRealtor(r);
    realtorUids.push({ uid, profile: r });
  }

  console.log("\n=== Loading Edmont's events ===");
  const events = await db
    .collection("events")
    .where("ownerId", "==", OWNER_UID)
    .where("status", "==", "active")
    .get();
  console.log(`  found ${events.size} active events owned by Edmont`);

  console.log("\n=== Seeding RSVPs ===");
  let count = 0;
  for (const doc of events.docs) {
    const eventId = doc.id;
    const address = doc.data().address;
    // 2-5 realtors RSVP per event
    const n = 2 + Math.floor(Math.random() * 4);
    const picks = sample(realtorUids, n);
    for (const r of picks) {
      const status = pick(STATUSES);
      const rsvpId = `${eventId}__${r.uid}`;
      await db.collection("rsvp").doc(rsvpId).set(
        {
          eventId,
          realtorId: r.uid,
          status,
          realtorSnapshot: {
            name: r.profile.name,
            surname: r.profile.surname,
            officeName: r.profile.officeName,
            licenseNumber: r.profile.licenseNumber,
          },
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      count++;
    }
    console.log(`  ${address}: ${n} RSVPs`);
  }

  console.log(`\ndone — ${realtorUids.length} realtors, ${count} RSVPs across ${events.size} events`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
