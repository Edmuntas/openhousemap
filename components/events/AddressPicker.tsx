"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type * as L from "leaflet";

const ISRAEL_CENTER: [number, number] = [31.7683, 35.2137];
const ISRAEL_ZOOM = 7;
const CITY_ZOOM = 14;
const STREET_ZOOM = 15;
const ADDRESS_ZOOM = 17;

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number];
  context?: { id: string; text: string }[];
}

export interface AddressValue {
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
}

interface Props {
  value: AddressValue;
  onChange: (v: AddressValue) => void;
}

interface CityState {
  name: string;
  lat: number;
  lng: number;
}

interface StreetState {
  name: string;
  lat: number;
  lng: number;
}

/** Split a "<street> <number>, <city>" display string into parts. */
function splitAddress(
  fullAddress: string,
  city: string
): { street: string; number: string } {
  if (!fullAddress) return { street: "", number: "" };
  // Strip city suffix if present.
  const head = city
    ? fullAddress
        .split(",")
        .filter((p) => !p.trim().toLowerCase().includes(city.toLowerCase()))
        .join(",")
        .trim()
        .replace(/^,|,$/g, "")
        .trim()
    : fullAddress;
  // Match trailing number ("דיזנגוף 35" → street="דיזנגוף", number="35").
  const m = head.match(/^(.+?)\s+(\d+[A-Za-zא-ת]?)$/);
  if (m) return { street: m[1].trim(), number: m[2].trim() };
  return { street: head.trim(), number: "" };
}

