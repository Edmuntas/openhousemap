import { NextRequest, NextResponse } from "next/server";
import { getEventById } from "@/lib/event-server";
import { renderShareCardImage } from "@/lib/share-card/render";
import { loadShareCardFonts } from "@/lib/share-card/fonts";
import { generateAiBackground, urlToDataUrl } from "@/lib/share-card/fal-bg";
import type { CardFormat } from "@/lib/share-card/types";

// Node runtime (not edge) so we can read fonts from the filesystem.
export const runtime = "nodejs";
// Cache the response at the edge for an hour, allow stale-while-revalidate
// for a week. Most events don't change frequently, and the AI background is
// regenerated on cache miss.
export const revalidate = 3600;

function parseFormat(s: string | null): CardFormat {
  if (s === "story" || s === "og") return s;
  return "square";
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await ctx.params;
  const format = parseFormat(req.nextUrl.searchParams.get("format"));

  const event = await getEventById(eventId);
  if (!event) {
    return new NextResponse("Event not found", { status: 404 });
  }

  // Generate AI background (may return null on failure / missing key)
  const aiBgPromise = generateAiBackground(event.city);
  // Convert property photo + logo to data URLs in parallel
  const photoPromise = urlToDataUrl(event.photos?.[0]?.full ?? null);
  const logoPromise = urlToDataUrl(event.realtorSnapshot.logoUrl ?? null);

  const [aiBgUrl, photoDataUrl, logoDataUrl] = await Promise.all([
    aiBgPromise,
    photoPromise,
    logoPromise,
  ]);

  // Inline AI bg as data URL too so ImageResponse can embed reliably
  const aiBgDataUrl = await urlToDataUrl(aiBgUrl);

  const fonts = loadShareCardFonts();

  const cardEvent = {
    id: event.id,
    address: event.address,
    city: event.city,
    price: event.price,
    rooms: event.rooms ?? null,
    size: event.size ?? null,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    photoUrl: photoDataUrl,
    realtor: {
      name: `${event.realtorSnapshot.name ?? ""} ${event.realtorSnapshot.surname ?? ""}`.trim(),
      office: event.realtorSnapshot.officeName ?? "",
      logoUrl: logoDataUrl,
      brandColor: event.realtorSnapshot.officeBrandColor ?? null,
    },
  };

  const response = renderShareCardImage({
    event: cardEvent,
    format,
    aiBackgroundUrl: aiBgDataUrl,
    photoUrl: photoDataUrl,
    logoUrl: logoDataUrl,
    fonts,
  });

  // Override cache headers — ImageResponse default is no-cache.
  response.headers.set(
    "Cache-Control",
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
  );
  return response;
}
