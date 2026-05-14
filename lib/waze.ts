import { formatPrice } from "./utils";

export function wazeDeepLink(address: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

export function whatsappShareLink(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}

interface ShareableEvent {
  address: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
}

/** Single source of truth for the WhatsApp / generic share text.
 *  Previously this template was duplicated byte-identical across
 *  EventPopup.tsx and EventActionsClient.tsx. */
export function buildShareText(event: ShareableEvent): string {
  return `Open House: ${event.address} | ${event.date} ${event.startTime}–${event.endTime} | ${formatPrice(event.price)}`;
}