export default function AddressPicker({ value, onChange }: Props) {
  // --- CITY ---
  const [cityQuery, setCityQuery] = useState(value.city);
  const [citySuggestions, setCitySuggestions] = useState<MapboxFeature[]>([]);
  const [cityOpen, setCityOpen] = useState(false);
  const [city, setCity] = useState<CityState | null>(
    value.city && value.lat && value.lng
      ? { name: value.city, lat: value.lat, lng: value.lng }
      : null
  );

  // --- STREET / NUMBER ---
  const initialParts = splitAddress(value.address, value.city);
  const [streetQuery, setStreetQuery] = useState(initialParts.street);
  const [streetSuggestions, setStreetSuggestions] = useState<MapboxFeature[]>(
    []
  );
  const [streetOpen, setStreetOpen] = useState(false);
  const [street, setStreet] = useState<StreetState | null>(
    initialParts.street && value.lat && value.lng
      ? { name: initialParts.street, lat: value.lat, lng: value.lng }
      : null
  );
  const [houseNumber, setHouseNumber] = useState(initialParts.number);

  // --- refs ---
  const cityDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streetDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const numberDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;

  // --- map init (same as before) ---
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => void })
        ._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const v = valueRef.current;
      const initialCenter: [number, number] =
        v.lat && v.lng ? [v.lat, v.lng] : ISRAEL_CENTER;
      const initialZoom = v.lat && v.lng ? ADDRESS_ZOOM : ISRAEL_ZOOM;

      const map = L.map(containerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        zoomControl: true,
      });
      const tileUrl = process.env.NEXT_PUBLIC_MAPTILER_KEY
        ? `https://api.maptiler.com/maps/streets-v2-light/{z}/{x}/{y}.png?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
      L.tileLayer(tileUrl, {
        attribution: "© OpenStreetMap, © CARTO",
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      if (v.lat && v.lng) {
        const marker = L.marker([v.lat, v.lng], { draggable: true }).addTo(map);
        marker.on("dragend", () => {
          const p = marker.getLatLng();
          onChangeRef.current({ ...valueRef.current, lat: p.lat, lng: p.lng });
        });
        markerRef.current = marker;
      }

      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const m = L.marker([lat, lng], { draggable: true }).addTo(map);
          m.on("dragend", () => {
            const p = m.getLatLng();
            onChangeRef.current({ ...valueRef.current, lat: p.lat, lng: p.lng });
          });
          markerRef.current = m;
        }
        onChangeRef.current({ ...valueRef.current, lat, lng });
      });

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker with value.lat/lng changes from outside (or from re-geocode).
  useEffect(() => {
    if (!mapRef.current) return;
    const L = (window as unknown as { L?: typeof import("leaflet") }).L;
    if (value.lat && value.lng) {
      if (markerRef.current) {
        markerRef.current.setLatLng([value.lat, value.lng]);
      } else if (L) {
        const m = L.marker([value.lat, value.lng], { draggable: true }).addTo(
          mapRef.current
        );
        m.on("dragend", () => {
          const p = m.getLatLng();
          onChangeRef.current({ ...valueRef.current, lat: p.lat, lng: p.lng });
        });
        markerRef.current = m;
      } else {
        import("leaflet").then(({ default: Lmod }) => {
          if (!mapRef.current || markerRef.current) return;
          const m = Lmod.marker([value.lat!, value.lng!], {
            draggable: true,
          }).addTo(mapRef.current);
          m.on("dragend", () => {
            const p = m.getLatLng();
            onChangeRef.current({
              ...valueRef.current,
              lat: p.lat,
              lng: p.lng,
            });
          });
          markerRef.current = m;
        });
      }
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [value.lat, value.lng]);

  // --- search city ---
  function searchCity(q: string) {
    if (cityDebounce.current) clearTimeout(cityDebounce.current);
    cityDebounce.current = setTimeout(async () => {
      if (q.trim().length < 2) {
        setCitySuggestions([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(q)}&type=city`
        );
        const data = await res.json();
        setCitySuggestions(data.features ?? []);
        setCityOpen(true);
      } catch (e) {
        console.error("[address picker] city", e);
      }
    }, 250);
  }

  // --- search street (no number — number is a separate field) ---
  function searchStreet(q: string) {
    if (streetDebounce.current) clearTimeout(streetDebounce.current);
    streetDebounce.current = setTimeout(async () => {
      if (q.trim().length < 2 || !city) {
        setStreetSuggestions([]);
        return;
      }
      try {
        const url =
          `/api/geocode?q=${encodeURIComponent(q)}` +
          `&type=address&near=${city.lat},${city.lng}&city=${encodeURIComponent(city.name)}`;
        const res = await fetch(url);
        const data = await res.json();
        setStreetSuggestions(data.features ?? []);
        setStreetOpen(true);
      } catch (e) {
        console.error("[address picker] street", e);
      }
    }, 250);
  }

  // --- re-geocode street + number (after user types/selects number) ---
  function refineWithNumber(streetName: string, number: string) {
    if (numberDebounce.current) clearTimeout(numberDebounce.current);
    numberDebounce.current = setTimeout(async () => {
      if (!city || !streetName) return;
      const q = number ? `${streetName} ${number}` : streetName;
      try {
        const url =
          `/api/geocode?q=${encodeURIComponent(q)}` +
          `&type=address&near=${city.lat},${city.lng}&city=${encodeURIComponent(city.name)}`;
        const res = await fetch(url);
        const data = await res.json();
        const features: MapboxFeature[] = data.features ?? [];
        // Take the top match (API already scores by name proximity).
        const best = features[0];
        if (!best) return;
        const [lng, lat] = best.center;
        // Build final display string.
        const display = number
          ? `${streetName} ${number}, ${city.name}`
          : `${streetName}, ${city.name}`;
        onChangeRef.current({
          address: display,
          city: city.name,
          lat,
          lng,
        });
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], number ? ADDRESS_ZOOM : STREET_ZOOM);
        }
      } catch (e) {
        console.error("[address picker] refine", e);
      }
    }, 400);
  }

  function selectCity(f: MapboxFeature) {
    const [lng, lat] = f.center;
    const name = f.place_name;
    const next: CityState = { name, lat, lng };
    setCity(next);
    setCityQuery(name);
    setCitySuggestions([]);
    setCityOpen(false);
    // Reset downstream fields.
    setStreetQuery("");
    setStreetSuggestions([]);
    setStreet(null);
    setHouseNumber("");
    onChange({ address: "", city: name, lat: null, lng: null });
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], CITY_ZOOM);
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    }
  }

  function selectStreet(f: MapboxFeature) {
    if (!city) return;
    const [lng, lat] = f.center;
    // The API's `text` is the bare street name (no number, no city).
    const streetName = f.text || f.place_name.split(",")[0].trim();
    setStreet({ name: streetName, lat, lng });
    setStreetQuery(streetName);
    setStreetSuggestions([]);
    setStreetOpen(false);
    setHouseNumber("");
    const display = `${streetName}, ${city.name}`;
    onChange({ address: display, city: city.name, lat, lng });
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], STREET_ZOOM);
    }
  }

  function setNumber(n: string) {
    // Allow digits + optional single trailing letter (Israeli addresses
    // sometimes use "12א" / "12B").
    const clean = n.replace(/[^\d A-Za-zא-ת]/g, "").slice(0, 5);
    setHouseNumber(clean);
    if (!street) return;
    // Optimistically update display while geocoding catches up.
    const display = clean
      ? `${street.name} ${clean}, ${city?.name ?? ""}`
      : `${street.name}, ${city?.name ?? ""}`;
    onChangeRef.current({
      ...valueRef.current,
      address: display,
      city: city?.name ?? "",
    });
    refineWithNumber(street.name, clean);
  }

  const dropdownClass =
    "absolute z-10 mt-1 w-full bg-(--color-ivory) border border-(--color-cream) rounded-xl shadow-lg max-h-[min(15rem,40vh)] overflow-auto";

  return (
    <div className="space-y-2">
      {/* CITY */}
      <div className="relative z-[1100]">
        <label className="text-xs text-(--color-moss) mb-1 block">עיר</label>
        <input
          type="text"
          value={cityQuery}
          onChange={(e) => {
            setCityQuery(e.target.value);
            if (city && e.target.value !== city.name) setCity(null);
            searchCity(e.target.value);
          }}
          onFocus={() => citySuggestions.length > 0 && setCityOpen(true)}
          onBlur={() => setTimeout(() => setCityOpen(false), 350)}
          placeholder='לדוגמה: זכרון יעקב, תל אביב'
          className="input scroll-anchor"
          autoComplete="off"
          required
        />
        {cityOpen && citySuggestions.length > 0 && (
          <ul className={dropdownClass}>
            {citySuggestions.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectCity(f);
                  }}
                  className="w-full text-right px-3 py-2 hover:bg-(--color-cream)/50 text-sm text-(--color-deep)"
                >
                  {f.place_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* STREET */}
      <div className="relative z-[1050]">
        <label className="text-xs text-(--color-moss) mb-1 block">רחוב</label>
        <input
          type="text"
          value={streetQuery}
          disabled={!city}
          onChange={(e) => {
            const v = e.target.value;
            setStreetQuery(v);
            if (street && v !== street.name) {
              setStreet(null);
              setHouseNumber("");
            }
            searchStreet(v);
          }}
          onFocus={() => streetSuggestions.length > 0 && setStreetOpen(true)}
          onBlur={() => setTimeout(() => setStreetOpen(false), 350)}
          placeholder={city ? "לדוגמה: דיזנגוף" : "בחר עיר קודם"}
          className="input scroll-anchor"
          autoComplete="off"
          required
        />
        {streetOpen && streetSuggestions.length > 0 && (
          <ul className={dropdownClass}>
            {streetSuggestions.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectStreet(f);
                  }}
                  className="w-full text-right px-3 py-2 hover:bg-(--color-cream)/50 text-sm text-(--color-deep)"
                >
                  {f.text || f.place_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* HOUSE NUMBER */}
      <div className="relative z-[1000]">
        <label className="text-xs text-(--color-moss) mb-1 block">
          מספר בית
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={houseNumber}
          disabled={!street}
          onChange={(e) => setNumber(e.target.value)}
          placeholder={street ? "35" : "בחר רחוב קודם"}
          className="input scroll-anchor"
          autoComplete="off"
        />
        <p className="text-[11px] text-(--color-moss)/70 mt-1">
          אופציונלי — אם אין מספר ספציפי, השאר ריק והפין יישאר על הרחוב.
        </p>
      </div>

      <div
        ref={containerRef}
        className="w-full h-56 rounded-xl overflow-hidden border border-(--color-cream)"
        aria-label="map for choosing pin position"
      />

      <p className="text-xs text-(--color-moss)/80">
        אפשר גם ללחוץ על המפה או לגרור את הסיכה לכוונון מדויק
        {value.lat && value.lng && (
          <span className="block opacity-60 mt-0.5">
            {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </span>
        )}
      </p>
    </div>
  );
}
