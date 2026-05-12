"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  deleteDoc,
  where,
} from "firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export type RsvpStatus = "attending" | "maybe" | "declined";

export interface RsvpDoc {
  eventId: string;
  realtorId: string;
  status: RsvpStatus;
  realtorSnapshot: {
    name: string;
    surname: string;
    officeName: string;
    licenseNumber: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

function rsvpId(eventId: string, realtorId: string): string {
  return `${eventId}__${realtorId}`;
}

/**
 * Subscribe to the current user's RSVP for a given event.
 * Returns current status and a setStatus mutator.
 */
export function useRsvp(eventId: string | null) {
  const [status, setStatus] = useState<RsvpStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!eventId || !uid) {
      setStatus(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = doc(db, "rsvp", rsvpId(eventId, uid));
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) setStatus((snap.data() as RsvpDoc).status);
        else setStatus(null);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [eventId, uid]);

  async function update(next: RsvpStatus | null) {
    const cur = auth.currentUser;
    if (!cur || !eventId) throw new Error("not signed in");
    const ref = doc(db, "rsvp", rsvpId(eventId, cur.uid));
    if (next === null) {
      await deleteDoc(ref);
      return;
    }
    const userDoc = await getDoc(doc(db, "users", cur.uid));
    const u = userDoc.exists() ? userDoc.data() : {};
    await setDoc(
      ref,
      {
        eventId,
        realtorId: cur.uid,
        status: next,
        realtorSnapshot: {
          name: u.name ?? "",
          surname: u.surname ?? "",
          officeName: u.officeName ?? "",
          licenseNumber: u.licenseNumber ?? "",
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  return { status, loading, update };
}

/**
 * Subscribe to all RSVPs for an event (intended for the event owner).
 */
export function useEventRsvps(eventId: string | null) {
  const [items, setItems] = useState<(RsvpDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, "rsvp"), where("eventId", "==", eventId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as RsvpDoc) }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [eventId]);

  return { items, loading };
}
