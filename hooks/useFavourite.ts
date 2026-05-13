"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  deleteDoc,
  where,
} from "firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export interface FavouriteDoc {
  userId: string;
  eventId: string;
  createdAt: Timestamp;
}

function favId(userId: string, eventId: string): string {
  return `${userId}__${eventId}`;
}

/** Subscribe to whether current user has favourited a given event. */
export function useFavourite(eventId: string | null) {
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(true);
  const uid = auth.currentUser?.uid;
  // Mirror state for the toggle closure so we always read the latest value
  // even if the snapshot listener hasn't fired yet between rapid taps.
  const stateRef = useRef(isFav);
  stateRef.current = isFav;

  useEffect(() => {
    if (!eventId || !uid) {
      setIsFav(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = doc(db, "favourites", favId(uid, eventId));
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const exists = snap.exists();
        setIsFav(exists);
        stateRef.current = exists;
        setLoading(false);
      },
      (err) => {
        console.warn("[favourite] snapshot error", err);
        setLoading(false);
      }
    );
    return unsub;
  }, [eventId, uid]);

  async function toggle() {
    const cur = auth.currentUser;
    if (!cur || !eventId) throw new Error("not signed in");
    const ref = doc(db, "favourites", favId(cur.uid, eventId));
    const wasFav = stateRef.current;
    // Optimistic UI update so the star flips immediately on every tap;
    // the snapshot listener will reconcile after the write lands.
    setIsFav(!wasFav);
    stateRef.current = !wasFav;
    try {
      if (wasFav) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, {
          userId: cur.uid,
          eventId,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      // Revert on failure
      setIsFav(wasFav);
      stateRef.current = wasFav;
      throw err;
    }
  }

  return { isFav, loading, toggle };
}

/** Subscribe to all favourite event IDs for current user. */
export function useMyFavourites() {
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) {
      setEventIds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, "favourites"), where("userId", "==", uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEventIds(snap.docs.map((d) => (d.data() as FavouriteDoc).eventId));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [uid]);

  return { eventIds, loading };
}
