interface IcsEvent {
  id: string;
  address: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  price: number;
  rooms?: number;
}

/** Build an ICS (RFC 5545) calendar file for a single open house event. */
export function buildIcs(e: IcsEvent): string {
  const start = e.date.replace(/-/g, "") + "T" + e.startTime.replace(":", "") + "00";
  const end = e.date.replace(/-/g, "") + "T" + e.endTime.replace(":", "") + "00";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OpenHouse Map//EN",
    "BEGIN:VEVENT",
    `UID:${e.id}@openhousemap.online`,
    `SUMMARY:Open House — ${e.address}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `LOCATION:${e.address}`,
    `DESCRIPTION:₪${e.price.toLocaleString("en-US")}${e.rooms ? ` | ${e.rooms} rooms` : ""} | https://openhousemap.online/e/${e.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
