"use client";

import { Navigation2, MessageCircle, CalendarPlus } from "lucide-react";
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
        onClick={downloadIcs}
        className="bg-(--color-gold)/20 text-(--color-deep) py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-(--color-gold)/40 transition-colors active:scale-[0.97]"
      >
        <CalendarPlus className="w-4 h-4" />
        הוסף ליומן
      </button>
    </section>
  );
}
