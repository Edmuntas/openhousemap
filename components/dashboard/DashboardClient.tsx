"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { useAuth } from "@/hooks/useAuth";
import { useMyEvents } from "@/hooks/useMyEvents";
import { useEvents, type EventWithId } from "@/hooks/useEvents";
import { useMyRsvps } from "@/hooks/useRsvp";
import { useMyFavourites } from "@/hooks/useFavourite";
import {
  Map as MapIcon,
  Plus,
  LogOut,
  Calendar,
  Star,
  Home as HomeIcon,
  ArrowLeft,
  Award,
  CheckCircle2,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { formatPrice, todayIso } from "@/lib/utils";
import DashboardEventCard from "./DashboardEventCard";

type Tab = "attending" | "favourites" | "owned";

export default function DashboardClient() {
  const router = useRouter();
  const { user, claims, loading: authLoading } = useAuth();
  const isRealtor = !!(claims?.verified || claims?.admin);
  const [tab, setTab] = useState<Tab>("attending");
  const today = todayIso();

  const { events: ownedActive, loading: loadingOwned } = useMyEvents(
    user?.uid ?? null,
    "active"
  );
  const { events: ownedArchived } = useMyEvents(
    user?.uid ?? null,
    "archived"
  );
  const { events: allVisible, loading: loadingAll } = useEvents();
  const { items: myRsvps, loading: loadingRsvps } = useMyRsvps();
  const { eventIds: favIds, loading: loadingFavs } = useMyFavourites();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/dashboard");
    }
  }, [authLoading, user, router]);

  // If user is not a realtor and lands on owned tab, bounce to attending
  useEffect(() => {
    if (!isRealtor && tab === "owned") setTab("attending");
  }, [isRealtor, tab]);

  const eventById = useMemo(() => {
    const m = new Map<string, EventWithId>();
    for (const e of allVisible) m.set(e.id, e);
    return m;
  }, [allVisible]);

  // Events I RSVPed to (any status) — sorted by date ascending
  const attending = useMemo(() => {
    const out: { event: EventWithId; status: string }[] = [];
    for (const r of myRsvps) {
      const ev = eventById.get(r.eventId);
      if (ev) out.push({ event: ev, status: r.status });
    }
    return out.sort((a, b) =>
      a.event.date.localeCompare(b.event.date)
    );
  }, [myRsvps, eventById]);

  const attendingUpcoming = attending.filter((x) => x.event.date >= today);
  const attendingPast = attending.filter((x) => x.event.date < today);

  const favourites = useMemo(() => {
    const out: EventWithId[] = [];
    for (const id of favIds) {
      const ev = eventById.get(id);
      if (ev) out.push(ev);
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }, [favIds, eventById]);

  if (authLoading || !user) {
    return <main className="p-8 text-center text-(--color-moss)">טוען...</main>;
  }

  const todaysOwned = ownedActive.filter((e) => e.date === today);
  const upcomingOwned = ownedActive.filter((e) => e.date > today);

  const TABS: { id: Tab; label: string; Icon: typeof MapIcon }[] = [
    { id: "attending", label: "אני אגיע", Icon: Calendar },
    { id: "favourites", label: "מועדפים", Icon: Star },
    ...(isRealtor
      ? [{ id: "owned" as const, label: "האירועים שלי", Icon: HomeIcon }]
      : []),
  ];

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header className="flex justify-between items-end gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="text-xs text-(--color-moss) tracking-wide uppercase">
            שלום
          </p>
          <h1 className="text-4xl font-[var(--font-display)] font-semibold text-(--color-deep) leading-none">
            {user.displayName ?? user.email?.split("@")[0]}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            {claims?.admin && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-(--color-gold)/30 rounded-full text-xs font-medium">
                <Award className="w-3 h-3" /> admin
              </span>
            )}
            {!claims?.admin && claims?.verified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-(--color-sage)/40 rounded-full text-xs font-medium">
                <CheckCircle2 className="w-3 h-3" /> verified realtor
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 bg-(--color-cream) text-(--color-deep) px-4 py-2 rounded-xl text-sm font-medium hover:bg-(--color-sage)/40 transition-colors active:scale-[0.97]"
          >
            <MapIcon className="w-4 h-4" />
            חזרה למפה
          </Link>
          {isRealtor && (
            <Link
              href="/create"
              className="inline-flex items-center gap-1.5 bg-(--color-moss) text-(--color-ivory) px-4 py-2 rounded-xl text-sm font-medium hover:bg-(--color-forest) transition-colors active:scale-[0.97]"
            >
              <Plus className="w-4 h-4" />
              Open House חדש
            </Link>
          )}
          <button
            type="button"
            onClick={async () => {
              await signOut(auth);
              router.push("/");
            }}
            className="inline-flex items-center gap-1.5 bg-(--color-cream) text-(--color-deep) px-4 py-2 rounded-xl text-sm hover:bg-(--color-sage)/40 transition-colors active:scale-[0.97]"
          >
            <LogOut className="w-4 h-4" />
            התנתק
          </button>
        </div>
      </header>

      {/* Stat cards double as tabs — tap a card to switch the panel below.
          Active card gets the moss outline; counter doubles as both summary
          and affordance. */}
      <section
        className={`grid gap-3 ${TABS.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}
      >
        {TABS.map((t) => (
          <StatTab
            key={t.id}
            label={t.label}
            Icon={t.Icon}
            value={String(
              t.id === "attending"
                ? attendingUpcoming.length
                : t.id === "favourites"
                ? favIds.length
                : ownedActive.length + ownedArchived.length
            )}
            active={tab === t.id}
            onClick={() => setTab(t.id)}
          />
        ))}
      </section>

      <section>
        {tab === "attending" && (
          <AttendingList
            upcoming={attendingUpcoming}
            past={attendingPast}
            loading={loadingRsvps || loadingAll}
          />
        )}

        {tab === "favourites" && (
          <FavouriteList
            events={favourites}
            loading={loadingFavs || loadingAll}
          />
        )}

        {tab === "owned" && isRealtor && (
          <OwnedList
            todays={todaysOwned}
            upcoming={upcomingOwned}
            archived={ownedArchived}
            loading={loadingOwned}
          />
        )}
      </section>
    </main>
  );
}

function AttendingList({
  upcoming,
  past,
  loading,
}: {
  upcoming: { event: EventWithId; status: string }[];
  past: { event: EventWithId; status: string }[];
  loading: boolean;
}) {
  if (loading) return <p className="text-center text-(--color-moss) py-8">טוען...</p>;
  if (upcoming.length === 0 && past.length === 0) {
    return (
      <EmptyState
        emoji="📅"
        text="עדיין לא סימנת השתתפות באף Open House"
        cta={{ href: "/", label: "גלוש במפה" }}
      />
    );
  }
  return (
    <div className="space-y-4">
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm text-(--color-moss) font-medium px-1">קרובים</h2>
          <ul className="space-y-2">
            {upcoming.map(({ event, status }) => (
              <AttendingCard key={event.id} event={event} status={status} />
            ))}
          </ul>
        </div>
      )}
      {past.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm text-(--color-moss) font-medium px-1">היסטוריה</h2>
          <ul className="space-y-2 opacity-70">
            {past.map(({ event, status }) => (
              <AttendingCard key={event.id} event={event} status={status} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AttendingCard({ event, status }: { event: EventWithId; status: string }) {
  const statusInfo: Record<string, { label: string; color: string }> = {
    attending: { label: "אגיע", color: "var(--vis-green)" },
    maybe: { label: "אולי", color: "var(--color-gold)" },
    declined: { label: "לא", color: "var(--vis-red)" },
  };
  const s = statusInfo[status] ?? statusInfo.attending;
  return (
    <li>
      <Link
        href={`/e/${event.id}`}
        className="flex items-center gap-3 p-4 rounded-xl bg-(--color-cream)/60 hover:bg-(--color-cream) transition-colors"
      >
        <div className="flex-1">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <div className="font-[var(--font-display)] text-(--color-deep) font-semibold">
              {formatPrice(event.price)}
            </div>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: `${s.color}22`, color: s.color }}
            >
              {s.label}
            </span>
          </div>
          <div className="text-sm text-(--color-deep)">{event.address}</div>
          <div className="text-xs text-(--color-moss)">
            <span dir="ltr">{event.date}</span> ·{" "}
            <span dir="ltr">{event.startTime}–{event.endTime}</span>
            {event.rooms != null && ` · ${event.rooms} חד׳`}
          </div>
        </div>
        <span className="text-(--color-moss)">←</span>
      </Link>
    </li>
  );
}

function FavouriteList({
  events,
  loading,
}: {
  events: EventWithId[];
  loading: boolean;
}) {
  if (loading) return <p className="text-center text-(--color-moss) py-8">טוען...</p>;
  if (events.length === 0) {
    return (
      <EmptyState
        emoji="☆"
        text="עדיין לא הוספת בתים פתוחים למועדפים"
        cta={{ href: "/", label: "גלוש במפה" }}
      />
    );
  }
  return (
    <ul className="space-y-2">
      {events.map((event) => (
        <li key={event.id}>
          <Link
            href={`/e/${event.id}`}
            className="flex items-center gap-3 p-4 rounded-xl bg-(--color-cream)/60 hover:bg-(--color-cream) transition-colors"
          >
            <div className="flex-1">
              <div className="font-[var(--font-display)] text-(--color-deep) font-semibold">
                {formatPrice(event.price)}
              </div>
              <div className="text-sm text-(--color-deep)">{event.address}</div>
              <div className="text-xs text-(--color-moss)">
                {event.date} · {event.startTime}–{event.endTime}
              </div>
            </div>
            <span className="text-(--color-gold)">★</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function OwnedList({
  todays,
  upcoming,
  archived,
  loading,
}: {
  todays: EventWithId[];
  upcoming: EventWithId[];
  archived: EventWithId[];
  loading: boolean;
}) {
  if (loading) return <p className="text-center text-(--color-moss) py-8">טוען...</p>;
  if (todays.length === 0 && upcoming.length === 0 && archived.length === 0) {
    return (
      <EmptyState
        emoji="🏠"
        text="טרם פרסמת אירועים"
        cta={{ href: "/create", label: "צור Open House ראשון" }}
      />
    );
  }
  return (
    <div className="space-y-4">
      {todays.length > 0 && (
        <Section label="היום">
          {todays.map((ev) => (
            <DashboardEventCard key={ev.id} event={ev} />
          ))}
        </Section>
      )}
      {upcoming.length > 0 && (
        <Section label="קרובים">
          {upcoming.map((ev) => (
            <DashboardEventCard key={ev.id} event={ev} />
          ))}
        </Section>
      )}
      {archived.length > 0 && (
        <Section label="ארכיון">
          {archived.map((ev) => (
            <DashboardEventCard key={ev.id} event={ev} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm text-(--color-moss) font-medium px-1">{label}</h2>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function EmptyState({
  emoji,
  text,
  cta,
}: {
  emoji: string;
  text: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="text-center py-16 space-y-4 bg-gradient-to-b from-transparent to-(--color-cream)/40 rounded-3xl">
      <div className="text-5xl">{emoji}</div>
      <p className="text-(--color-moss)">{text}</p>
      <Link
        href={cta.href}
        className="inline-block bg-(--color-moss) text-(--color-ivory) px-5 py-2.5 rounded-xl"
      >
        {cta.label}
      </Link>
    </div>
  );
}

function StatTab({
  label,
  Icon,
  value,
  active,
  onClick,
}: {
  label: string;
  Icon: typeof MapIcon;
  value: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{ touchAction: "manipulation" }}
      className={`text-right rounded-2xl p-4 transition-all active:scale-[0.97] ${
        active
          ? "bg-(--color-moss) text-(--color-ivory) ring-2 ring-(--color-moss) shadow-md"
          : "bg-(--color-cream)/70 text-(--color-deep) ring-1 ring-(--color-moss)/10 hover:ring-(--color-moss)/30"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`text-3xl font-[var(--font-display)] font-semibold leading-none ${
            active ? "text-(--color-ivory)" : "text-(--color-deep)"
          }`}
        >
          {value}
        </span>
        <Icon
          aria-hidden
          className={`w-5 h-5 ${active ? "text-(--color-ivory)/80" : "text-(--color-moss)"}`}
        />
      </div>
      <div
        className={`text-xs mt-2 tracking-wide truncate ${
          active ? "text-(--color-ivory)/85" : "text-(--color-moss)"
        }`}
      >
        {label}
      </div>
    </button>
  );
}
