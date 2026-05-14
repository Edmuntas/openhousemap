"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import MapContainer, { type ViewportBounds } from "./MapContainer";
import EventList from "@/components/events/EventList";
import EventFilters, { type FilterState } from "@/components/events/EventFilters";
import EventPopup from "@/components/events/EventPopup";
import MobileSheet, { type Snap } from "@/components/ui/MobileSheet";
import { useEvents, type EventWithId } from "@/hooks/useEvents";
import { useMyFavourites } from "@/hooks/useFavourite";
import { useAuth } from "@/hooks/useAuth";
import { UserRound, LogIn, Plus } from "lucide-react";

export default function MapHomeClient() {
  const t = useTranslations("app");
  const [filters, setFilters] = useState<FilterState>({
    city: "",
    propertyType: "all",
    timeRange: "all",
    onlyFavourites: false,
  });
  const [selected, setSelected] = useState<EventWithId | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [sheetSnap, setSheetSnap] = useState<Snap>("collapsed");
  const [bounds, setBounds] = useState<ViewportBounds | null>(null);
  const { events, loading } = useEvents();
  const { eventIds: favouriteIds } = useMyFavourites();
  const favSet = useMemo(() => new Set(favouriteIds), [favouriteIds]);
  const { user, claims } = useAuth();
  const isRealtor = !!(claims?.verified || claims?.admin);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const filtered = useMemo(() => {
    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);
    const todayIso = today.toISOString().slice(0, 10);
    const weekIso = weekFromNow.toISOString().slice(0, 10);

    return events.filter((e) => {
      if (filters.city && !e.city.toLowerCase().includes(filters.city.toLowerCase())
          && !e.address.toLowerCase().includes(filters.city.toLowerCase())) {
        return false;
      }
      if (filters.propertyType !== "all" && e.propertyType !== filters.propertyType) {
        return false;
      }
      if (filters.timeRange === "today" && e.date !== todayIso) return false;
      if (filters.timeRange === "week" && e.date > weekIso) return false;
      if (filters.onlyFavourites && !favSet.has(e.id)) return false;
      return true;
    });
  }, [events, filters, favSet]);

  // Events visible in current map viewport. Used for the sheet count so the
  // number reflects what the user actually sees on the map — pan/zoom updates
  // the count live. Falls back to all filtered events until bounds initialize.
  const visible = useMemo(() => {
    if (!bounds) return filtered;
    return filtered.filter((e) => {
      const { lat, lng } = e.coordinates;
      // Handle bounds crossing the antimeridian (won't happen in Israel but
      // robust): if west > east the longitude range wraps around.
      const lngInRange =
        bounds.west <= bounds.east
          ? lng >= bounds.west && lng <= bounds.east
          : lng >= bounds.west || lng <= bounds.east;
      return lat <= bounds.north && lat >= bounds.south && lngInRange;
    });
  }, [filtered, bounds]);

  const sidebarContent = (
    <>
      <EventFilters value={filters} onChange={setFilters} />
      <EventList
        events={filtered}
        loading={loading}
        selectedId={selected?.id ?? null}
        onSelect={setSelected}
      />
    </>
  );

  // Tap on map area while sheet is expanded → collapse it. Map clicks that
  // hit a Leaflet marker stop here too, but pin clicks call setSelected
  // (which hides the sheet anyway), so collapse is harmless.
  function handleMapTap() {
    if (sheetSnap !== "collapsed") setSheetSnap("collapsed");
  }

  // ----- Mobile: fullscreen map + bottom sheet -----
  if (isMobile) {
    const profileFab = (
      <Link
        href={user ? "/dashboard" : "/login?next=/dashboard"}
        aria-label={user ? "הפרופיל שלי" : "כניסה"}
        onClick={(e) => e.stopPropagation()}
        className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
          user
            ? "bg-(--color-moss) text-(--color-ivory)"
            : "bg-(--color-cream) text-(--color-deep)"
        }`}
      >
        {user ? (
          <UserRound className="w-6 h-6" strokeWidth={2.25} />
        ) : (
          <LogIn className="w-6 h-6" strokeWidth={2.25} />
        )}
      </Link>
    );

    const createFab = isRealtor ? (
      <Link
        href="/create"
        aria-label="פרסם בית פתוח חדש"
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 w-14 h-14 rounded-full bg-(--color-moss) text-(--color-ivory) flex items-center justify-center shadow-lg shadow-(--color-moss)/40 transition-all active:scale-95 hover:bg-(--color-forest)"
      >
        <Plus className="w-7 h-7" strokeWidth={3} />
      </Link>
    ) : null;

    return (
      <main className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0" onClickCapture={handleMapTap}>
          <MapContainer
            onEventSelect={setSelected}
            selectedEvent={selected}
            onBoundsChange={setBounds}
          />
        </div>

        {/* Decorative top brand plaque. Pointer-events-none so it doesn't
            block map gestures. Two-line: logo + brand, tagline below. */}
        <div className="absolute top-0 inset-x-0 pt-safe z-[1200] pointer-events-none">
          <div className="flex justify-center px-3 pt-3">
            <div className="inline-flex items-center gap-2.5 bg-(--color-ivory)/95 backdrop-blur-md rounded-2xl px-3.5 py-2 shadow-[0_4px_20px_rgba(20,28,10,0.08)] ring-1 ring-(--color-moss)/10">
              <svg
                width="32"
                height="32"
                viewBox="0 0 64 64"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
                className="shrink-0"
              >
                <path
                  fill="var(--color-moss)"
                  d="M32 2 C18.7 2 8 12.7 8 26 c0 18.4 24 36 24 36 s24-17.6 24-36 C56 12.7 45.3 2 32 2 z"
                />
                <path
                  fill="var(--color-ivory)"
                  d="M32 14 L18 26 L21 26 L21 39 L29 39 L29 31 L35 31 L35 39 L43 39 L43 26 L46 26 Z"
                />
              </svg>
              <div className="flex flex-col leading-tight">
                <span className="text-[15px] font-[var(--font-display)] font-bold text-(--color-deep) tracking-tight">
                  OpenHouse Map
                </span>
                <span className="text-[11px] text-(--color-moss) font-medium">
                  כל הבתים הפתוחים — במקום אחד
                </span>
              </div>
            </div>
          </div>
        </div>

        <MobileSheet
          countLabel={`${visible.length} בתים פתוחים`}
          hidden={!!selected}
          snap={sheetSnap}
          onSnapChange={setSheetSnap}
          leadingAction={createFab}
          trailingAction={profileFab}
        >
          {sidebarContent}
        </MobileSheet>

        <EventPopup event={selected} onClose={() => setSelected(null)} />
      </main>
    );
  }

  // ----- Desktop: in RTL the sidebar belongs on the VISUAL RIGHT (mirror of
  // Western "sidebar-left" pattern). DOM order = aside first, map second.
  // dir=rtl on <html> + plain flex-row places aside on the right naturally,
  // no `order-*` reordering needed. border-r instead of border-l so the
  // sidebar separator sits between sidebar (right) and map (left). -----
  return (
    <main className="flex flex-row h-svh-safe overflow-hidden">
      <aside className="w-[380px] flex-shrink-0 bg-(--surface) border-l border-(--color-cream) flex flex-col overflow-hidden">
        {/* Title row: brand on its OWN line so it never collides with action
            chrome. Profile pill stays inline on the right (visual left in
            RTL) — small enough to not crowd a long title. Tagline + create
            CTA stack underneath. */}
        <header className="px-4 pt-3 pb-3 border-b border-(--color-cream) space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-[var(--font-display)] font-bold text-(--color-deep) tracking-tight leading-tight">
              {t("name")}
            </h1>
            <Link
              href={user ? "/dashboard" : "/login?next=/dashboard"}
              aria-label="הפרופיל שלי"
              className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ring-2 ${
                user
                  ? "bg-(--color-moss) text-(--color-ivory) ring-(--color-moss)/30 hover:ring-(--color-moss)/60"
                  : "bg-(--color-cream) text-(--color-deep) ring-(--color-moss)/20 hover:ring-(--color-moss)/50"
              }`}
            >
              {user ? <UserRound className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
            </Link>
          </div>
          <p className="text-xs text-(--color-moss) font-medium">
            {t("tagline")}
          </p>
          {isRealtor && (
            <Link
              href="/create"
              aria-label="פרסם בית פתוח חדש"
              className="inline-flex items-center gap-1.5 bg-(--color-moss) text-(--color-ivory) rounded-full pl-3 pr-2 py-1.5 text-sm font-medium hover:bg-(--color-forest) active:scale-[0.97] transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Open House
            </Link>
          )}
        </header>
        <div className="flex-1 overflow-y-auto">{sidebarContent}</div>
      </aside>

      <section className="flex-1 relative">
        <MapContainer onEventSelect={setSelected} selectedEvent={selected} />
        <EventPopup event={selected} onClose={() => setSelected(null)} />
      </section>
    </main>
  );
}
