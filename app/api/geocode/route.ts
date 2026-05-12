import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Server-side Mapbox geocoding proxy. Keeps MAPBOX_SECRET_KEY out of the client.
// Usage: GET /api/geocode?q=Tel%20Aviv
export async function GET(req: NextRequest) {
  const key = process.env.MAPBOX_SECRET_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "MAPBOX_SECRET_KEY not configured" },
      { status: 500 }
    );
  }
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "q parameter required" }, { status: 400 });
  }
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?country=IL&types=place,address&limit=5&access_token=${key}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    return NextResponse.json(
      { error: "Mapbox upstream error" },
      { status: 502 }
    );
  }
  const data = await resp.json();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=600" },
  });
}
