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

// Server-side geocoding proxy.
//
// Query params:
//   q       — search text (required)
//   type    — "city" or "address" (optional; default unconstrained)
//   near    — "lat,lng" bias for ranking address results (optional)
//   city    — when type=address, post-filter to keep only matches in this city
//
// Always returns Mapbox-style { features: [...] }.
const ISRAEL_BBOX = "34.27,29.5,35.9,33.3";
const CITY_OSM_VALUES = new Set(["city", "town", "village", "suburb"]);
const CITY_NOMINATIM_TYPES = new Set([
  "city",
  "town",
  "village",
  "hamlet",
  "suburb",
  "administrative",
]);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "q parameter required" }, { status: 400 });
  }
  const type = sp.get("type") as "city" | "address" | null;
  const near = sp.get("near"); // "lat,lng"
  const city = sp.get("city")?.trim().toLowerCase();

  let nearLatLng: { lat: number; lng: number } | null = null;
  if (near) {
    const [lat, lng] = near.split(",").map(Number);
    if (isFinite(lat) && isFinite(lng)) nearLatLng = { lat, lng };
  }

  const [photonResults, nominatimResults] = await Promise.all([
    photonGeocode(q, type, nearLatLng).catch(() => [] as UnifiedFeature[]),
    nominatimGeocode(q, type).catch(() => [] as UnifiedFeature[]),
  ]);

  let features = [...photonResults, ...nominatimResults];

  // For addresses with a "near" bias, sort by proximity but DON'T hard-filter
  // by city name — Hebrew streets often have prefixes (שדרות, רחוב, דרך) that
  // change between Photon and Nominatim, and OSM city tag may be missing on
  // some address features. Trust the geographic distance instead.
  if (type === "address" && nearLatLng) {
    features = features
      .map((f) => ({
        ...f,
        _score:
          f._score -
          Math.sqrt(
            (f.center[1] - nearLatLng!.lat) ** 2 +
              (f.center[0] - nearLatLng!.lng) ** 2
          ) *
            80,
      }))
      .sort((a, b) => b._score - a._score);

    // Drop anything > ~25km from the city center (rough cutoff for IL towns)
    features = features.filter((f) => {
      const d = Math.sqrt(
        (f.center[1] - nearLatLng!.lat) ** 2 +
          (f.center[0] - nearLatLng!.lng) ** 2
      );
      return d < 0.25; // ~25km in degrees
    });
  } else if (type === "address" && city) {
    features = features.filter((f) => {
      const ctxCity = f.context.find((c) => c.id.startsWith("place."))?.text;
      const inPlace = (ctxCity ?? "").toLowerCase();
      const inName = f.place_name.toLowerCase();
      return inPlace.includes(city) || inName.includes(city);
    });
  }

  features = dedupeFeatures(features).slice(0, 8);

  return NextResponse.json(
    {
      features: features.map(({ _score: _s, ...rest }) => {
        void _s;
        return rest;
      }),
    },
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

interface PhotonResponse {
  features: {
    geometry: { coordinates: [number, number] };
    properties: {
      osm_id: number;
      osm_value?: string;
      osm_key?: string;
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

async function photonGeocode(
  q: string,
  type: "city" | "address" | null,
  near: { lat: number; lng: number } | null
): Promise<UnifiedFeature[]> {
  const langs = /[֐-׿]/.test(q) ? ["he", "en"] : ["en", "he"];
  const all: UnifiedFeature[] = [];

  const cityTags =
    "&osm_tag=place:city&osm_tag=place:town&osm_tag=place:village";

  for (const lang of langs) {
    let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      q
    )}&lang=${lang}&limit=8&bbox=${ISRAEL_BBOX}`;
    if (type === "city") url += cityTags;
    if (near) url += `&lat=${near.lat}&lon=${near.lng}`;

    const resp = await fetch(url);
    if (!resp.ok) continue;
    const data = (await resp.json()) as PhotonResponse;
    for (const f of data.features ?? []) {
      const p = f.properties;
      if (p.country && p.country !== "Israel" && p.country !== "ישראל") continue;
      if (type === "city" && !CITY_OSM_VALUES.has(p.osm_value ?? "")) continue;

      const street = p.street ?? "";
      const num = p.housenumber ?? "";
      const cityName = p.city ?? p.name ?? "";
      const parts =
        type === "city"
          ? [p.name]
          : [p.name, [street, num].filter(Boolean).join(" "), cityName];
      const placeName = [...new Set(parts.filter(Boolean))].join(", ");
      if (!placeName) continue;

      const isAddress = !!(street || num);
      const isHebrew = /[֐-׿]/.test(placeName);
      all.push({
        id: `photon.${p.osm_id}.${lang}`,
        place_name: placeName,
        text: p.name ?? street ?? cityName,
        center: f.geometry.coordinates,
        context: cityName ? [{ id: "place.city", text: cityName }] : [],
        _score:
          (isAddress ? 80 : type === "city" ? 90 : 60) +
          (lang === "he" ? 5 : 0) +
          (isHebrew ? 20 : 0),
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

async function nominatimGeocode(
  q: string,
  type: "city" | "address" | null
): Promise<UnifiedFeature[]> {
  // Don't pass &featuretype=city — it restricts to OSM admin boundaries with
  // class=city which excludes most Israeli towns (Zikhron Yaakov, etc.).
  // Filter on our side instead.
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(q)}&countrycodes=il&format=json&addressdetails=1&limit=10&accept-language=he,en`;

  const resp = await fetch(url, {
    headers: {
      "User-Agent": "OpenHouseMap/1.0 (https://openhousemap.online)",
    },
  });
  if (!resp.ok) return [];
  const results = (await resp.json()) as NominatimResult[];
  return results
    .map((r) => {
      const a = r.address ?? {};
      const cityName =
        a.city ?? a.town ?? a.village ?? a.municipality ?? r.name ?? "";
      const isAddress = !!(a.road || a.house_number);

      if (type === "city") {
        // Keep only place-class hits; prefer place over boundary duplicates.
        const cls = r.class ?? "";
        const ty = r.type ?? "";
        const isPlaceLike =
          cls === "place" ||
          (cls === "boundary" && CITY_NOMINATIM_TYPES.has(ty));
        if (!isPlaceLike) return null;
        if (!cityName) return null;
      }

      const context: { id: string; text: string }[] = [];
      if (cityName) context.push({ id: "place.city", text: cityName });
      if (a.country) context.push({ id: "country.il", text: a.country });

      // Score hebrew display names higher (Nominatim returns hebrew text
      // when accept-language=he and the OSM feature has a name:he tag).
      const isHebrew = /[֐-׿]/.test(r.display_name);
      const heBonus = isHebrew ? 20 : 0;

      return {
        id: `nominatim.${r.place_id}`,
        place_name: type === "city" ? cityName : r.display_name,
        text: r.name ?? a.road ?? cityName,
        center: [Number(r.lon), Number(r.lat)] as [number, number],
        context,
        _score:
          (type === "city" ? 85 : isAddress ? 75 : 55) +
          (r.class === "place" ? 5 : 0) +
          heBonus,
      };
    })
    .filter((x): x is UnifiedFeature => x !== null);
}
