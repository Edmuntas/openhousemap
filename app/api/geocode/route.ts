import { NextRequest, NextResponse } from "next/server";
import IL_CITIES from "@/data/il-cities.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
// Pipeline for Israeli addresses (Hebrew query):
//   - Primary: data.gov.il authoritative street dataset (real Hebrew city/street names)
//   - Coord resolution: Nominatim reverse with accept-language=he (parallel)
// Pipeline for Latin queries: Photon (real-estate friendly) + Nominatim fallback.
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
const HEBREW_RE = /[֐-׿]/;
const STREETS_RESOURCE_ID = "9ad3862c-8391-4b2f-84a4-2d4c68625f4b";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "q parameter required" }, { status: 400 });
  }
  const type = sp.get("type") as "city" | "address" | null;
  const near = sp.get("near"); // "lat,lng"
  const city = sp.get("city")?.trim();

  let nearLatLng: { lat: number; lng: number } | null = null;
  if (near) {
    const [lat, lng] = near.split(",").map(Number);
    if (isFinite(lat) && isFinite(lng)) nearLatLng = { lat, lng };
  }

  const hebrew = HEBREW_RE.test(q);
  let features: UnifiedFeature[] = [];

  if (hebrew && type === "city") {
    features = await ilCities(q);
  } else if (hebrew && type === "address" && city) {
    features = await ilAddresses(q, city);
  } else {
    // Latin queries — keep the original Photon+Nominatim pipeline
    const [photonResults, nominatimResults] = await Promise.all([
      photonGeocode(q, type, nearLatLng).catch(() => [] as UnifiedFeature[]),
      nominatimGeocode(q, type).catch(() => [] as UnifiedFeature[]),
    ]);
    features = [...photonResults, ...nominatimResults];
  }

  // For address with near bias, sort by distance and cut faraway
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
      .sort((a, b) => b._score - a._score)
      .filter((f) => {
        const d = Math.sqrt(
          (f.center[1] - nearLatLng!.lat) ** 2 +
            (f.center[0] - nearLatLng!.lng) ** 2
        );
        return d < 0.4; // ~40km
      });
  }

  // For Hebrew queries, drop any feature whose place_name has no Hebrew —
  // those are leaked Latin Photon hits that confuse the user.
  if (hebrew) {
    features = features.filter((f) => HEBREW_RE.test(f.place_name));
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

// -------------------- data.gov.il (Israeli streets dataset) --------------------

interface IlStreetRecord {
  סמל_ישוב: number;
  שם_ישוב: string;
  סמל_רחוב: number;
  שם_רחוב: string;
}

async function ilCities(q: string): Promise<UnifiedFeature[]> {
  const query = q.trim();
  if (!query) return [];

  // Primary source: local curated list of major Israeli cities.
  // data.gov.il's hebrew full-text search misses prefixes (q="חדר" doesn't
  // surface "חדרה" because tokens are whole-word). Local prefix match
  // works instantly and reliably for the ~150 major municipalities.
  const localMatches: { name: string }[] = (
    IL_CITIES as { name: string }[]
  ).filter((c) => c.name.startsWith(query) || c.name.includes(query));

  if (localMatches.length > 0) {
    const results = await Promise.all(
      localMatches.slice(0, 8).map((c, i) => resolveCityCoords(c.name, 100 - i))
    );
    return results.filter((x): x is UnifiedFeature => x !== null);
  }

  // Fallback: data.gov.il dataset (for small settlements not in local list)
  const url =
    `https://data.gov.il/api/3/action/datastore_search` +
    `?resource_id=${STREETS_RESOURCE_ID}&q=${encodeURIComponent(q)}&limit=50`;
  const resp = await fetch(url, { next: { revalidate: 86400 } });
  if (!resp.ok) return [];
  const data = (await resp.json()) as {
    result?: { records?: IlStreetRecord[] };
  };
  const records = data.result?.records ?? [];
  const seen = new Set<string>();
  const cities: string[] = [];
  for (const r of records) {
    const name = r.שם_ישוב?.trim();
    if (!name) continue;
    if (!name.includes(q.trim())) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    cities.push(name);
    if (cities.length >= 8) break;
  }
  // Resolve coords via Nominatim (parallel)
  const results = await Promise.all(
    cities.map((name, i) => resolveCityCoords(name, 95 - i))
  );
  return results.filter((x): x is UnifiedFeature => x !== null);
}

async function ilAddresses(
  q: string,
  city: string
): Promise<UnifiedFeature[]> {
  // Extract street part of query (before any number)
  const m = q.match(/^([^\d]+?)\s*(\d+)?$/);
  const streetQuery = (m?.[1] ?? q).trim();
  const houseNumber = m?.[2];

  // First, find matching streets in this city
  const url =
    `https://data.gov.il/api/3/action/datastore_search` +
    `?resource_id=${STREETS_RESOURCE_ID}` +
    `&q=${encodeURIComponent(streetQuery)}` +
    `&limit=100`;
  const resp = await fetch(url, { next: { revalidate: 86400 } });
  if (!resp.ok) return [];
  const data = (await resp.json()) as {
    result?: { records?: IlStreetRecord[] };
  };
  const records = data.result?.records ?? [];

  // Filter by selected city (case+space insensitive)
  const cityNorm = city.replace(/\s+/g, "").trim();
  const inCity = records.filter(
    (r) => r.שם_ישוב.replace(/\s+/g, "").trim() === cityNorm
  );

  // Score by matching street name to query
  const qNorm = streetQuery.trim();
  inCity.sort((a, b) => {
    const aStarts = a.שם_רחוב.startsWith(qNorm) ? 1 : 0;
    const bStarts = b.שם_רחוב.startsWith(qNorm) ? 1 : 0;
    return bStarts - aStarts;
  });

  const top = inCity.slice(0, 8);
  const cityClean = city.trim();
  const results = await Promise.all(
    top.map(async (r, i) => {
      const street = r.שם_רחוב.trim();
      const display = houseNumber
        ? `${street} ${houseNumber}, ${cityClean}`
        : `${street}, ${cityClean}`;
      // Try precise coords first (with house number); fall back to street
      // coords if Nominatim can't pin the exact number. This keeps the
      // suggestion visible — user can drop the pin manually on the map.
      let coords: [number, number] | null = null;
      if (houseNumber) {
        coords = await resolveCoords(`${street} ${houseNumber} ${cityClean}`);
      }
      if (!coords) {
        coords = await resolveCoords(`${street} ${cityClean}`);
      }
      if (!coords) return null;
      return {
        id: `il-street.${r.סמל_ישוב}.${r.סמל_רחוב}.${houseNumber ?? ""}`,
        place_name: display,
        text: street,
        center: coords,
        context: [{ id: "place.city", text: cityClean }],
        _score: 90 - i,
      } as UnifiedFeature;
    })
  );
  return results.filter((x): x is UnifiedFeature => x !== null);
}

async function resolveCityCoords(
  name: string,
  score: number
): Promise<UnifiedFeature | null> {
  const coords = await resolveCoords(`${name}, ישראל`);
  if (!coords) return null;
  return {
    id: `il-city.${name}`,
    place_name: name,
    text: name,
    center: coords,
    context: [],
    _score: score,
  };
}

async function resolveCoords(query: string): Promise<[number, number] | null> {
  // Try Nominatim first (best hebrew coverage when responsive)
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&countrycodes=il&format=json&limit=1&accept-language=he`;
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "OpenHouseMap/1.0 (https://openhousemap.online)",
      },
      next: { revalidate: 604800 },
    });
    if (resp.ok) {
      const data = (await resp.json()) as { lon: string; lat: string }[];
      if (data[0]) {
        return [Number(data[0].lon), Number(data[0].lat)];
      }
    }
  } catch {
    // fall through to Photon
  }

  // Photon fallback — different IP space, no shared serverless rate limit.
  // Covers Israeli streets well; hebrew lang first, then english.
  for (const lang of ["he", "en"] as const) {
    try {
      const purl =
        `https://photon.komoot.io/api/?` +
        `q=${encodeURIComponent(query)}&lang=${lang}&limit=1&bbox=${ISRAEL_BBOX}`;
      const presp = await fetch(purl, { next: { revalidate: 604800 } });
      if (!presp.ok) continue;
      const pdata = (await presp.json()) as PhotonResponse;
      const f = pdata.features?.[0];
      if (!f) continue;
      const country = f.properties.country;
      if (country && country !== "Israel" && country !== "ישראל") continue;
      const [lng, lat] = f.geometry.coordinates;
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        return [lng, lat];
      }
    } catch {
      // try next lang
    }
  }

  return null;
}

