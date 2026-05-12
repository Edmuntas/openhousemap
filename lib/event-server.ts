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
  // Only return events that are publicly viewable on map (matches Firestore rules)
  if (data.visibility !== "public" || data.status !== "active" || data.mapVisible !== true) {
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
