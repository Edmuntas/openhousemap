"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { useAuth } from "@/hooks/useAuth";
import { useMyEvents } from "@/hooks/useMyEvents";
import { auth } from "@/lib/firebase";
import { formatPrice, todayIso } from "@/lib/utils";
import type { EventWithId } from "@/hooks/useEvents";

type Tab = "today" | "upcoming" | "archive";

export default function DashboardClient() {
  const router = useRouter();
  const { user, claims, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("upcoming");
  const { events: active, loading: loadingActive } = useMyEvents(
    user?.uid ?? null,
    "active"
  );
  const { events: archived, loading: loadingArchived } = useMyEvents(
    user?.uid ?? null,
    "archived"
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/dashboard");
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return <main className="p-8 text-center text-(--color-moss)">טוען...</main>;
  }

  const today = todayIso();
  const todays = active.filter((e) => e.date === today);
  const upcoming = active.filter((e) => e.date > today);

  let list: EventWithId[];
  if (tab === "today") list = todays;
  else if (tab === "upcoming") list = upcoming;
  else list = archived;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-[var(--font-display)] text-(--color-deep)">
            לוח הבקרה
          </h1>
          <p className="text-sm text-(--color-moss)">
            {user.displayName ?? user.email}
            {claims?.admin && <span className="ml-2 px-2 py-0.5 bg-(--color-gold)/30 rounded text-xs">admin</span>}
            {!claims?.admin && claims?.verified && <span className="ml-2 px-2 py-0.5 bg-(--color-sage)/40 rounded text-xs">verified</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/create"
            className="bg-(--color-moss) text-(--color-ivory) px-4 py-2 rounded-xl font-medium hover:bg-(--color-forest) transition-colors"
          >
            + Open House חדש
          </Link>
          <button
            type="button"
            onClick={async () => {
              await signOut(auth);
              router.push("/");
            }}
            className="bg-(--color-cream) text-(--color-deep) px-4 py-2 rounded-xl text-sm hover:bg-(--color-sage)/40"
          >
            התנתק
          </button>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3 text-center">
        <Stat label="היום" value={String(todays.length)} />
        <Stat label="קרובים" value={String(upcoming.length)} />
        <Stat label="ארכיון" value={String(archived.length)} />
      </section>

      <nav className="flex gap-2 border-b border-(--color-cream)">
        {(
          [
            { id: "today", label: "היום" },
            { id: "upcoming", label: "קרובים" },
            { id: "archive", label: "ארכיון" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
              tab === t.id
                ? "border-(--color-moss) text-(--color-deep) font-medium"
                : "border-transparent text-(--color-moss) hover:text-(--color-deep)"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <section>
        {(tab !== "archive" && loadingActive) || (tab === "archive" && loadingArchived) ? (
          <p className="text-center text-(--color-moss) py-8">טוען...</p>
        ) : list.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="text-5xl">🏠</div>
            <p className="text-(--color-moss)">אין אירועים בלשונית הזו</p>
            {tab !== "archive" && (
              <Link
                href="/create"
                className="inline-block bg-(--color-moss) text-(--color-ivory) px-5 py-2.5 rounded-xl"
              >
                צור Open House ראשון
              </Link>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map((ev) => (
              <li key={ev.id}>
                <Link
                  href={`/e/${ev.id}`}
                  className="flex items-center gap-3 p-4 rounded-xl bg-(--color-cream)/60 hover:bg-(--color-cream) transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-[var(--font-display)] text-(--color-deep) font-semibold">
                      {formatPrice(ev.price)}
                    </div>
                    <div className="text-sm text-(--color-deep)">
                      {ev.address}
                    </div>
                    <div className="text-xs text-(--color-moss)">
                      {ev.date} · {ev.startTime}–{ev.endTime} · {ev.rooms} חד׳
                    </div>
                  </div>
                  <span className="text-(--color-moss)">←</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-(--color-cream) rounded-xl p-4">
      <div className="text-3xl font-[var(--font-display)] text-(--color-deep)">
        {value}
      </div>
      <div className="text-xs text-(--color-moss)">{label}</div>
    </div>
  );
}
