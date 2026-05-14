"use client";

import { useEffect, useRef } from "react";

export type Snap = "collapsed" | "half" | "full";

interface Props {
  children: React.ReactNode;
  hidden?: boolean;
  countLabel?: string;
  /** Slot on the visual RIGHT in RTL (justify-start flex side). Used for the
   *  primary thumb-zone CTA (e.g. + Open House FAB). */
  leadingAction?: React.ReactNode;
  /** Slot on the visual LEFT in RTL (justify-end flex side). Used for the
   *  secondary FAB (e.g. profile). Replaces the chevron affordance when
   *  provided; the handle bar still indicates expand/collapse. */
  trailingAction?: React.ReactNode;
  snap: Snap;
  onSnapChange: (s: Snap) => void;
}

const HEIGHTS: Record<Snap, string> = {
  collapsed: "72px",
  half: "55dvh",
  full: "92dvh",
};

export default function MobileSheet({
  children,
  hidden,
  countLabel,
  leadingAction,
  trailingAction,
  snap,
  onSnapChange,
}: Props) {
  const startYRef = useRef<number | null>(null);
  const startSnapRef = useRef<Snap>("collapsed");

  function onHandleClick() {
    onSnapChange(snap === "collapsed" ? "half" : "collapsed");
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
      onSnapChange(startSnap === "collapsed" ? "half" : "full");
    } else if (dy > 40) {
      onSnapChange(startSnap === "full" ? "half" : "collapsed");
    }
    startYRef.current = null;
  }

  // Body scroll lock only at full snap
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

  const isCollapsed = snap === "collapsed";

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[1500] bg-(--surface) rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-[height] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col pl-safe pr-safe overflow-hidden"
      style={{ height: HEIGHTS[snap] }}
      role="dialog"
      aria-label="רשימת בתים פתוחים"
    >
      {/* Header row — thumb-zone CTAs flank the handle. In RTL flex-row:
          flex-1 + justify-start → renders on the VISUAL RIGHT (leadingAction)
          flex-1 + justify-end   → renders on the VISUAL LEFT  (trailingAction)
          Center: drag handle + count (always tappable to expand). */}
      <div className="w-full flex items-center justify-between gap-3 px-4 pt-3 pb-3">
        <div className="flex-1 min-w-0 flex justify-start">
          {leadingAction}
        </div>
        <button
          type="button"
          onClick={onHandleClick}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          aria-label={isCollapsed ? "פתח רשימה" : "סגור רשימה"}
          className="flex flex-col items-center touch-pan-y py-1 px-2"
        >
          <span className="w-12 h-1.5 rounded-full bg-(--color-cream)" />
          {isCollapsed && countLabel && (
            <span className="text-sm text-(--color-deep) font-semibold mt-2 whitespace-nowrap">
              {countLabel}
            </span>
          )}
        </button>
        <div className="flex-1 flex justify-end items-center">
          {trailingAction ?? (
            <span
              className="text-xs text-(--color-moss) opacity-70 px-1"
              aria-hidden
            >
              {isCollapsed ? "▲" : "▼"}
            </span>
          )}
        </div>
      </div>

      {/* Content — only interactive when expanded */}
      <div
        className={`flex-1 overflow-y-auto overscroll-contain pb-safe ${
          isCollapsed ? "pointer-events-none opacity-0" : "opacity-100"
        } transition-opacity duration-200`}
        aria-hidden={isCollapsed}
      >
        {children}
      </div>
    </div>
  );
}
