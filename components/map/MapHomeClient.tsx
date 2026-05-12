"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import MapContainer from "./MapContainer";
import EventList from "@/components/events/EventList";
import EventFilters, { type FilterState } from "@/components/events/EventFilters";
import EventPopup from "@/components/events/EventPopup";
import MobileSheet from "@/components/ui/MobileSheet";
import { useEvents, type EventWithId } from "@/hooks/useEvents";

export default function MapHomeClient() {
  const t = useTranslations("app");
  const [filters, setFilters] = useState<FilterState>({
    city: "",
    propertyType: "all",
    timeRange: "all",
  });
  const [selected, setSelected] = useState<EventWithId | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { events, loading } = useEvents();

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
      return true;
    });
  }, [events, filters]);

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

  // ----- Mobile: fullscreen map + bottom sheet -----
  if (isMobile) {
    return (
      <main className="fixed inset-0 overflow-hidden">
        <MapContainer onEventSelect={setSelected} selectedEvent={selected} />

        {/* Floating brand chip at top, respects Dynamic Island */}
        <div
          className="absolute top-0 inset-x-0 pl-safe pr-safe pt-safe z-[1200] pointer-events-none"
          aria-hidden
        >
          <div className="mx-auto w-fit bg-(--surface)/95 backdrop-blur rounded-full px-4 py-1.5 shadow-md pointer-events-auto">
            <h1 className="text-sm font-[var(--font-display)] text-(--color-deep) leading-tight">
              {t("name")}
            </h1>
          </div>
        </div>

        <MobileSheet
          countLabel={`${filtered.length} בתים פתוחים · משוך למעלה`}
          hidden={!!selected}
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
        <header className="px-4 pt-3 pb-3 border-b border-(--color-cream)">
          <h1 className="text-2xl font-[var(--font-display)] text-(--color-deep)">
            {t("name")}
          </h1>
          <p className="text-xs text-(--color-moss)">{t("tagline")}</p>
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
