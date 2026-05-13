"use client";

import { useEffect, useRef, useState } from "react";
import type { PhotoSet } from "@/types/event";

interface Props {
  photos: PhotoSet[];
  startIndex: number;
  alt: string;
  onClose: () => void;
}

export default function PhotoLightbox({ photos, startIndex, alt, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const startXRef = useRef<number | null>(null);

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => Math.min(photos.length - 1, i + 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.max(0, i - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photos.length, onClose]);

  function onTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (startXRef.current == null) return;
    const dx = e.changedTouches[0].clientX - startXRef.current;
    if (dx > 50) setIndex((i) => Math.min(photos.length - 1, i + 1)); // swipe right (RTL forward)
    else if (dx < -50) setIndex((i) => Math.max(0, i - 1));
    startXRef.current = null;
  }

  const photo = photos[index];

  // Helper: clicks on inner controls / image should NOT close the lightbox
  function stop(e: React.MouseEvent | React.TouchEvent) {
    e.stopPropagation();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="גלריית תמונות"
      className="fixed inset-0 z-[3000] bg-black/95 flex flex-col cursor-zoom-out"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: "manipulation" }}
    >
      <button
        type="button"
        onClick={(e) => {
          stop(e);
          onClose();
        }}
        aria-label="סגור"
        style={{ touchAction: "manipulation" }}
        className="absolute top-4 right-4 rtl:right-auto rtl:left-4 w-11 h-11 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center z-10 backdrop-blur active:scale-95"
      >
        ✕
      </button>

      <div
        dir="ltr"
        className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-white/90 text-sm font-medium pointer-events-none"
      >
        {index + 1} / {photos.length}
      </div>

      <div className="flex-1 flex items-center justify-center p-4 pb-safe">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.full ?? photo.medium}
          alt={`${alt} — ${index + 1}`}
          onClick={stop}
          className="max-w-full max-h-full object-contain select-none cursor-default"
          draggable={false}
        />
      </div>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              setIndex((i) => Math.max(0, i - 1));
            }}
            disabled={index === 0}
            aria-label="הבא"
            style={{ touchAction: "manipulation" }}
            className="absolute top-1/2 left-4 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white text-xl flex items-center justify-center disabled:opacity-20 backdrop-blur active:scale-95"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              setIndex((i) => Math.min(photos.length - 1, i + 1));
            }}
            disabled={index === photos.length - 1}
            aria-label="הקודם"
            style={{ touchAction: "manipulation" }}
            className="absolute top-1/2 right-4 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white text-xl flex items-center justify-center disabled:opacity-20 backdrop-blur active:scale-95"
          >
            ▶
          </button>

          <div className="flex justify-center gap-1.5 pb-6 pb-safe" onClick={stop}>
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  stop(e);
                  setIndex(i);
                }}
                aria-label={`עבור לתמונה ${i + 1}`}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === index ? "bg-white w-6" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
