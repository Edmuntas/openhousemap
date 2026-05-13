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
  const { user, loading: authLoading } = useAuth();
  const { isFav, loading, toggle } = useFavourite(eventId);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (authLoading) return;
    if (!user) {
      router.push(`/login?next=/e/${eventId}`);
      return;
    }
    try {
      await toggle();
    } catch (err) {
      console.error("[favourite]", err);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      // Disable only during the actual write — keep clickable while auth resolves
      aria-pressed={isFav}
      aria-busy={loading || authLoading}
      aria-label={isFav ? "הסר ממועדפים" : "הוסף למועדפים"}
      style={{ touchAction: "manipulation" }}
      className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors active:scale-95 ${
        isFav
          ? "bg-(--color-gold) text-(--color-deep)"
          : "bg-(--color-cream) hover:bg-(--color-gold)/40 text-(--color-deep)"
      } ${className}`}
    >
      <span className="text-lg leading-none">{isFav ? "★" : "☆"}</span>
    </button>
  );
}
