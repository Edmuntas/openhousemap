import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEventById } from "@/lib/event-server";
import { formatPrice, formatPriceFull } from "@/lib/utils";
import EventActionsClient from "@/components/events/EventActionsClient";

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
  const description = `${event.date} ${event.startTime}–${event.endTime} | ${event.rooms} rooms · ${event.size}m²`;
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
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <a
        href="/"
        className="inline-flex items-center gap-1 text-(--color-moss) hover:text-(--color-forest) text-sm"
      >
        ← חזרה למפה
      </a>

      <header className="space-y-2">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h1 className="text-4xl font-[var(--font-display)] text-(--color-deep)">
            {formatPriceFull(event.price)}
          </h1>
          <span
            className="text-sm font-medium px-3 py-1 rounded-full"
            style={{ background: `${vis.color}22`, color: vis.color }}
          >
            {vis.label}
          </span>
        </div>
        <p className="text-xl text-(--color-deep)">{event.address}</p>
        <p className="text-(--color-moss)">
          📅 {event.date} · {event.startTime}–{event.endTime}
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        <Stat label="חדרים" value={String(event.rooms)} />
        <Stat label="מ״ר" value={String(event.size)} />
        {event.floor != null && (
          <Stat
            label="קומה"
            value={`${event.floor}/${event.totalFloors ?? "?"}`}
          />
        )}
        <Stat label="חניה" value={event.parking ? "כן" : "—"} />
      </section>

      {event.photos.length > 0 ? (
        <section className="grid grid-cols-2 gap-2">
          {event.photos.slice(0, 6).map((photo, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={photo.full}
              alt={`${event.address} - תמונה ${i + 1}`}
              className="rounded-xl w-full aspect-video object-cover"
            />
          ))}
        </section>
      ) : (
        <div className="aspect-video bg-(--color-cream) rounded-xl flex items-center justify-center text-(--color-moss)">
          אין תמונות זמינות
        </div>
      )}

      {event.description.he && (
        <section className="bg-(--color-cream) rounded-xl p-5">
          <h2 className="text-lg font-[var(--font-display)] mb-2 text-(--color-deep)">
            תיאור
          </h2>
          <p className="text-(--color-deep) leading-relaxed whitespace-pre-line">
            {event.description.he}
          </p>
        </section>
      )}

      <section className="border-t border-(--color-cream) pt-4 text-sm text-(--color-moss) space-y-1">
        <p>
          {event.realtorSnapshot.name} {event.realtorSnapshot.surname}
        </p>
        <p>
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
    <div className="bg-(--color-cream) rounded-xl p-3">
      <div className="text-2xl font-[var(--font-display)] text-(--color-deep)">
        {value}
      </div>
      <div className="text-xs text-(--color-moss)">{label}</div>
    </div>
  );
}
