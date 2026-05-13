import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEventById } from "@/lib/event-server";
import { formatPrice, formatPriceFull } from "@/lib/utils";
import EventActionsClient from "@/components/events/EventActionsClient";
import PhotoGallery from "@/components/ui/PhotoGallery";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) {
    return { title: "Event not found" };
  }
  const title = `Open House — ${event.address} | ${formatPrice(event.price)}`;
  const sizePart = event.size != null ? ` · ${event.size}m²` : "";
  const roomsPart = event.rooms != null ? ` | ${event.rooms} rooms` : "";
  const description = `${event.date} ${event.startTime}–${event.endTime}${roomsPart}${sizePart}`;
  const image = event.photos[0]?.full ?? "";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/e/${event.id}`,
      type: "website",
      images: image ? [{ url: image }] : [],
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const visibilityLabel: Record<string, { label: string; color: string }> = {
    public: { label: "🟢 פתוח לציבור", color: "#4A9B5C" },
    mixed: { label: "🟡 משולב", color: "#D4980C" },
    colleagues: { label: "🔴 קולגות", color: "#C04848" },
  };
  const vis = visibilityLabel[event.visibility] ?? visibilityLabel.public;

  return (
    <main className="max-w-3xl mx-auto px-4 pb-10 space-y-6 pt-safe pl-safe pr-safe">
      {/* Top bar: back link (right in RTL) and visibility chip (left in RTL) on
          their own line so they can never collide with the big price below. */}
      <div className="flex items-center justify-between gap-3 pt-3">
        <a
          href="/"
          className="inline-flex items-center gap-1 text-(--color-moss) hover:text-(--color-forest) text-sm font-medium"
        >
          ← חזרה למפה
        </a>
        <span
          className="text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm"
          style={{ background: `${vis.color}22`, color: vis.color }}
        >
          {vis.label}
        </span>
      </div>

      <header className="space-y-3">
        <h1 className="text-4xl sm:text-5xl font-[var(--font-display)] font-bold text-(--color-deep) leading-none tracking-tight break-words">
          {formatPriceFull(event.price)}
        </h1>
        <p className="text-lg sm:text-xl text-(--color-deep) font-medium">
          {event.address}
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--color-cream) text-(--color-deep) text-sm">
          <span aria-hidden>📅</span>
          <span className="font-medium">{event.date}</span>
          <span className="text-(--color-moss)">·</span>
          <span>{event.startTime}–{event.endTime}</span>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        {event.rooms != null && <Stat label="חדרים" value={String(event.rooms)} />}
        {event.size != null && <Stat label="מ״ר בנוי" value={String(event.size)} />}
        {event.plotSize != null && <Stat label="מ״ר מגרש" value={String(event.plotSize)} />}
        {event.gardenSize != null && <Stat label="מ״ר גינה" value={String(event.gardenSize)} />}
        {event.roofTerraceSize != null && (
          <Stat label="מ״ר גג" value={String(event.roofTerraceSize)} />
        )}
        {event.floor != null && (
          <Stat
            label="קומה"
            value={`${event.floor}/${event.totalFloors ?? "?"}`}
          />
        )}
        {event.bathrooms != null && (
          <Stat label="שירותים" value={String(event.bathrooms)} />
        )}
        <Stat label="חניה" value={event.parking ? "כן" : "—"} />
      </section>

      <PhotoGallery photos={event.photos} alt={event.address} aspect="video" />

      {event.description.he && (
        <section className="relative bg-gradient-to-br from-(--color-cream) to-(--color-cream)/60 rounded-2xl p-6 ring-1 ring-(--color-moss)/10">
          <h2 className="text-base font-[var(--font-display)] font-semibold mb-3 text-(--color-moss) tracking-wide uppercase">
            תיאור
          </h2>
          <p className="text-(--color-deep) leading-relaxed whitespace-pre-line">
            {event.description.he}
          </p>
        </section>
      )}

      <section className="border-t border-(--color-cream) pt-5 text-sm text-(--color-deep) space-y-1">
        <p className="font-medium">
          {event.realtorSnapshot.name} {event.realtorSnapshot.surname}
        </p>
        <p className="text-(--color-moss)">
          {event.realtorSnapshot.officeName} · רישיון{" "}
          {event.realtorSnapshot.licenseNumber}
        </p>
      </section>

      <EventActionsClient event={event} />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-(--color-cream)/70 backdrop-blur rounded-2xl p-3.5 ring-1 ring-(--color-moss)/10 hover:ring-(--color-moss)/25 transition-shadow">
      <div className="text-3xl font-[var(--font-display)] font-semibold text-(--color-deep) leading-none">
        {value}
      </div>
      <div className="text-xs text-(--color-moss) mt-1.5 tracking-wide">
        {label}
      </div>
    </div>
  );
}
