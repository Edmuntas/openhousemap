"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type * as L from "leaflet";

const ISRAEL_CENTER: [number, number] = [31.7683, 35.2137];
const DEFAULT_ZOOM = 7;
const SELECTED_ZOOM = 17;

interface MapboxContext {
  id: string;
  text: string;
}

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number];
  context?: MapboxContext[];
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

export default function AddressPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState(value.address);
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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

      const initialCenter: [number, number] =
        value.lat && value.lng ? [value.lat, value.lng] : ISRAEL_CENTER;
      const initialZoom = value.lat && value.lng ? SELECTED_ZOOM : DEFAULT_ZOOM;

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

      if (value.lat && value.lng) {
        const marker = L.marker([value.lat, value.lng], {
          draggable: true,
        }).addTo(map);
        marker.on("dragend", () => {
          const { lat, lng } = marker.getLatLng();
          const current = onChangeRef.current;
          current({ ...value, lat, lng });
        });
        markerRef.current = marker;
      }

      // Click on map to place / move pin
      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const m = L.marker([lat, lng], { draggable: true }).addTo(map);
          m.on("dragend", () => {
            const p = m.getLatLng();
            onChangeRef.current({ ...value, lat: p.lat, lng: p.lng });
          });
          markerRef.current = m;
        }
        onChangeRef.current({ ...value, lat, lng });
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

  // When value.lat/lng updates from outside (selection from autocomplete),
  // move map + marker.
  useEffect(() => {
    if (!mapRef.current) return;
    if (value.lat && value.lng) {
      mapRef.current.setView([value.lat, value.lng], SELECTED_ZOOM);
      if (markerRef.current) {
        markerRef.current.setLatLng([value.lat, value.lng]);
      }
    }
  }, [value.lat, value.lng]);

  function runSearch(q: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (q.trim().length < 3) {
        setSuggestions([]);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSuggestions(data.features ?? []);
        setOpen(true);
      } catch (e) {
        console.error("[address picker]", e);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  function selectSuggestion(f: MapboxFeature) {
    const cityCtx = f.context?.find((c) => c.id.startsWith("place."));
    const city = cityCtx?.text ?? f.text ?? "";
    const [lng, lat] = f.center;
    setQuery(f.place_name);
    setSuggestions([]);
    setOpen(false);
    onChange({ address: f.place_name, city, lat, lng });
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            runSearch(e.target.value);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder='הקלד כתובת, למשל "רוטשילד 22 תל אביב"'
          className="input"
          required
        />
        {searching && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-(--color-moss)">
            …
          </span>
        )}
        {open && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full bg-(--color-ivory) border border-(--color-cream) rounded-xl shadow-lg max-h-60 overflow-auto">
            {suggestions.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectSuggestion(f);
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
        בחר כתובת מהרשימה, או לחץ על המפה / גרור את הסיכה לכוונון מדויק
        {value.lat && value.lng && (
          <span className="block opacity-60 mt-0.5">
            {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </span>
        )}
      </p>
    </div>
  );
}
