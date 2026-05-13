"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import MapContainer from "./MapContainer";
import EventList from "@/components/events/EventList";
import EventFilters, { type FilterState } from "@/components/events/EventFilters";
import EventPopup from "@/components/events/EventPopup";
import MobileSheet, { type Snap } from "@/components/ui/MobileSheet";
import { useEvents, type EventWithId } from "@/hooks/useEvents";
import { useMyFavourites } from "@/hooks/useFavourite";
import { useAuth } from "@/hooks/useAuth";
import { UserRound, LogIn } from "lucide-react";

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
  const { events, loading } = useEvents();
  const { eventIds: favouriteIds } = useMyFavourites();
  const favSet = useMemo(() => new Set(favouriteIds), [favouriteIds]);
  const { user } = useAuth();

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
    return (
      <main className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0" onClickCapture={handleMapTap}>
          <MapContainer
            onEventSelect={setSelected}
            selectedEvent={selected}
          />
        </div>

        {/* Floating brand chip + profile shortcut at top, respects Dynamic Island */}
        <div className="absolute top-0 inset-x-0 pl-safe pr-safe pt-safe z-[1200] flex justify-center items-center gap-2 px-3">
          <div className="bg-(--surface)/95 backdrop-blur rounded-full px-4 py-1.5 shadow-md">
            <h1 className="text-sm font-[var(--font-display)] text-(--color-deep) leading-tight">
              {t("name")}
            </h1>
          </div>
          <Link
            href={user ? "/dashboard" : "/login?next=/dashboard"}
            aria-label="הפרופיל שלי"
            className="bg-(--surface)/95 backdrop-blur rounded-full w-9 h-9 shadow-md flex items-center justify-center text-(--color-deep) hover:bg-(--color-cream) transition-colors"
          >
            {user ? <UserRound className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
          </Link>
        </div>

        <MobileSheet
          countLabel={`${filtered.length} בתים פתוחים`}
          hidden={!!selected}
          snap={sheetSnap}
          onSnapChange={setSheetSnap}
        >
          {sidebarContent}
        </MobileSheet>

        <EventPopup event={selected} onClose={() => setSelected(null)} />
      </main>
    );
  }

  // ----- Desktop: sidebar left of map -----
  return (
    <main className="flex flex-row h-svh-safe overflow-hidden pl-safe pr-safe">
      <aside className="w-[380px] flex-shrink-0 bg-(--surface) border-l border-(--color-cream) flex flex-col overflow-hidden order-2">
        <header className="px-4 pt-3 pb-3 border-b border-(--color-cream) flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-[var(--font-display)] text-(--color-deep)">
              {t("name")}
            </h1>
            <p className="text-xs text-(--color-moss)">{t("tagline")}</p>
          </div>
          <Link
            href={user ? "/dashboard" : "/login?next=/dashboard"}
            aria-label="הפרופיל שלי"
            className="shrink-0 w-9 h-9 rounded-full bg-(--color-cream) hover:bg-(--color-sage)/40 flex items-center justify-center text-(--color-deep)"
          >
            {user ? <UserRound className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
          </Link>
        </header>
        <div className="flex-1 overflow-y-auto">{sidebarContent}</div>
      </aside>

      <section className="flex-1 relative order-1">
        <MapContainer onEventSelect={setSelected} selectedEvent={selected} />
        <EventPopup event={selected} onClose={() => setSelected(null)} />
      </section>
    </main>
  );
}
