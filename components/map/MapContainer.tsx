"use client";

import dynamic from "next/dynamic";
import type { EventWithId } from "@/hooks/useEvents";

// CRITICAL: Leaflet does NOT work with SSR — must be client-only.
// Always import the map via this wrapper; never import Leaflet in a server component.
const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-(--color-cream) animate-pulse">
      <span className="text-(--color-moss)">טוען מפה…</span>
    </div>
  ),
});

interface MapContainerProps {
  onEventSelect?: (event: EventWithId) => void;
  selectedEvent?: EventWithId | null;
}

export default function MapContainer({
  onEventSelect,
  selectedEvent,
}: MapContainerProps) {
  return (
    <MapInner onEventSelect={onEventSelect} selectedEvent={selectedEvent} />
  );
}
