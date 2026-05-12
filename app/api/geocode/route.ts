import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface UnifiedFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number]; // [lng, lat]
  context: { id: string; text: string }[];
  _score: number;
}

// Server-side geocoding proxy. Combines Photon (Komoot/OSM, no key) for
// Latin queries with Nominatim (OSM) which handles Hebrew better, dedupes
// by location, and returns the union in Mapbox-style { features: [...] }.
// Falls back to Mapbox if MAPBOX_SECRET_KEY is configured.
//
// Usage: GET /api/geocode?q=Tel%20Aviv
const ISRAEL_BBOX = "34.27,29.5,35.9,33.3";

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
    const [photonResults, nominatimResults] = await Promise.all([
      photonGeocode(q).catch(() => [] as UnifiedFeature[]),
      nominatimGeocode(q).catch(() => [] as UnifiedFeature[]),
    ]);
    features = dedupeFeatures([...photonResults, ...nominatimResults]).slice(0, 8);
  }

  return NextResponse.json(
    { features: features.map(({ _score, ...rest }) => rest) }, // eslint-disable-line @typescript-eslint/no-unused-vars
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=600" } }
  );
}

function dedupeFeatures(items: UnifiedFeature[]): UnifiedFeature[] {
  const seen = new Map<string, UnifiedFeature>();
  for (const f of items.sort((a, b) => b._score - a._score)) {
    const key = `${f.center[0].toFixed(4)},${f.center[1].toFixed(4)}`;
    if (!seen.has(key)) seen.set(key, f);
  }
  return [...seen.values()];
}

async function mapboxGeocode(q: string, key: string): Promise<UnifiedFeature[]> {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?country=IL&types=place,address&limit=5&access_token=${key}`;
  const resp = await fetch(url);
  if (!resp.ok) return [];
  const data = (await resp.json()) as { features?: Omit<UnifiedFeature, "_score">[] };
  return (data.features ?? []).map((f, i) => ({ ...f, _score: 100 - i }));
}

interface PhotonResponse {
  features: {
    geometry: { coordinates: [number, number] };
    properties: {
      osm_id: number;
      osm_value?: string;
      name?: string;
      street?: string;
      housenumber?: string;
      city?: string;
      country?: string;
      postcode?: string;
      state?: string;
    };
  }[];
}

async function photonGeocode(q: string): Promise<UnifiedFeature[]> {
  // Try both languages — Photon's hebrew index is sparse, en finds more.
  const langs = /[֐-׿]/.test(q) ? ["he", "en"] : ["en", "he"];
  const all: UnifiedFeature[] = [];
  for (const lang of langs) {
    const url =
      `https://photon.komoot.io/api/` +
      `?q=${encodeURIComponent(q)}&lang=${lang}&limit=5&bbox=${ISRAEL_BBOX}`;
    const resp = await fetch(url);
    if (!resp.ok) continue;
    const data = (await resp.json()) as PhotonResponse;
    for (const f of data.features ?? []) {
      const p = f.properties;
      if (p.country && p.country !== "Israel" && p.country !== "ישראל") continue;
      const street = p.street ?? "";
      const num = p.housenumber ?? "";
      const city = p.city ?? "";
      const parts = [p.name, [street, num].filter(Boolean).join(" "), city]
        .filter(Boolean);
      const placeName = [...new Set(parts)].join(", ");
      if (!placeName) continue;
      const isAddress = !!(street || num);
      all.push({
        id: `photon.${p.osm_id}.${lang}`,
        place_name: placeName,
        text: p.name ?? street ?? city,
        center: f.geometry.coordinates,
        context: city ? [{ id: "place.city", text: city }] : [],
        _score: (isAddress ? 80 : 60) + (lang === "he" ? 5 : 0),
      });
    }
  }
  return all;
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  class?: string;
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
    const isAddress = !!(a.road || a.house_number);
    return {
      id: `nominatim.${r.place_id}`,
      place_name: r.display_name,
      text: r.name ?? a.road ?? city,
      center: [Number(r.lon), Number(r.lat)] as [number, number],
      context,
      _score: isAddress ? 75 : 55,
    };
  });
}
