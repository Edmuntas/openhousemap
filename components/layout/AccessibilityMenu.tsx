"use client";

/**
 * Accessibility menu — own implementation, NOT a third-party overlay.
 * CLAUDE.md hard rule: "Never use overlay plugins for accessibility
 * (IS 5568 requires real code)". Israeli users still expect a wheelchair-icon
 * button in the corner with the standard set of toggles, so we build one
 * ourselves and persist preferences in localStorage.
 *
 * Toggles control CSS classes on <html> defined in globals.css.
 */
import Link from "next/link";
import { Accessibility } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "a11y-prefs-v1";

const FONT_OPTIONS: { id: FontMode; label: string }[] = [
  { id: "default", label: "ברירת מחדל" },
  { id: "large", label: "גדול" },
  { id: "larger", label: "גדול יותר" },
];

type FontMode = "default" | "large" | "larger";

interface Prefs {
  font: FontMode;
  highContrast: boolean;
  underlineLinks: boolean;
  noMotion: boolean;
}

const DEFAULT_PREFS: Prefs = {
  font: "default",
  highContrast: false,
  underlineLinks: false,
  noMotion: false,
};

function applyPrefs(p: Prefs) {
  const html = document.documentElement;
  html.classList.toggle("a11y-font-large", p.font === "large");
  html.classList.toggle("a11y-font-larger", p.font === "larger");
  html.classList.toggle("a11y-high-contrast", p.highContrast);
  html.classList.toggle("a11y-underline-links", p.underlineLinks);
  html.classList.toggle("a11y-no-motion", p.noMotion);
}

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) } as Prefs;
  } catch {
    return DEFAULT_PREFS;
  }
}

export default function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Hydrate from storage and apply on mount. Reading localStorage and
  // toggling html classes is exactly the kind of one-shot client-only
  // setup that set-state-in-effect was made for.
  useEffect(() => {
    const p = loadPrefs();
    applyPrefs(p);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(p);
    setHydrated(true);
  }, []);

  // Persist + apply on every change post-hydration.
  useEffect(() => {
    if (!hydrated) return;
    applyPrefs(prefs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // localStorage disabled — preferences just won't persist
    }
  }, [prefs, hydrated]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || buttonRef.current?.contains(t))
        return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function reset() {
    setPrefs(DEFAULT_PREFS);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="פתח תפריט נגישות"
        aria-expanded={open}
        aria-controls="a11y-menu"
        className="fixed bottom-4 start-4 z-[9000] w-12 h-12 rounded-full bg-[#0F62FE] text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-[#0F62FE] focus:ring-offset-2"
      >
        {/* Universal Access Symbol — recognised internationally */}
        <Accessibility className="w-6 h-6" strokeWidth={2.25} aria-hidden />
      </button>

      {open && (
        <div
          id="a11y-menu"
          ref={menuRef}
          role="dialog"
          aria-label="תפריט נגישות"
          className="fixed bottom-20 start-4 z-[9000] w-72 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl ring-1 ring-(--color-cream) p-4 space-y-3 text-(--color-deep)"
          dir="rtl"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">נגישות</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="סגור תפריט נגישות"
              className="text-(--color-moss) hover:text-(--color-deep) text-xl leading-none px-1"
            >
              ×
            </button>
          </div>

          <div>
            <div
              id="a11y-font-label"
              className="text-xs font-medium text-(--color-moss) mb-1.5"
            >
              גודל טקסט
            </div>
            <div
              className="grid grid-cols-3 gap-1.5"
              role="radiogroup"
              aria-labelledby="a11y-font-label"
            >
              {FONT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={prefs.font === opt.id}
                  onClick={() => setPrefs((p) => ({ ...p, font: opt.id }))}
                  className={`text-xs py-2 rounded-lg border ${
                    prefs.font === opt.id
                      ? "bg-(--color-deep) text-(--color-ivory) border-(--color-deep)"
                      : "bg-(--color-ivory) border-(--color-cream) hover:border-(--color-moss)"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Toggle
            label="ניגודיות גבוהה"
            checked={prefs.highContrast}
            onChange={(v) =>
              setPrefs((p) => ({ ...p, highContrast: v }))
            }
          />
          <Toggle
            label="הדגש קישורים"
            checked={prefs.underlineLinks}
            onChange={(v) =>
              setPrefs((p) => ({ ...p, underlineLinks: v }))
            }
          />
          <Toggle
            label="עצור אנימציות"
            checked={prefs.noMotion}
            onChange={(v) => setPrefs((p) => ({ ...p, noMotion: v }))}
          />

          <button
            type="button"
            onClick={reset}
            className="w-full text-xs py-2 rounded-lg border border-(--color-cream) hover:bg-(--color-ivory) text-(--color-moss)"
          >
            איפוס הגדרות
          </button>

          <p className="text-[11px] text-(--color-moss)/80 leading-snug pt-1 border-t border-(--color-cream)">
            תקלת נגישות?{" "}
            <Link
              href="/accessibility"
              className="underline hover:text-(--color-deep)"
            >
              הצהרת נגישות
            </Link>{" "}
            ו-
            <a
              href="mailto:openhousemap@gmail.com?subject=נגישות"
              className="underline hover:text-(--color-deep)"
            >
              דווח לרכז
            </a>
            .
          </p>
        </div>
      )}
    </>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span id={`a11y-toggle-${label}`}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`a11y-toggle-${label}`}
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full relative transition-colors ${
          checked ? "bg-(--color-moss)" : "bg-(--color-cream)"
        }`}
      >
        <span
          className={`absolute top-0.5 ${
            checked ? "start-4" : "start-0.5"
          } w-5 h-5 bg-white rounded-full shadow transition-all`}
        />
      </button>
    </div>
  );
}
