"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "ohm-cookie-consent";

type Consent = "all" | "essential" | null;

function readConsent(): Consent {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "all" || v === "essential") return v;
    return null;
  } catch {
    return null;
  }
}

function writeConsent(v: Consent) {
  if (typeof window === "undefined") return;
  try {
    if (v) localStorage.setItem(STORAGE_KEY, v);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readConsent() === null) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  function accept(v: Consent) {
    writeConsent(v);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
      className="fixed inset-x-0 bottom-0 z-[2000] p-3 pb-safe pointer-events-none"
    >
      <div className="max-w-2xl mx-auto pointer-events-auto bg-(--color-ivory) ring-1 ring-(--color-moss)/20 rounded-2xl shadow-[0_8px_32px_rgba(20,28,10,0.18)] p-4 md:p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-(--color-cream) grid place-items-center text-(--color-moss)">
            <Cookie className="w-4.5 h-4.5" aria-hidden />
          </div>

          <div className="flex-1 min-w-0">
            <h2
              id="cookie-banner-title"
              className="text-base font-bold text-(--color-deep) mb-1"
            >
              עוגיות באתר
            </h2>
            <p
              id="cookie-banner-desc"
              className="text-sm text-(--color-deep)/85 leading-relaxed"
            >
              אנו משתמשים בעוגיות הכרחיות לפעולת השירות ובעוגיות פונקציונליות
              לשיפור החוויה. אין שימוש בעוגיות אנליטיקה של צד שלישי.{" "}
              <Link
                href="/cookies"
                className="text-(--color-moss) underline font-medium hover:text-(--color-deep)"
              >
                פרטים מלאים
              </Link>
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => accept("all")}
                className="px-4 py-2 rounded-full bg-(--color-deep) text-(--color-ivory) text-sm font-semibold hover:bg-(--color-forest) transition-colors"
              >
                אישור הכל
              </button>
              <button
                onClick={() => accept("essential")}
                className="px-4 py-2 rounded-full bg-(--color-cream) text-(--color-deep) text-sm font-medium hover:bg-(--color-moss)/15 transition-colors"
              >
                רק הכרחיות
              </button>
            </div>
          </div>

          <button
            onClick={() => accept("essential")}
            aria-label="סגור"
            className="flex-shrink-0 w-7 h-7 rounded-full grid place-items-center text-(--color-moss) hover:bg-(--color-cream) transition-colors"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
