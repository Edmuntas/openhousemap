"use client";

import { useRouter } from "next/navigation";
import { useFavourite } from "@/hooks/useFavourite";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  eventId: string;
  className?: string;
}

export default function FavouriteButton({ eventId, className = "" }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { isFav, loading, toggle } = useFavourite(eventId);

  async function onClick() {
    if (!user) {
      router.push(`/login?next=/e/${eventId}`);
      return;
    }
    try {
      await toggle();
    } catch (e) {
      console.error("[favourite]", e);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-pressed={isFav}
      aria-label={isFav ? "הסר ממועדפים" : "הוסף למועדפים"}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
        isFav
          ? "bg-(--color-gold) text-(--color-deep)"
          : "bg-(--color-cream) hover:bg-(--color-gold)/40 text-(--color-deep)"
      } ${className}`}
    >
      <span className="text-lg leading-none">{isFav ? "★" : "☆"}</span>
    </button>
  );
}
