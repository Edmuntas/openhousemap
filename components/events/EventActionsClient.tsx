"use client";

import { useState } from "react";
import { Navigation2, MessageCircle, CalendarPlus, ImageDown, X } from "lucide-react";
import { wazeDeepLink, whatsappShareLink } from "@/lib/waze";
import { buildIcs } from "@/lib/ics";
import { formatPrice } from "@/lib/utils";
import type { ServerEvent } from "@/lib/event-server";

interface Props {
  event: ServerEvent;
}

export default function EventActionsClient({ event }: Props) {
  const eventUrl = `https://openhousemap.online/e/${event.id}`;
  const shareText = `Open House: ${event.address} | ${event.date} ${event.startTime}–${event.endTime} | ${formatPrice(event.price)}`;
  const [shareOpen, setShareOpen] = useState(false);

  function downloadIcs() {
    const ics = buildIcs({
      id: event.id,
      address: event.address,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      price: event.price,
      rooms: event.rooms,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `openhouse-${event.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2">
      <a
        href={wazeDeepLink(event.address)}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-(--color-moss) text-(--color-ivory) py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-(--color-forest) transition-colors active:scale-[0.97]"
      >
        <Navigation2 className="w-4 h-4" />
        Waze
      </a>
      <a
        href={whatsappShareLink(shareText, eventUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-(--color-cream) text-(--color-deep) py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-(--color-sage) transition-colors active:scale-[0.97]"
      >
        <MessageCircle className="w-4 h-4" />
        WhatsApp
      </a>
      <button
        type="button"
        onClick={() => setShareOpen(true)}
        className="bg-(--color-deep) text-(--color-ivory) py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-(--color-forest) transition-colors active:scale-[0.97] md:col-span-3"
      >
        <ImageDown className="w-4 h-4" />
        תמונה לשיתוף
      </button>
      <button
        type="button"
        onClick={downloadIcs}
        className="bg-(--color-gold)/20 text-(--color-deep) py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-(--color-gold)/40 transition-colors active:scale-[0.97] md:col-span-3"
      >
        <CalendarPlus className="w-4 h-4" />
        הוסף ליומן
      </button>

      {shareOpen && (
        <ShareCardModal
          eventId={event.id}
          onClose={() => setShareOpen(false)}
        />
      )}
    </section>
  );
}

function ShareCardModal({
  eventId,
  onClose,
}: {
  eventId: string;
  onClose: () => void;
}) {
  const formats: { id: "square" | "story" | "og"; label: string; aspect: string }[] = [
    { id: "square", label: "Instagram / Facebook", aspect: "aspect-square" },
    { id: "story", label: "WhatsApp Status / Stories", aspect: "aspect-[9/16]" },
    { id: "og", label: "Link preview (WhatsApp)", aspect: "aspect-[1200/630]" },
  ];

  function downloadFormat(format: "square" | "story" | "og") {
    const url = `/api/share-card/${eventId}?format=${format}&download=1`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `openhouse-${eventId}-${format}.png`;
    a.target = "_blank";
    a.click();
  }

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-(--color-ivory) rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-(--color-deep)">
              תמונה לשיתוף
            </h2>
            <p className="text-sm text-(--color-moss)">
              בחר פורמט להורדה ושיתוף ברשתות
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="w-9 h-9 rounded-full bg-(--color-cream) text-(--color-deep) flex items-center justify-center hover:bg-(--color-sage)/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="grid gap-3">
          {formats.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => downloadFormat(f.id)}
              className="group flex items-stretch gap-3 bg-(--color-cream)/55 ring-1 ring-(--color-moss)/10 hover:ring-(--color-moss)/30 hover:bg-(--color-cream) rounded-2xl p-3 transition-all text-right"
            >
              <div
                className={`relative ${f.aspect} h-24 rounded-xl overflow-hidden bg-(--color-deep) shrink-0`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/share-card/${eventId}?format=${f.id}`}
                  alt={f.label}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="text-sm font-semibold text-(--color-deep)">
                  {f.label}
                </div>
                <div className="text-xs text-(--color-moss) mt-0.5">
                  לחץ להורדה
                </div>
              </div>
              <ImageDown className="w-4 h-4 text-(--color-moss) self-center shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
