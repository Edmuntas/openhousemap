"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export interface FilterState {
  city: string;
  propertyType: "all" | "apartment" | "house";
  timeRange: "today" | "week" | "all";
  onlyFavourites: boolean;
}

interface EventFiltersProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
}

export default function EventFilters({ value, onChange }: EventFiltersProps) {
  const [cityInput, setCityInput] = useState(value.city);
  const router = useRouter();
  const { user } = useAuth();

  const propertyTypes: { value: FilterState["propertyType"]; label: string }[] = [
    { value: "all", label: "הכול" },
    { value: "apartment", label: "🏢 דירה" },
    { value: "house", label: "🏠 בית" },
  ];

  const timeRanges: { value: FilterState["timeRange"]; label: string }[] = [
    { value: "today", label: "היום" },
    { value: "week", label: "השבוע" },
    { value: "all", label: "הכול" },
  ];

  function toggleFavourites() {
    if (!user) {
      router.push("/login?next=/");
      return;
    }
    onChange({ ...value, onlyFavourites: !value.onlyFavourites });
  }

  return (
    <div className="p-3 bg-(--surface) border-b border-(--color-cream) space-y-2">
      <input
        type="text"
        value={cityInput}
        onChange={(e) => {
          setCityInput(e.target.value);
          onChange({ ...value, city: e.target.value });
        }}
        placeholder="חיפוש לפי עיר…"
        aria-label="חיפוש לפי עיר"
        className="w-full px-4 py-2.5 rounded-xl bg-(--color-cream) text-(--color-deep) placeholder:text-(--color-moss) focus:outline-2 focus:outline-(--color-moss)"
      />
      <div className="flex gap-1 overflow-x-auto">
        {propertyTypes.map((pt) => (
          <button
            key={pt.value}
            type="button"
            onClick={() => onChange({ ...value, propertyType: pt.value })}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              value.propertyType === pt.value
                ? "bg-(--color-moss) text-(--color-ivory)"
                : "bg-(--color-cream) text-(--color-deep) hover:bg-(--color-sage)/40"
            }`}
          >
            {pt.label}
          </button>
        ))}
        <button
          type="button"
          onClick={toggleFavourites}
          aria-pressed={value.onlyFavourites}
          className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
            value.onlyFavourites
              ? "bg-(--color-gold) text-(--color-deep) font-medium"
              : "bg-(--color-cream) text-(--color-deep) hover:bg-(--color-gold)/40"
          }`}
        >
          {value.onlyFavourites ? "★" : "☆"} מועדפים
        </button>
      </div>
      <div className="flex gap-1">
        {timeRanges.map((tr) => (
          <button
            key={tr.value}
            type="button"
            onClick={() => onChange({ ...value, timeRange: tr.value })}
            className={`flex-1 px-3 py-1.5 rounded-full text-xs transition-colors ${
              value.timeRange === tr.value
                ? "bg-(--color-deep) text-(--color-ivory)"
                : "bg-(--color-cream) text-(--color-deep) hover:bg-(--color-sage)/40"
            }`}
          >
            {tr.label}
          </button>
        ))}
      </div>
    </div>
  );
}
