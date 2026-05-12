"use client";

import { useRsvp, type RsvpStatus } from "@/hooks/useRsvp";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  eventId: string;
}

const OPTIONS: { value: RsvpStatus; label: string; emoji: string }[] = [
  { value: "attending", label: "אגיע", emoji: "✓" },
  { value: "maybe", label: "אולי", emoji: "?" },
  { value: "declined", label: "לא", emoji: "✕" },
];

export default function RsvpButtons({ eventId }: Props) {
  const { user, claims, loading: authLoading } = useAuth();
  const { status, loading, update } = useRsvp(eventId);

  // Only show for verified realtors / admins
  const isEligible = !!user && (claims?.verified || claims?.admin);
  if (authLoading || !isEligible) return null;

  async function pick(v: RsvpStatus) {
    try {
      // Toggle off if clicking the active status
      await update(status === v ? null : v);
    } catch (e) {
      console.error("[rsvp]", e);
    }
  }

  return (
    <div className="border-t border-(--color-cream) pt-3">
      <p className="text-xs text-(--color-moss) mb-2">האם תגיע?</p>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => {
          const active = status === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => pick(opt.value)}
              disabled={loading}
              aria-pressed={active}
              className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                active
                  ? opt.value === "attending"
                    ? "bg-(--vis-green) text-white"
                    : opt.value === "maybe"
                    ? "bg-(--color-gold) text-(--color-deep)"
                    : "bg-(--vis-red) text-white"
                  : "bg-(--color-cream) text-(--color-deep) hover:bg-(--color-sage)/30"
              }`}
            >
              <span aria-hidden className="ml-1">{opt.emoji}</span>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
