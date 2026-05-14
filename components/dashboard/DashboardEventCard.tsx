"use client";

import Link from "next/link";
import { useEventRsvps } from "@/hooks/useRsvp";
import { formatPrice } from "@/lib/utils";
import type { EventWithId } from "@/hooks/useEvents";
import EventOwnerActions from "@/components/events/EventOwnerActions";

export default function DashboardEventCard({ event }: { event: EventWithId }) {
  const { items, loading } = useEventRsvps(event.id);

  const attending = items.filter((r) => r.status === "attending");
  const maybe = items.filter((r) => r.status === "maybe");
  const declined = items.filter((r) => r.status === "declined");

  return (
    <li className="bg-(--color-cream)/60 hover:bg-(--color-cream) transition-colors rounded-xl overflow-hidden">
      <Link href={`/e/${event.id}`} className="flex items-center gap-3 p-4">
        <div className="flex-1">
          <div className="font-[var(--font-display)] text-(--color-deep) font-semibold">
            {formatPrice(event.price)}
          </div>
          <div className="text-sm text-(--color-deep)">{event.address}</div>
          <div className="text-xs text-(--color-moss)">
            <span dir="ltr">{event.date}</span> ·{" "}
            <span dir="ltr">{event.startTime}–{event.endTime}</span>
            {event.rooms != null && ` · ${event.rooms} חד׳`}
          </div>
        </div>
        <span className="text-(--color-moss)">←</span>
      </Link>

      {!loading && items.length > 0 && (
        <div className="px-4 pb-3 pt-1 space-y-2">
          <div className="flex gap-3 text-xs text-(--color-moss)">
            {attending.length > 0 && (
              <span>
                <span className="text-(--vis-green)">●</span> {attending.length} מגיעים
              </span>
            )}
            {maybe.length > 0 && (
              <span>
                <span className="text-(--vis-yellow)">●</span> {maybe.length} אולי
              </span>
            )}
            {declined.length > 0 && (
              <span>
                <span className="text-(--vis-red)">●</span> {declined.length} לא
              </span>
            )}
          </div>
          {attending.length > 0 && (
            <ul className="text-xs text-(--color-deep) space-y-0.5">
              {attending.slice(0, 5).map((r) => (
                <li key={r.id}>
                  ✓ {r.realtorSnapshot.name} {r.realtorSnapshot.surname}
                  {r.realtorSnapshot.officeName && (
                    <span className="text-(--color-moss)">
                      {" · "}
                      {r.realtorSnapshot.officeName}
                    </span>
                  )}
                </li>
              ))}
              {attending.length > 5 && (
                <li className="text-(--color-moss)">
                  + עוד {attending.length - 5}...
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      <div className="px-4 pb-4">
        <EventOwnerActions
          eventId={event.id}
          ownerId={event.ownerId}
          status={event.status}
          archiveStatus={event.archiveStatus}
        />
      </div>
    </li>
  );
}
