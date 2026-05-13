import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { Resend } from "resend";
import {
  eventCancelledTemplate,
  eventUpdatedTemplate,
  postEventFeedbackTemplate,
} from "./emails/templates";

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

const FROM = "OpenHouse Map <noreply@openhousemap.online>";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface RsvpDoc {
  eventId: string;
  realtorId: string;
  status: "attending" | "maybe" | "declined";
}

interface UserDoc {
  name?: string;
  email?: string;
  emailOptIn?: boolean;
}

async function getAttendeeEmails(eventId: string): Promise<string[]> {
  const rsvpSnap = await db
    .collection("rsvp")
    .where("eventId", "==", eventId)
    .where("status", "in", ["attending", "maybe"])
    .get();

  if (rsvpSnap.empty) return [];

  const userIds = rsvpSnap.docs.map((d) => (d.data() as RsvpDoc).realtorId);
  const uniqueIds = Array.from(new Set(userIds));

  const emails: string[] = [];
  for (const uid of uniqueIds) {
    const userDoc = await db.doc(`users/${uid}`).get();
    const user = userDoc.data() as UserDoc | undefined;
    if (user?.email && user?.emailOptIn !== false) {
      emails.push(user.email);
    }
  }
  return emails;
}

interface EventData {
  address?: string;
  city?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  realtorSnapshot?: { name?: string; surname?: string };
}

function buildEventInfo(eventId: string, data: EventData) {
  const realtorName = data.realtorSnapshot
    ? `${data.realtorSnapshot.name ?? ""} ${data.realtorSnapshot.surname ?? ""}`.trim()
    : "המתווך";
  return {
    id: eventId,
    address: data.address ?? "",
    city: data.city ?? "",
    date: data.date ?? "",
    startTime: data.startTime ?? "",
    endTime: data.endTime ?? "",
    realtorName,
  };
}

// Triggered when an event is cancelled or its date/time changes.
export const onEventUpdated = onDocumentUpdated(
  {
    document: "events/{eventId}",
    region: "europe-west1",
    secrets: [RESEND_API_KEY],
  },
  async (event) => {
    const before = event.data?.before.data() as EventData | undefined;
    const after = event.data?.after.data() as EventData | undefined;
    const eventId = event.params.eventId;
    if (!before || !after || !eventId) return;

    const apiKey = RESEND_API_KEY.value();
    if (!apiKey) {
      console.warn("[sendEmail] RESEND_API_KEY not configured, skipping send");
      return;
    }

    const resend = new Resend(apiKey);

    const becameCancelled =
      before.status !== "cancelled" && after.status === "cancelled";

    if (becameCancelled) {
      const emails = await getAttendeeEmails(eventId);
      if (emails.length === 0) return;
      const info = buildEventInfo(eventId, after);
      const tpl = eventCancelledTemplate(info);
      await Promise.all(
        emails.map((to) =>
          resend.emails.send({
            from: FROM,
            to,
            subject: tpl.subject,
            html: tpl.html,
          })
        )
      );
      return;
    }

    const changes: { field: string; before: string; after: string }[] = [];
    if (before.date !== after.date) {
      changes.push({
        field: "תאריך",
        before: before.date ?? "",
        after: after.date ?? "",
      });
    }
    if (
      before.startTime !== after.startTime ||
      before.endTime !== after.endTime
    ) {
      changes.push({
        field: "שעות",
        before: `${before.startTime ?? ""}–${before.endTime ?? ""}`,
        after: `${after.startTime ?? ""}–${after.endTime ?? ""}`,
      });
    }
    if (before.address !== after.address) {
      changes.push({
        field: "כתובת",
        before: before.address ?? "",
        after: after.address ?? "",
      });
    }

    if (changes.length === 0) return;

    const emails = await getAttendeeEmails(eventId);
    if (emails.length === 0) return;
    const info = buildEventInfo(eventId, after);
    const tpl = eventUpdatedTemplate(info, changes);
    await Promise.all(
      emails.map((to) =>
        resend.emails.send({
          from: FROM,
          to,
          subject: tpl.subject,
          html: tpl.html,
        })
      )
    );
  }
);

// Scheduled hourly: detect events that just finished, send feedback emails to attendees.
export const sendPostEventFeedback = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "Asia/Jerusalem",
    region: "europe-west1",
    secrets: [RESEND_API_KEY],
  },
  async () => {
    const apiKey = RESEND_API_KEY.value();
    if (!apiKey) return;
    const resend = new Resend(apiKey);

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const snap = await db
      .collection("events")
      .where("date", "<=", todayStr)
      .where("feedbackRequested", "==", false)
      .where("status", "==", "active")
      .limit(50)
      .get();

    for (const doc of snap.docs) {
      const data = doc.data() as EventData;
      const endHour = parseInt((data.endTime ?? "00:00").split(":")[0] ?? "0");
      const endMinute = parseInt(
        (data.endTime ?? "00:00").split(":")[1] ?? "0"
      );
      const endDate = new Date(`${data.date}T${data.endTime ?? "00:00"}:00`);
      void endHour;
      void endMinute;

      if (endDate > now) continue;

      const emails = await getAttendeeEmails(doc.id);
      if (emails.length > 0) {
        const info = buildEventInfo(doc.id, data);
        const tpl = postEventFeedbackTemplate(info);
        await Promise.all(
          emails.map((to) =>
            resend.emails.send({
              from: FROM,
              to,
              subject: tpl.subject,
              html: tpl.html,
            })
          )
        );
      }

      await doc.ref.update({
        feedbackRequested: true,
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);

// Weekly digest — Sunday 09:00 Israel time (skeleton; expand when needed).
export const sendDigest = onSchedule(
  {
    schedule: "0 9 * * 0",
    timeZone: "Asia/Jerusalem",
    region: "europe-west1",
    secrets: [RESEND_API_KEY],
  },
  async () => {
    const apiKey = RESEND_API_KEY.value();
    if (!apiKey) return;
    const resend = new Resend(apiKey);
    void resend;
    // Future: query users with digestOptIn=true, build weekly events digest.
  }
);
