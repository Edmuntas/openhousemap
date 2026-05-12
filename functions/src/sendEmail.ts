import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { Resend } from "resend";

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

const FROM = "OpenHouse Map <noreply@openhousemap.online>";

// Triggered when an event status changes (cancelled/updated → notify RSVPs)
export const onEventUpdated = onDocumentUpdated(
  {
    document: "events/{eventId}",
    region: "europe-west1",
    secrets: [RESEND_API_KEY],
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const becameCancelled =
      before.status !== "cancelled" && after.status === "cancelled";

    if (becameCancelled) {
      // TODO: query rsvp where eventId = event.id, send cancel email
      return;
    }

    const datetimeChanged =
      before.date !== after.date ||
      before.startTime !== after.startTime ||
      before.endTime !== after.endTime;
    if (datetimeChanged) {
      // TODO: query rsvp, send update email
      return;
    }
  }
);

export const onEventCancelled = onDocumentUpdated(
  {
    document: "events/{eventId}",
    region: "europe-west1",
    secrets: [RESEND_API_KEY],
  },
  async () => {
    // Reserved — handled inside onEventUpdated above for now.
  }
);

// Weekly digest — Sunday 09:00 Israel time
export const sendDigest = onSchedule(
  {
    schedule: "0 9 * * 0",
    timeZone: "Asia/Jerusalem",
    region: "europe-west1",
    secrets: [RESEND_API_KEY],
  },
  async () => {
    const resend = new Resend(RESEND_API_KEY.value());
    void resend;
    // TODO: query users with digestOptIn=true, build weekly digest, send
  }
);
