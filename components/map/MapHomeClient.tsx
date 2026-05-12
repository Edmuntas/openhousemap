"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import MapContainer from "./MapContainer";
import EventList from "@/components/events/EventList";
import EventFilters, { type FilterState } from "@/components/events/EventFilters";
import EventPopup from "@/components/events/EventPopup";
import { useEvents, type EventWithId } from "@/hooks/useEvents";

export default function MapHomeClient() {
  const t = useTranslations("app");
  const [filters, setFilters] = useState<FilterState>({
    city: "",
    propertyType: "all",
    timeRange: "all",
  });
  const [selected, setSelected] = useState<EventWithId | null>(null);
  const { events, loading } = useEvents();

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

  return (
    <main className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Sidebar (desktop) / top sheet (mobile) */}
      <aside className="md:w-[380px] md:flex-shrink-0 bg-(--surface) md:border-l border-(--color-cream) flex flex-col overflow-hidden md:order-2">
        <header className="px-4 py-3 border-b border-(--color-cream)">
          <h1 className="text-2xl font-[var(--font-display)] text-(--color-deep)">
            {t("name")}
          </h1>
          <p className="text-xs text-(--color-moss)">{t("tagline")}</p>
        </header>
        <EventFilters value={filters} onChange={setFilters} />
        <div className="flex-1 overflow-y-auto">
          <EventList
            events={filtered}
            loading={loading}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        </div>
      </aside>

      {/* Map */}
      <section className="flex-1 relative md:order-1 min-h-[50vh] md:min-h-0">
        <MapContainer onEventSelect={setSelected} />
        <EventPopup event={selected} onClose={() => setSelected(null)} />
      </section>
    </main>
  );
}
