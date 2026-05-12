"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { EventWithId } from "@/hooks/useEvents";
import type { OpenHouseEvent } from "@/types";

/** Realtor's own events listener — uses ownerId+archiveStatus+date index. */
export function useMyEvents(uid: string | null, archive: "active" | "archived" = "active") {
  const [events, setEvents] = useState<EventWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setEvents([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "events"),
      where("ownerId", "==", uid),
      where("archiveStatus", "==", archive),
      orderBy("date", "desc"),
      limit(100)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as OpenHouseEvent) })
        );
        setEvents(list);
        setLoading(false);
      },
      (e) => {
        console.error("[useMyEvents]", e);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [uid, archive]);

  return { events, loading };
}
