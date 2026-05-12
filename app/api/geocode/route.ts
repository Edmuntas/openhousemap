import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface UnifiedFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number]; // [lng, lat]
  context: { id: string; text: string }[];
}

// Server-side geocoding proxy. Uses Mapbox when MAPBOX_SECRET_KEY is set,
// otherwise falls back to OpenStreetMap Nominatim (free, no key required).
// Output is normalized to a Mapbox-style { features: [...] } shape so the
// client can stay agnostic.
//
// Usage: GET /api/geocode?q=Tel%20Aviv
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "q parameter required" }, { status: 400 });
  }

  const key = process.env.MAPBOX_SECRET_KEY;
  let features: UnifiedFeature[];

  if (key) {
    features = await mapboxGeocode(q, key);
  } else {
    features = await nominatimGeocode(q);
  }

  return NextResponse.json(
    { features },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=600" } }
  );
}

async function mapboxGeocode(q: string, key: string): Promise<UnifiedFeature[]> {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?country=IL&types=place,address&limit=5&access_token=${key}`;
  const resp = await fetch(url);
  if (!resp.ok) return [];
  const data = (await resp.json()) as { features?: UnifiedFeature[] };
  return data.features ?? [];
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

async function nominatimGeocode(q: string): Promise<UnifiedFeature[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(q)}&countrycodes=il&format=json&addressdetails=1&limit=5&accept-language=he,en`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "OpenHouseMap/1.0 (https://openhousemap.online)",
    },
  });
  if (!resp.ok) return [];
  const results = (await resp.json()) as NominatimResult[];
  return results.map((r) => {
    const a = r.address ?? {};
    const city = a.city ?? a.town ?? a.village ?? a.municipality ?? "";
    const context: { id: string; text: string }[] = [];
    if (city) context.push({ id: "place.city", text: city });
    if (a.country) context.push({ id: "country.il", text: a.country });
    return {
      id: `nominatim.${r.place_id}`,
      place_name: r.display_name,
      text: r.name ?? a.road ?? city,
      center: [Number(r.lon), Number(r.lat)] as [number, number],
      context,
    };
  });
}
