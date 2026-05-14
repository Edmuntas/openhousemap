"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type * as L from "leaflet";
import type { EventWithId } from "@/hooks/useEvents";
import { formatPrice } from "@/lib/utils";
import { VISIBILITY_COLOR } from "@/lib/visibility";

const ISRAEL_CENTER: [number, number] = [31.7683, 35.2137];
const DEFAULT_ZOOM = 8;

export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface MapInnerProps {
  /** Events to render as pins. Parent owns the data so we don't open a
   *  duplicate Firestore listener — MapHomeClient already has useEvents(). */
  events: EventWithId[];
  loading?: boolean;
  onEventSelect?: (event: EventWithId) => void;
  selectedEvent?: EventWithId | null;
  onBoundsChange?: (bounds: ViewportBounds) => void;
}

interface ClusterLayer extends L.Layer {
  clearLayers: () => void;
  addLayer: (l: L.Layer) => void;
}

interface MapState {
  L: typeof L;
  map: L.Map;
  cluster: ClusterLayer;
}

export default function MapInner({
  events,
  loading,
  onEventSelect,
  selectedEvent,
  onBoundsChange,
}: MapInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapState, setMapState] = useState<MapState | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;

  // Init map once
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let map: L.Map | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet.markercluster");
      if (cancelled || !containerRef.current) return;

      // Default icon path fix for webpack bundling
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => void })
        ._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Hide Leaflet zoom buttons on mobile (pinch-zoom is standard);
      // keep them on desktop where they don't conflict with the floating chrome.
      const isMobileViewport =
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 767px)").matches;
      map = L.map(containerRef.current, {
        center: ISRAEL_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: !isMobileViewport,
      });

      // Tile source:
      //  - With MapTiler key (preferred): single raster layer, hebrew labels
      //    via the streets-v2-light style which renders the OSM name:he tag
      //    where present + falls back to name (also hebrew in Israel).
      //  - Without key: CartoDB Voyager (pale, English labels). At least
      //    renders something while the deploy is keyless.
      const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
      if (mapTilerKey) {
        L.tileLayer(
          `https://api.maptiler.com/maps/streets-v2-light/{z}/{x}/{y}.png?key=${mapTilerKey}`,
          {
            attribution:
              '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
            crossOrigin: true,
          }
        ).addTo(map);
      } else {
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
          {
            attribution: "© OpenStreetMap, © CARTO",
            maxZoom: 19,
            subdomains: "abcd",
          }
        ).addTo(map);
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
          {
            attribution: "",
            maxZoom: 19,
            subdomains: "abcd",
            pane: "shadowPane",
          }
        ).addTo(map);
      }

      const cluster = (
        L as unknown as {
          markerClusterGroup: (opts: object) => ClusterLayer;
        }
      ).markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        chunkedLoading: true,
        iconCreateFunction: (c: { getChildCount: () => number }) => {
          return L.divIcon({
            html: `<div class="ohm-cluster"><span>${c.getChildCount()}</span></div>`,
            className: "ohm-cluster-wrap",
            iconSize: L.point(40, 40),
          });
        },
      });
      map.addLayer(cluster);

      const emitBounds = () => {
        if (!map) return;
        const b = map.getBounds();
        onBoundsChangeRef.current?.({
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        });
      };

      map.on("zoomend", () => {
        setZoom(map!.getZoom());
        emitBounds();
      });
      map.on("moveend", emitBounds);
      // Initial emit once map is ready
      emitBounds();

      setMapState({ L, map, cluster });
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, []);

  // Render markers whenever events or zoom or map change
  useEffect(() => {
    if (!mapState) return;
    const { L, cluster } = mapState;
    cluster.clearLayers();
    for (const ev of events) {
      const { lat, lng } = ev.coordinates;
      const color = VISIBILITY_COLOR[ev.visibility] ?? VISIBILITY_COLOR.public;
      const icon = buildIcon(L, ev, color, zoom);
      const marker = L.marker([lat, lng], { icon });
      marker.on("click", () => onEventSelect?.(ev));
      cluster.addLayer(marker);
    }
  }, [mapState, events, zoom, onEventSelect]);

  // Fly to selected event (sidebar click)
  useEffect(() => {
    if (!mapState || !selectedEvent) return;
    const { lat, lng } = selectedEvent.coordinates;
    mapState.map.flyTo([lat, lng], 16, { duration: 0.7 });
  }, [mapState, selectedEvent]);

  return (
    <>
      <div
        ref={containerRef}
        className="w-full h-full min-h-[480px]"
        role="application"
        aria-label="מפת בתים פתוחים"
      />
      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-(--surface) text-(--foreground) px-3 py-1 rounded-full text-sm shadow-sm">
          טוען...
        </div>
      )}
      <style jsx global>{`
        .ohm-cluster-wrap {
          background: transparent;
          border: none;
        }
        .ohm-cluster {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #4a6e30;
          color: #f6f8f2;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          border: 2px solid #f6f8f2;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        .ohm-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid #f6f8f2;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
        }
        .ohm-pin {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 3px solid #f6f8f2;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        }
        .ohm-pill {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          background: #f6f8f2;
          color: #141c0a;
          font-family: var(--font-rubik), "Rubik", sans-serif;
          font-weight: 600;
          font-size: 12px;
          white-space: nowrap;
          border: 2px solid;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .ohm-pill:hover {
          transform: translateY(-2px);
        }
      `}</style>
    </>
  );
}

function buildIcon(
  L: typeof import("leaflet"),
  ev: EventWithId,
  color: string,
  zoom: number
): L.DivIcon {
  if (zoom < 11) {
    return L.divIcon({
      html: `<div class="ohm-dot" style="background:${color}"></div>`,
      className: "",
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  }
  if (zoom < 14) {
    return L.divIcon({
      html: `<div class="ohm-pin" style="background:${color}"></div>`,
      className: "",
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
  }
  return L.divIcon({
    html: `<div class="ohm-pill" style="border-color:${color}">${formatPrice(ev.price)}${ev.rooms != null ? ` · ${ev.rooms} חד׳` : ""}</div>`,
    className: "",
    iconSize: [120, 32],
    iconAnchor: [60, 32],
  });
}
