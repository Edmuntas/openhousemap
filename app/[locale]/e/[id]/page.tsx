import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEventById } from "@/lib/event-server";
import { formatPrice, formatPriceFull } from "@/lib/utils";
import { visibilityOf } from "@/lib/visibility";
import EventActionsClient from "@/components/events/EventActionsClient";
import EventOwnerActions from "@/components/events/EventOwnerActions";
import PhotoGallery from "@/components/ui/PhotoGallery";
import Footer from "@/components/layout/Footer";
import {
  ArrowRight,
  Calendar as CalendarIcon,
  Sofa,
  Ruler,
  Trees,
  Sprout,
  Sun,
  Layers,
  Bath,
  ParkingSquare,
  FileText,
  User,
  Briefcase,
  BadgeCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
  const title = `${event.address} · ${formatPrice(event.price)}`;
  const sizePart = event.size != null ? ` · ${event.size}m²` : "";
  const roomsPart = event.rooms != null ? ` · ${event.rooms} חד׳` : "";
  const description = `Open House · ${event.date} ${event.startTime}–${event.endTime}${roomsPart}${sizePart}`;
  // WhatsApp/Facebook unfurlers reject images >600KB and >1200px, but the
  // upload code currently writes the same full-size URL into all three fields.
  // The Firebase Resize ext does produce <name>_800x600.jpg in Storage, so we
  // derive that URL from the full one until upload is fixed (TODO #16).
  const photo = event.photos[0];
  const image = deriveMediumImageUrl(photo);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/e/${event.id}`,
      type: "website",
      images: image
        ? [{ url: image, width: 800, height: 600, type: "image/jpeg" }]
        : [],
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

  const vis = visibilityOf(event.visibility);

  return (
    <main className="max-w-3xl mx-auto px-4 pb-10 space-y-6 pt-safe pl-safe pr-safe">
      {/* Top bar: back link (right in RTL) and visibility chip (left in RTL) on
          their own line so they can never collide with the big price below. */}
      <div className="flex items-center justify-between gap-3 pt-3">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-(--color-moss) hover:text-(--color-forest) text-sm font-medium"
        >
          <ArrowRight className="w-4 h-4" />
          חזרה למפה
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
          <CalendarIcon className="w-4 h-4 text-(--color-moss)" aria-hidden />
          <span className="font-medium" dir="ltr">{event.date}</span>
          <span className="text-(--color-moss)">·</span>
          {/* dir=ltr so start time stays on the left of the range — without
              this, RTL flips the dash-separated time pair and you read end
              before start. */}
          <span dir="ltr">{event.startTime}–{event.endTime}</span>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        {event.rooms != null && (
          <Stat label="חדרים" value={String(event.rooms)} Icon={Sofa} />
        )}
        {event.size != null && (
          <Stat label="מ״ר בנוי" value={String(event.size)} Icon={Ruler} />
        )}
        {event.plotSize != null && (
          <Stat label="מ״ר מגרש" value={String(event.plotSize)} Icon={Trees} />
        )}
        {event.gardenSize != null && (
          <Stat label="מ״ר גינה" value={String(event.gardenSize)} Icon={Sprout} />
        )}
        {event.roofTerraceSize != null && (
          <Stat label="מ״ר גג" value={String(event.roofTerraceSize)} Icon={Sun} />
        )}
        {event.floor != null && (
          <Stat
            label="קומה"
            value={`${event.floor}/${event.totalFloors ?? "?"}`}
            Icon={Layers}
          />
        )}
        {event.bathrooms != null && (
          <Stat label="שירותים" value={String(event.bathrooms)} Icon={Bath} />
        )}
        <Stat
          label="חניה"
          value={event.parking ? "כן" : "—"}
          Icon={ParkingSquare}
        />
      </section>

      <PhotoGallery photos={event.photos} alt={event.address} aspect="video" />

      {event.description.he && (
        <section className="relative bg-gradient-to-br from-(--color-cream) to-(--color-cream)/60 rounded-2xl p-6 ring-1 ring-(--color-moss)/10">
          <h2 className="inline-flex items-center gap-2 text-base font-[var(--font-display)] font-semibold mb-3 text-(--color-moss) tracking-wide uppercase">
            <FileText className="w-4 h-4" />
            תיאור
          </h2>
          <p className="text-(--color-deep) leading-relaxed whitespace-pre-line">
            {event.description.he}
          </p>
        </section>
      )}

      <section className="border-t border-(--color-cream) pt-5 flex items-center gap-4">
        {event.realtorSnapshot.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.realtorSnapshot.logoUrl}
            alt={event.realtorSnapshot.officeName || "לוגו משרד"}
            className="w-14 h-14 rounded-2xl object-contain bg-(--color-ivory) ring-1 ring-(--color-moss)/15 shrink-0"
            style={
              event.realtorSnapshot.officeBrandColor
                ? { boxShadow: `0 0 0 2px ${event.realtorSnapshot.officeBrandColor}33` }
                : undefined
            }
          />
        ) : null}
        <div className="text-sm text-(--color-deep) space-y-1.5 min-w-0">
          <p className="inline-flex items-center gap-2 font-semibold">
            <User className="w-4 h-4 text-(--color-moss)" />
            {event.realtorSnapshot.name} {event.realtorSnapshot.surname}
          </p>
          <p className="inline-flex items-center gap-2 text-(--color-moss)">
            <Briefcase className="w-3.5 h-3.5" />
            {event.realtorSnapshot.officeName}
            <BadgeCheck className="w-3.5 h-3.5 ms-2" />
            רישיון <span dir="ltr">{event.realtorSnapshot.licenseNumber}</span>
          </p>
        </div>
      </section>

      <EventActionsClient event={event} />
      <EventOwnerActions
        eventId={event.id}
        ownerId={event.ownerId}
        status={event.status}
        archiveStatus={event.archiveStatus}
      />
      <Footer variant="compact" />
    </main>
  );
}

/** Returns an 800x600 (or original-medium) URL for OG/Twitter preview.
 *  Firebase Resize Images extension generates <name>_800x600.jpg next to the
 *  full upload, but the upload code stores the same URL in all three slots.
 *  We patch the URL by inserting `_800x600` before `.jpg` if the slots are
 *  identical, so unfurlers get a <100KB image instead of the 6MB original. */
function deriveMediumImageUrl(
  photo: { full?: string; medium?: string } | undefined
): string {
  if (!photo?.full) return "";
  // If a real medium URL was stored, trust it.
  if (photo.medium && photo.medium !== photo.full) return photo.medium;
  // Otherwise rewrite "events%2F<id>%2F<name>.jpg?alt=media" →
  //                  "events%2F<id>%2F<name>_800x600.jpg?alt=media".
  // The ?alt=media query stays. Encoded slashes (%2F) and dots in <name>
  // are preserved.
  return photo.full.replace(/\.(jpe?g|png|webp)(\?|$)/i, "_800x600.$1$2");
}

function Stat({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon?: LucideIcon;
}) {
  return (
    <div className="bg-(--color-cream)/70 backdrop-blur rounded-2xl p-3.5 ring-1 ring-(--color-moss)/10 hover:ring-(--color-moss)/25 transition-shadow">
      {Icon && (
        <Icon className="w-4 h-4 text-(--color-moss) mx-auto mb-1.5" aria-hidden />
      )}
      <div className="text-3xl font-[var(--font-display)] font-bold text-(--color-deep) leading-none">
        {value}
      </div>
      <div className="text-xs text-(--color-moss) mt-1.5 tracking-wide font-medium">
        {label}
      </div>
    </div>
  );
}
