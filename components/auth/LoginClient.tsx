"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // Force-refresh token to pick up custom claims set server-side
      await result.user.getIdToken(true);
      const next = searchParams.get("next") ?? "/dashboard";
      router.push(next);
    } catch (e) {
      console.error(e);
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-6 text-center">
        <h1 className="text-4xl font-[var(--font-display)] text-(--color-deep)">
          התחבר
        </h1>
        <p className="text-(--color-moss)">
          התחבר לחשבון OpenHouse Map שלך כדי לפרסם בתים פתוחים, לראות RSVPs ולנהל את הלוח שלך
        </p>
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full bg-(--color-deep) text-(--color-ivory) py-3.5 px-4 rounded-xl font-medium hover:bg-(--color-forest) transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#fff"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#fff"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
          </svg>
          {loading ? "מתחבר..." : "המשך עם Google"}
        </button>
        {error && (
          <p className="text-(--vis-red) text-sm" role="alert">
            {error}
          </p>
        )}
        <p className="text-xs text-(--color-moss)/70">
          בהתחברות אתה מסכים ל
          <a href="/terms" className="underline">תנאי השימוש</a> ו
          <a href="/privacy" className="underline">מדיניות הפרטיות</a>
        </p>
      </div>
    </main>
  );
}
