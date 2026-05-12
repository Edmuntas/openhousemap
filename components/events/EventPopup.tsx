"use client";

import { useEffect, useState } from "react";
import { formatPrice, formatPriceFull } from "@/lib/utils";
import { wazeDeepLink, whatsappShareLink } from "@/lib/waze";
import type { EventWithId } from "@/hooks/useEvents";

interface EventPopupProps {
  event: EventWithId | null;
  onClose: () => void;
}

export default function EventPopup({ event, onClose }: EventPopupProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (!event) return null;

  const visibilityLabel: Record<string, { label: string; color: string }> = {
    public: { label: "🟢 פתוח לציבור", color: "#4A9B5C" },
    mixed: { label: "🟡 משולב", color: "#D4980C" },
    colleagues: { label: "🔴 לקולגות בלבד", color: "#C04848" },
  };
  const vis = visibilityLabel[event.visibility] ?? visibilityLabel.public;
  const eventUrl = `https://openhousemap.online/e/${event.id}`;
  const shareText = `Open House: ${event.address} | ${event.date} ${event.startTime}–${event.endTime} | ${formatPrice(event.price)}`;

  const containerClass = isMobile
    ? "fixed inset-x-0 bottom-0 z-[2000] bg-(--surface) rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto animate-slide-up"
    : "fixed top-1/2 right-6 -translate-y-1/2 z-[2000] w-[420px] max-h-[80vh] overflow-y-auto bg-(--surface) rounded-2xl shadow-2xl";

  return (
    <div className={containerClass} role="dialog" aria-modal="true">
      <button
        type="button"
        onClick={onClose}
        aria-label="סגור"
        className="absolute top-3 right-3 rtl:right-auto rtl:left-3 w-9 h-9 rounded-full bg-(--color-cream) hover:bg-(--color-sage) text-(--color-deep) flex items-center justify-center transition-colors"
      >
        ✕
      </button>
      {isMobile && (
        <div className="flex justify-center pt-2 pb-1">
          <span className="w-12 h-1.5 rounded-full bg-(--color-cream)" />
        </div>
      )}

      <div className="aspect-video bg-(--color-cream) flex items-center justify-center text-(--color-moss) text-sm">
        {event.photos.length > 0 ? (
          <img
            src={event.photos[0].medium}
            alt={event.address}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>אין תמונה</span>
        )}
      </div>

      <div className="p-5 space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-2xl font-[var(--font-display)] text-(--color-deep)">
            {formatPriceFull(event.price)}
          </h2>
          <span
            className="text-xs font-medium px-2 py-1 rounded-full"
            style={{
              background: `${vis.color}22`,
              color: vis.color,
            }}
          >
            {vis.label}
          </span>
        </div>

        <p className="text-(--color-deep) font-medium leading-tight">{event.address}</p>
        <p className="text-sm text-(--color-moss)">
          {event.rooms} חד׳ · {event.size}m²
          {event.floor != null && ` · קומה ${event.floor}/${event.totalFloors ?? "?"}`}
          {event.mamad && " · ממ״ד"}
          {event.mirpeset && " · מרפסת"}
          {event.parking && " · חניה"}
        </p>

        <p className="text-(--color-deep) text-sm">
          📅 {event.date} · {event.startTime}–{event.endTime}
        </p>

        {event.description.he && (
          <p className="text-sm text-(--color-deep) leading-relaxed">
            {event.description.he}
          </p>
        )}

        <div className="border-t border-(--color-cream) pt-3 text-xs text-(--color-moss)">
          {event.realtorSnapshot.name} {event.realtorSnapshot.surname} ·{" "}
          {event.realtorSnapshot.officeName} · רישיון{" "}
          {event.realtorSnapshot.licenseNumber}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <a
            href={wazeDeepLink(event.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-(--color-moss) text-(--color-ivory) py-2.5 px-4 rounded-xl text-sm font-medium text-center hover:bg-(--color-forest) transition-colors"
          >
            🚗 Waze
          </a>
          <a
            href={whatsappShareLink(shareText, eventUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-(--color-cream) text-(--color-deep) py-2.5 px-4 rounded-xl text-sm font-medium text-center hover:bg-(--color-sage) transition-colors"
          >
            📤 WhatsApp
          </a>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 280ms cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}
