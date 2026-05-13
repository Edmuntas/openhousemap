"use client";

import { useRouter } from "next/navigation";
import { Check, HelpCircle, X as XIcon } from "lucide-react";
import { useRsvp, type RsvpStatus } from "@/hooks/useRsvp";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  eventId: string;
}

const OPTIONS: {
  value: RsvpStatus;
  label: string;
  Icon: typeof Check;
}[] = [
  { value: "attending", label: "אגיע", Icon: Check },
  { value: "maybe", label: "אולי", Icon: HelpCircle },
  { value: "declined", label: "לא", Icon: XIcon },
];

export default function RsvpButtons({ eventId }: Props) {
  const router = useRouter();
  const { user, claims } = useAuth();
  const { status, loading, update } = useRsvp(eventId);

  async function pick(v: RsvpStatus) {
    // No session — send to login with intent encoded in the next URL
    if (!user) {
      router.push(
        `/login?next=${encodeURIComponent(`/e/${eventId}?rsvp=${v}`)}`
      );
      return;
    }
    // Signed in but not yet a verified realtor — go to registration completion
    if (!claims?.verified && !claims?.admin) {
      router.push(`/register?next=${encodeURIComponent(`/e/${eventId}?rsvp=${v}`)}`);
      return;
    }
    try {
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
              onClick={(e) => {
                e.stopPropagation();
                pick(opt.value);
              }}
              aria-pressed={active}
              aria-busy={loading}
              style={{ touchAction: "manipulation" }}
              className={`py-2.5 px-3 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-colors active:scale-95 ${
                active
                  ? opt.value === "attending"
                    ? "bg-(--vis-green) text-white"
                    : opt.value === "maybe"
                    ? "bg-(--color-gold) text-(--color-deep)"
                    : "bg-(--vis-red) text-white"
                  : "bg-(--color-cream) text-(--color-deep) hover:bg-(--color-sage)/30"
              }`}
            >
              <opt.Icon className="w-4 h-4" aria-hidden />
              {opt.label}
            </button>
          );
        })}
      </div>
      {!user && (
        <p className="text-xs text-(--color-moss) mt-1.5 opacity-80">
          לאישור הגעה צריך להירשם
        </p>
      )}
    </div>
  );
}
