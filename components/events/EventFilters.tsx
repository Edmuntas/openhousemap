"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Home, Star, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

import type { LucideIcon } from "lucide-react";

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

  const propertyTypes: {
    value: FilterState["propertyType"];
    label: string;
    Icon?: LucideIcon;
  }[] = [
    { value: "all", label: "הכול", Icon: Sparkles },
    { value: "apartment", label: "דירה", Icon: Building2 },
    { value: "house", label: "בית", Icon: Home },
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
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              value.propertyType === pt.value
                ? "bg-(--color-moss) text-(--color-ivory)"
                : "bg-(--color-cream) text-(--color-deep) hover:bg-(--color-sage)/40"
            }`}
          >
            {pt.Icon && <pt.Icon className="w-3.5 h-3.5" aria-hidden />}
            {pt.label}
          </button>
        ))}
        <button
          type="button"
          onClick={toggleFavourites}
          aria-pressed={value.onlyFavourites}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
            value.onlyFavourites
              ? "bg-(--color-gold) text-(--color-deep) font-medium"
              : "bg-(--color-cream) text-(--color-deep) hover:bg-(--color-gold)/40"
          }`}
        >
          <Star
            className={`w-3.5 h-3.5 ${value.onlyFavourites ? "fill-(--color-deep)" : ""}`}
            aria-hidden
          />
          מועדפים
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
