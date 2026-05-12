"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import type { EventWithId } from "@/hooks/useEvents";

interface EventListProps {
  events: EventWithId[];
  loading: boolean;
  selectedId?: string | null;
  onSelect?: (event: EventWithId) => void;
}

export default function EventList({
  events,
  loading,
  selectedId,
  onSelect,
}: EventListProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-20 rounded-xl bg-(--color-cream) animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-(--color-moss) flex flex-col items-center gap-3">
        <span className="text-4xl">🏠</span>
        <p className="font-medium">אין בתים פתוחים פעילים כרגע</p>
        <p className="text-sm opacity-70">בקרוב יופיעו אירועים חדשים על המפה</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-(--color-cream)">
      {events.map((ev) => (
        <li key={ev.id} className="flex">
          <button
            type="button"
            onClick={() => onSelect?.(ev)}
            aria-label={`הצג ${ev.address} על המפה`}
            className={`flex-1 text-right px-4 py-3 hover:bg-(--color-cream)/60 transition-colors flex items-center gap-3 ${
              selectedId === ev.id ? "bg-(--color-cream)" : ""
            }`}
          >
            <div className="w-16 h-16 rounded-lg bg-(--color-cream) flex-shrink-0 overflow-hidden">
              {ev.photos[0] ? (
                <img
                  src={ev.photos[0].thumb}
                  alt={ev.address}
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
            <div className="flex-1 min-w-0 text-right">
              <div className="font-[var(--font-display)] text-(--color-deep) font-semibold">
                {formatPrice(ev.price)}
              </div>
              <div className="text-sm text-(--color-deep) truncate">
                {ev.address}
              </div>
              <div className="text-xs text-(--color-moss)">
                {ev.date} · {ev.startTime}–{ev.endTime}
                {ev.rooms != null && ` · ${ev.rooms} חד׳`}
              </div>
            </div>
          </button>
          <Link
            href={`/e/${ev.id}`}
            aria-label="פרטים מלאים"
            className="px-3 flex items-center text-(--color-moss) hover:text-(--color-forest) hover:bg-(--color-cream)/60 transition-colors text-lg"
          >
            ←
          </Link>
        </li>
      ))}
    </ul>
  );
}
