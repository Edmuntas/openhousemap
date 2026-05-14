import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import type { OpenHouseEvent } from "@/types";

export interface ServerEvent extends Omit<OpenHouseEvent, "createdAt" | "updatedAt" | "cancelledAt" | "completedAt" | "archivedAt" | "licenseVerifiedAt"> {
  id: string;
  // Firestore Timestamps serialize as ISO strings for SSR
  createdAt?: string;
  updatedAt?: string;
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
  const toIso = (v: unknown): string | undefined => {
    if (!v) return undefined;
    if (typeof v === "object" && "toDate" in (v as object)) {
      return (v as { toDate: () => Date }).toDate().toISOString();
    }
    return String(v);
  };
  // Normalize known-optional nested shapes so SSR rendering can assume
  // they're present. Older events created before the AI description Cloud
  // Function ran can have `description` as undefined, and accessing
  // `event.description.he` in a server component then throws a 500.
  // Same for realtorSnapshot — keep it safe even on bad legacy docs.
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
  };

  return {
    id: snap.id,
    ...normalized,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  } as ServerEvent;
}
