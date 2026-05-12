"use client";

import { useEffect, useRef, useState } from "react";

type Snap = "collapsed" | "half" | "full";

interface Props {
  children: React.ReactNode;
  hidden?: boolean;
  countLabel?: string;
}

const HEIGHTS: Record<Snap, string> = {
  collapsed: "92px",
  half: "55dvh",
  full: "92dvh",
};

export default function MobileSheet({ children, hidden, countLabel }: Props) {
  const [snap, setSnap] = useState<Snap>("collapsed");
  const startYRef = useRef<number | null>(null);
  const startSnapRef = useRef<Snap>("collapsed");

  function cycle() {
    setSnap((s) => (s === "collapsed" ? "half" : s === "half" ? "full" : "collapsed"));
  }

  function onTouchStart(e: React.TouchEvent) {
    startYRef.current = e.touches[0].clientY;
    startSnapRef.current = snap;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (startYRef.current == null) return;
    const dy = e.changedTouches[0].clientY - startYRef.current;
    const startSnap = startSnapRef.current;
    if (dy < -40) {
      // swipe up — expand
      setSnap(startSnap === "collapsed" ? "half" : "full");
    } else if (dy > 40) {
      // swipe down — collapse
      setSnap(startSnap === "full" ? "half" : "collapsed");
    }
    startYRef.current = null;
  }

  // Lock body scroll only when fully expanded
  useEffect(() => {
    if (snap === "full") {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [snap]);

  if (hidden) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[1500] bg-(--surface) rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-[height] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col pl-safe pr-safe"
      style={{ height: HEIGHTS[snap] }}
      role="dialog"
      aria-label="רשימת בתים פתוחים"
    >
      <button
        type="button"
        onClick={cycle}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        aria-label="הרחב או צמצם רשימה"
        className="w-full flex flex-col items-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing"
      >
        <span className="w-12 h-1.5 rounded-full bg-(--color-cream) mb-1.5" />
        {snap === "collapsed" && countLabel && (
          <span className="text-sm text-(--color-deep) font-medium">
            {countLabel}
          </span>
        )}
      </button>
      <div className="flex-1 overflow-y-auto overscroll-contain pb-safe">
        {children}
      </div>
    </div>
  );
}
