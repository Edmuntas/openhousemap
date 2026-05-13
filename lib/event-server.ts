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
  return {
    id: snap.id,
    ...(data as OpenHouseEvent),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  } as ServerEvent;
}
