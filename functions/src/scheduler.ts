import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const REGION = "europe-west1";

// Every hour — mark events past startTime as completed + request feedback
export const completeFinishedEvents = onSchedule(
  { schedule: "every 60 minutes", region: REGION, timeZone: "Asia/Jerusalem" },
  async () => {
    const db = getFirestore();
    const nowIso = new Date().toISOString().slice(0, 10);
    const snap = await db
      .collection("events")
      .where("status", "==", "active")
      .where("feedbackRequested", "==", false)
      .where("date", "<=", nowIso)
      .limit(200)
      .get();

    const batch = db.batch();
    snap.docs.forEach((d) => {
      batch.update(d.ref, {
        status: "completed",
        completedAt: FieldValue.serverTimestamp(),
        feedbackRequested: true,
      });
      // TODO: enqueue feedback email send for RSVPs
    });
    if (!snap.empty) await batch.commit();
  }
);

// Every hour — hide cancelled pins older than 48h
export const hideCancelledPins = onSchedule(
  { schedule: "every 60 minutes", region: REGION, timeZone: "Asia/Jerusalem" },
  async () => {
    const db = getFirestore();
    const cutoff = Timestamp.fromMillis(Date.now() - 48 * 60 * 60 * 1000);
    const snap = await db
      .collection("events")
      .where("status", "==", "cancelled")
      .where("mapVisible", "==", true)
      .where("cancelledAt", "<", cutoff)
      .limit(200)
      .get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { mapVisible: false }));
    if (!snap.empty) await batch.commit();
  }
);

// Daily — delete photos from archived events older than 6 months
export const cleanupArchivePhotos = onSchedule(
  { schedule: "every day 03:00", region: REGION, timeZone: "Asia/Jerusalem" },
  async () => {
    const db = getFirestore();
    const sixMonthsAgo = Timestamp.fromMillis(
      Date.now() - 180 * 24 * 60 * 60 * 1000
    );
    const snap = await db
      .collection("events")
      .where("archiveStatus", "==", "archived")
      .where("archivedAt", "<", sixMonthsAgo)
      .limit(100)
      .get();

    const bucket = getStorage().bucket();
    for (const d of snap.docs) {
      await bucket.deleteFiles({ prefix: `events/${d.id}/` });
      await d.ref.update({ photos: [] });
    }
  }
);
