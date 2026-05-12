export interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number]; // [lng, lat]
  context?: { id: string; text: string }[];
}

export interface MapboxGeocodeResponse {
  features: MapboxFeature[];
}

/** Call the server-side /api/geocode proxy (never call Mapbox directly from client). */
export async function geocode(query: string): Promise<MapboxFeature[]> {
  const resp = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
  if (!resp.ok) throw new Error(`Geocode failed: ${resp.status}`);
  const data: MapboxGeocodeResponse = await resp.json();
  return data.features;
}
