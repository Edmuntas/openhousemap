"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Home } from "lucide-react";

export default function EventErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface in browser console for debugging — Vercel logs the server side
    console.error("[event detail] render error:", error);
  }, [error]);

  return (
    <main className="max-w-xl mx-auto px-5 pt-10 pb-10 space-y-6 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-(--color-gold)/15 text-(--color-gold)">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <div>
        <h1 className="text-2xl font-[var(--font-display)] font-bold text-(--color-deep) mb-2">
          לא הצלחנו לטעון את העמוד
        </h1>
        <p className="text-sm text-(--color-moss)">
          קרתה תקלה בעת הרינדור של דף האירוע. הצוות יכול לזהות את הבעיה לפי
          המזהה למטה. ניתן לחזור למפה או לנסות שוב.
        </p>
        {error.digest && (
          <p className="mt-3 text-xs text-(--color-moss)/70">
            ERROR{" "}
            <span dir="ltr" className="font-mono">
              {error.digest}
            </span>
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 bg-(--color-deep) text-(--color-ivory) px-5 h-11 rounded-full text-sm font-semibold hover:bg-(--color-forest) transition-colors"
        >
          נסה שוב
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 bg-(--color-cream) text-(--color-deep) px-5 h-11 rounded-full text-sm font-medium hover:bg-(--color-sage)/40 transition-colors"
        >
          לוח האירועים שלי
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-(--color-cream) text-(--color-deep) px-5 h-11 rounded-full text-sm font-medium hover:bg-(--color-sage)/40 transition-colors"
        >
          <Home className="w-4 h-4" />
          חזרה למפה
        </Link>
      </div>

      <Link
        href="/"
        className="inline-flex items-center gap-1 text-(--color-moss) text-sm pt-4"
      >
        <ArrowRight className="w-4 h-4" />
        חזרה
      </Link>
    </main>
  );
}
