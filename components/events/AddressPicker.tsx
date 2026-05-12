"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type * as L from "leaflet";

const ISRAEL_CENTER: [number, number] = [31.7683, 35.2137];
const ISRAEL_ZOOM = 7;
const CITY_ZOOM = 14;
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

export default function AddressPicker({ value, onChange }: Props) {
  const [cityQuery, setCityQuery] = useState(value.city);
  const [citySuggestions, setCitySuggestions] = useState<MapboxFeature[]>([]);
  const [cityOpen, setCityOpen] = useState(false);
  const [city, setCity] = useState<CityState | null>(
    value.city && value.lat && value.lng
      ? { name: value.city, lat: value.lat, lng: value.lng }
      : null
  );

  const [addressQuery, setAddressQuery] = useState(
    value.address && value.city ? stripCity(value.address, value.city) : value.address
  );
  const [addressSuggestions, setAddressSuggestions] = useState<MapboxFeature[]>([]);
  const [addressOpen, setAddressOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;

  // Init map
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
        ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      L.tileLayer(tileUrl, {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
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

  function searchCity(q: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
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

  function searchAddress(q: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (q.trim().length < 2 || !city) {
        setAddressSuggestions([]);
        return;
      }
      try {
        const url =
          `/api/geocode?q=${encodeURIComponent(q + " " + city.name)}` +
          `&type=address&near=${city.lat},${city.lng}&city=${encodeURIComponent(city.name)}`;
        const res = await fetch(url);
        const data = await res.json();
        setAddressSuggestions(data.features ?? []);
        setAddressOpen(true);
      } catch (e) {
        console.error("[address picker] address", e);
      }
    }, 250);
  }

  function selectCity(f: MapboxFeature) {
    const [lng, lat] = f.center;
    const name = f.text || f.place_name;
    const next: CityState = { name, lat, lng };
    setCity(next);
    setCityQuery(name);
    setCitySuggestions([]);
    setCityOpen(false);
    setAddressQuery("");
    setAddressSuggestions([]);
    onChange({ address: "", city: name, lat: null, lng: null });
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], CITY_ZOOM);
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    }
  }

  function selectAddress(f: MapboxFeature) {
    const [lng, lat] = f.center;
    setAddressQuery(f.place_name);
    setAddressSuggestions([]);
    setAddressOpen(false);
    onChange({
      address: f.place_name,
      city: city?.name ?? "",
      lat,
      lng,
    });
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], ADDRESS_ZOOM);
    }
  }

  // Sync marker when value changes externally
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
        // fall back to dynamic import
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

  return (
    <div className="space-y-2">
      {/* CITY input */}
      <div className="relative">
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
          onBlur={() => setTimeout(() => setCityOpen(false), 150)}
          placeholder='לדוגמה: זכרון יעקב, תל אביב'
          className="input"
          required
        />
        {cityOpen && citySuggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full bg-(--color-ivory) border border-(--color-cream) rounded-xl shadow-lg max-h-60 overflow-auto">
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

      {/* ADDRESS input */}
      <div className="relative">
        <label className="text-xs text-(--color-moss) mb-1 block">
          רחוב ומספר בית
        </label>
        <input
          type="text"
          value={addressQuery}
          disabled={!city}
          onChange={(e) => {
            setAddressQuery(e.target.value);
            onChange({
              ...valueRef.current,
              address: e.target.value
                ? `${e.target.value}, ${city?.name ?? ""}`
                : "",
            });
            searchAddress(e.target.value);
          }}
          onFocus={() => addressSuggestions.length > 0 && setAddressOpen(true)}
          onBlur={() => setTimeout(() => setAddressOpen(false), 150)}
          placeholder={city ? "לדוגמה: בן גוריון 35" : "בחר עיר קודם"}
          className="input"
          required
        />
        {addressOpen && addressSuggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full bg-(--color-ivory) border border-(--color-cream) rounded-xl shadow-lg max-h-60 overflow-auto">
            {addressSuggestions.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectAddress(f);
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

      <div
        ref={containerRef}
        className="w-full h-56 rounded-xl overflow-hidden border border-(--color-cream)"
        aria-label="map for choosing pin position"
      />

      <p className="text-xs text-(--color-moss)/80">
        בחר עיר, אז כתובת מהאוטוקומפליט, או לחץ על המפה / גרור את הסיכה לכוונון
        {value.lat && value.lng && (
          <span className="block opacity-60 mt-0.5">
            {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </span>
        )}
      </p>
    </div>
  );
}

function stripCity(address: string, city: string): string {
  if (!city) return address;
  return address
    .split(",")
    .filter((p) => !p.trim().toLowerCase().includes(city.toLowerCase()))
    .join(",")
    .trim()
    .replace(/^,|,$/g, "")
    .trim();
}
