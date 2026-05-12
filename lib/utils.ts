/**
 * Compact price formatter for map pins. Long form is used in cards/popups.
 */
export function formatPrice(price: number): string {
  if (price >= 1_000_000) {
    const m = price / 1_000_000;
    const formatted = m % 1 === 0 ? m.toString() : m.toFixed(1).replace(/\.0$/, "");
    return `₪${formatted}M`;
  }
  if (price >= 1_000) {
    const k = Math.round(price / 1_000);
    return `₪${k}K`;
  }
  return `₪${price}`;
}

/** Full price with thousands separators for popups/cards. */
export function formatPriceFull(price: number, locale = "he"): string {
  return `₪${price.toLocaleString(locale === "he" ? "he-IL" : locale)}`;
}

/** Normalize Israeli phone numbers to E.164 (`+972...`). */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("972")) return `+${digits}`;
  if (digits.startsWith("0")) return `+972${digits.slice(1)}`;
  return `+${digits}`;
}

/** ISO date today in YYYY-MM-DD (Jerusalem). */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
