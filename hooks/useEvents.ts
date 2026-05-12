"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { OpenHouseEvent } from "@/types";
import { todayIso } from "@/lib/utils";

export interface EventWithId extends OpenHouseEvent {
  id: string;
}

export interface UseEventsOptions {
  /** Verified realtor sees mixed + colleagues events; anonymous sees only public. */
  isVerifiedRealtor?: boolean;
  /** Limit number of events. Default 500. */
  max?: number;
}

export interface UseEventsResult {
  events: EventWithId[];
  loading: boolean;
  error: Error | null;
}

/** Real-time listener for active map events. */
export function useEvents({
  isVerifiedRealtor = false,
  max = 500,
}: UseEventsOptions = {}): UseEventsResult {
  const [events, setEvents] = useState<EventWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const today = todayIso();
    const constraints: QueryConstraint[] = isVerifiedRealtor
      ? [
          where("visibility", "in", ["public", "mixed", "colleagues"]),
          where("status", "==", "active"),
          where("mapVisible", "==", true),
          where("date", ">=", today),
          orderBy("date", "asc"),
          limit(max),
        ]
      : [
          where("visibility", "==", "public"),
          where("status", "==", "active"),
          where("mapVisible", "==", true),
          where("date", ">=", today),
          orderBy("date", "asc"),
          limit(max),
        ];

    const q = query(collection(db, "events"), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as OpenHouseEvent) })
        );
        setEvents(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[useEvents] firestore error", err);
        setError(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [isVerifiedRealtor, max]);

  return { events, loading, error };
}
