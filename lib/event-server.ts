import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import type { OpenHouseEvent } from "@/types";

export interface ServerEvent
  extends Omit<
    OpenHouseEvent,
    "createdAt" | "updatedAt" | "cancelledAt" | "completedAt" | "archivedAt" | "licenseVerifiedAt"
  > {
  id: string;
  // Firestore Timestamps serialize as ISO strings for the wire to client.
  // Must convert ALL Timestamp-typed fields, not just two — otherwise
  // Next.js refuses to pass the event prop into Client Components like
  // EventActionsClient with "Only plain objects can be passed".
  createdAt: string | null;
  updatedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  archivedAt: string | null;
}

/** Convert any Firestore Timestamp / Date / ISO string → ISO string or null.
 *  Defensive against undefined, null, plain objects with _seconds, etc. */
function toIso(v: unknown): string | null {
  if (v == null) return null;
  // Firestore admin SDK Timestamp instances have `.toDate()`.
  if (typeof v === "object" && v !== null && "toDate" in v) {
    try {
      return (v as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  // Sometimes Timestamps arrive as raw {_seconds, _nanoseconds} JSON
  // (e.g. when documents are written by client SDK with serverTimestamp()
  // before settling). Reconstruct manually.
  if (
    typeof v === "object" &&
    v !== null &&
    "_seconds" in v &&
    typeof (v as { _seconds: unknown })._seconds === "number"
  ) {
    const sec = (v as { _seconds: number })._seconds;
    return new Date(sec * 1000).toISOString();
  }
  if (typeof v === "string") return v;
  return null;
}

/** Fetch a single event document for SSR (server-only). Returns null when not found. */
export async function getEventById(id: string): Promise<ServerEvent | null> {
  const snap = await adminDb.collection("events").doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (!data) return null;
  // Only refuse cancelled events from SSR. Previously this also rejected
  // visibility !== "public", which caused a 404 immediately after a realtor
  // created a "mixed" or "colleagues" event and got redirected to /e/{id}.
  if (data.status === "cancelled") {
    return null;
  }

  // Normalize known-optional nested shapes so SSR rendering can assume
  // they're present. Older events created before the AI description Cloud
  // Function ran can have `description` as undefined.
  // Also strip ALL Firestore Timestamps to ISO strings — Server Components
  // can't pass Timestamp instances to Client Components (throws "Only plain
  // objects can be passed"). This was the root cause of 500s on completed
  // events that had a populated `completedAt`.
  const normalized = {
    ...(data as OpenHouseEvent),
    description: data.description ?? { he: "", en: "", ru: "" },
    realtorSnapshot: data.realtorSnapshot ?? {
      name: "",
      surname: "",
      officeName: "",
      licenseNumber: "",
    },
    photos: Array.isArray(data.photos) ? data.photos : [],
    // Override all Timestamp fields with ISO strings (typed as string|null
    // in ServerEvent above).
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    cancelledAt: toIso(data.cancelledAt),
    completedAt: toIso(data.completedAt),
    archivedAt: toIso(data.archivedAt),
  };

  return {
    id: snap.id,
    ...normalized,
  } as ServerEvent;
}
