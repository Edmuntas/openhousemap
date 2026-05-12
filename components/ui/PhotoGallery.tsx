"use client";

import { useEffect, useRef, useState } from "react";
import PhotoLightbox from "./PhotoLightbox";
import type { PhotoSet } from "@/types/event";

interface Props {
  photos: PhotoSet[];
  alt: string;
  aspect?: "video" | "square" | "auto";
}

export default function PhotoGallery({ photos, alt, aspect = "video" }: Props) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      if (i !== index) setIndex(i);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [index]);

  function goTo(i: number) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  if (!photos.length) {
    return (
      <div
        className={`bg-(--color-cream) flex items-center justify-center text-(--color-moss) text-sm rounded-2xl ${
          aspect === "square" ? "aspect-square" : "aspect-video"
        }`}
      >
        אין תמונות זמינות
      </div>
    );
  }

  const aspectClass =
    aspect === "square"
      ? "aspect-square"
      : aspect === "auto"
      ? ""
      : "aspect-video";

  return (
    <>
      <div className="relative group">
        <div
          ref={scrollerRef}
          className={`flex overflow-x-auto snap-x snap-mandatory ${aspectClass} bg-(--color-cream) rounded-2xl scrollbar-hide`}
          style={{ scrollbarWidth: "none" }}
        >
          {photos.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="flex-shrink-0 w-full snap-center cursor-zoom-in"
              aria-label={`תמונה ${i + 1} מתוך ${photos.length} — לחץ להגדלה`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.medium ?? p.full}
                alt={`${alt} — ${i + 1}`}
                loading={i === 0 ? "eager" : "lazy"}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(Math.max(0, index - 1))}
              disabled={index === 0}
              aria-label="הקודם"
              className="absolute top-1/2 right-2 -translate-y-1/2 w-9 h-9 rounded-full bg-(--surface)/85 backdrop-blur shadow-md flex items-center justify-center text-(--color-deep) opacity-0 group-hover:opacity-100 disabled:opacity-20 transition-opacity md:opacity-90 hover:opacity-100"
            >
              ▶
            </button>
            <button
              type="button"
              onClick={() => goTo(Math.min(photos.length - 1, index + 1))}
              disabled={index === photos.length - 1}
              aria-label="הבא"
              className="absolute top-1/2 left-2 -translate-y-1/2 w-9 h-9 rounded-full bg-(--surface)/85 backdrop-blur shadow-md flex items-center justify-center text-(--color-deep) opacity-0 group-hover:opacity-100 disabled:opacity-20 transition-opacity md:opacity-90 hover:opacity-100"
            >
              ◀
            </button>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 px-2.5 py-1.5 rounded-full bg-(--surface)/85 backdrop-blur shadow">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`עבור לתמונה ${i + 1}`}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === index ? "bg-(--color-deep) w-4" : "bg-(--color-deep)/30"
                  }`}
                />
              ))}
            </div>

            <div className="absolute top-2 left-2 rtl:left-auto rtl:right-2 px-2 py-0.5 rounded-full bg-(--color-deep)/70 text-(--color-ivory) text-xs">
              {index + 1} / {photos.length}
            </div>
          </>
        )}
      </div>

      {lightboxOpen && (
        <PhotoLightbox
          photos={photos}
          startIndex={index}
          alt={alt}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
