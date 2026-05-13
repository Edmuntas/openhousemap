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

        {/* Floating top chrome — minimal & non-overlapping. Brand on visual
            right (RTL natural), action FABs on visual left. */}
        <div className="absolute top-0 inset-x-0 pt-safe pl-safe pr-safe z-[1200] pointer-events-none">
          <div className="flex items-start justify-between gap-2 px-3 py-3">
            <div className="bg-(--surface)/95 backdrop-blur rounded-full px-3 py-1.5 shadow-md pointer-events-auto">
              <h1 className="text-xs font-[var(--font-display)] font-bold text-(--color-deep) leading-tight tracking-tight">
                {t("name")}
              </h1>
            </div>
            <Link
              href={user ? "/dashboard" : "/login?next=/dashboard"}
              aria-label="הפרופיל שלי"
              className={`pointer-events-auto shrink-0 w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 ring-2 ${
                user
                  ? "bg-(--color-moss) text-(--color-ivory) ring-(--color-ivory)/70"
                  : "bg-(--surface)/95 backdrop-blur text-(--color-deep) ring-(--color-moss)/20"
              }`}
            >
              {user ? <UserRound className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
            </Link>
          </div>
        </div>

        <MobileSheet
          countLabel={`${filtered.length} בתים פתוחים`}
          hidden={!!selected}
          snap={sheetSnap}
          onSnapChange={setSheetSnap}
          leadingAction={
            isRealtor ? (
              <Link
                href="/create"
                aria-label="פרסם בית פתוח חדש"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 bg-(--color-moss) text-(--color-ivory) rounded-full pl-3 pr-2 py-1.5 text-sm font-semibold hover:bg-(--color-forest) active:scale-[0.97] transition-all whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Open House
              </Link>
            ) : null
          }
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
        <header className="px-4 pt-3 pb-3 border-b border-(--color-cream) flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-[var(--font-display)] font-bold text-(--color-deep) tracking-tight truncate">
              {t("name")}
            </h1>
            <p className="text-xs text-(--color-moss) font-medium truncate">
              {t("tagline")}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
