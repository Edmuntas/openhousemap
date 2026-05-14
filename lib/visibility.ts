/**
 * Single source of truth for event visibility colour + label.
 *
 * Previously these constants were copy-pasted in MapInner.tsx, EventPopup.tsx,
 * and app/[locale]/e/[id]/page.tsx — and had already drifted ("🔴 לקולגות בלבד"
 * in popup vs "🔴 קולגות" on detail page). Import from here only.
 */
import type { EventVisibility } from "@/types";

export interface VisibilityMeta {
  /** Display label in hebrew, includes the canonical emoji dot. */
  label: string;
  /** Hex color used for the pin dot/border and the chip background. */
  color: string;
  /** Short label without emoji — for compact UI like the dashboard. */
  shortLabel: string;
}

export const VISIBILITY_META: Record<EventVisibility, VisibilityMeta> = {
  public: {
    label: "🟢 פתוח לציבור",
    shortLabel: "ציבורי",
    color: "#4A9B5C",
  },
  mixed: {
    label: "🟡 משולב",
    shortLabel: "משולב",
    color: "#D4980C",
  },
  colleagues: {
    label: "🔴 קולגות",
    shortLabel: "קולגות",
    color: "#C04848",
  },
};

export function visibilityOf(v: string | undefined | null): VisibilityMeta {
  if (v === "mixed" || v === "colleagues" || v === "public") {
    return VISIBILITY_META[v];
  }
  return VISIBILITY_META.public;
}

/** Marker color for the map pins — same as `VISIBILITY_META[v].color`. */
export const VISIBILITY_COLOR: Record<EventVisibility, string> = {
  public: VISIBILITY_META.public.color,
  mixed: VISIBILITY_META.mixed.color,
  colleagues: VISIBILITY_META.colleagues.color,
};
