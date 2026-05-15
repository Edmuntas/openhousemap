import { formatPrice } from "./utils";

export function wazeDeepLink(address: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

export function whatsappShareLink(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
}

export function facebookShareLink(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

interface ShareableEvent {
  address: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  rooms?: number | null;
}

/** Single source of truth for the WhatsApp / generic share text.
 *  Multi-line so RTL Hebrew lines and LTR numbers don't collide on one row
 *  (the previous "Hebrew | digits | Hebrew" pipe-joined string rendered as
 *  garbled bidi in WhatsApp). One concept per line — the unfurler's link
 *  preview shows the OG image+title separately anyway. */
export function buildShareText(event: ShareableEvent): string {
  const lines = [
    "🏠 בית פתוח",
    event.address,
    `📅 ${event.date} · ${event.startTime}–${event.endTime}`,
    event.rooms != null
      ? `${formatPrice(event.price)} · ${event.rooms} חד׳`
      : formatPrice(event.price),
  ];
  return lines.join("\n");
}