// -------------------- Photon (Latin queries) --------------------

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
  const langs = HEBREW_RE.test(q) ? ["he", "en"] : ["en", "he"];
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
      // Short place_name — no district/state/postcode/country noise
      const placeName =
        type === "city"
          ? p.name ?? cityName
          : [
              [street, num].filter(Boolean).join(" "),
              cityName,
            ]
              .filter(Boolean)
              .join(", ") || p.name || "";
      if (!placeName) continue;

      const isAddress = !!(street || num);
      const isHebrew = HEBREW_RE.test(placeName);
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

      if (type === "city") {
        const cls = r.class ?? "";
        const ty = r.type ?? "";
        const isPlaceLike =
          cls === "place" ||
          (cls === "boundary" && CITY_NOMINATIM_TYPES.has(ty));
        if (!isPlaceLike) return null;
        if (!cityName) return null;
      }

      // Short, clean place_name — street + number + city, no district/postcode
      const street = a.road ?? "";
      const num = a.house_number ?? "";
      const shortAddress = [
        [street, num].filter(Boolean).join(" "),
        cityName,
      ]
        .filter(Boolean)
        .join(", ") || r.name || cityName;
      const placeName = type === "city" ? cityName : shortAddress;
      if (!placeName) return null;

      const context: { id: string; text: string }[] = [];
      if (cityName) context.push({ id: "place.city", text: cityName });
      if (a.country) context.push({ id: "country.il", text: a.country });

      const isHebrew = HEBREW_RE.test(placeName);
      const heBonus = isHebrew ? 20 : 0;
      const isAddress = !!(street || num);

      return {
        id: `nominatim.${r.place_id}`,
        place_name: placeName,
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
