"use client";

import { useEffect, useState } from "react";
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
        setIsFav(snap.exists());
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [eventId, uid]);

  async function toggle() {
    const cur = auth.currentUser;
    if (!cur || !eventId) throw new Error("not signed in");
    const ref = doc(db, "favourites", favId(cur.uid, eventId));
    if (isFav) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, {
        userId: cur.uid,
        eventId,
        createdAt: serverTimestamp(),
      });
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
