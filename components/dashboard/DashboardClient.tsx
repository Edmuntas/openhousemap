"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
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
  Award,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
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

  // Pending/rejected status surfaces a banner so users know the score; claims
  // alone don't distinguish "never registered" from "registered but pending".
  const [verificationStatus, setVerificationStatus] = useState<
    "pending" | "verified" | "rejected" | null
  >(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const d = snap.data() as
        | { verificationStatus?: string; rejectionReason?: string }
        | undefined;
      setVerificationStatus(
        (d?.verificationStatus as "pending" | "verified" | "rejected") ?? null
      );
      setRejectionReason(d?.rejectionReason ?? null);
    });
    return () => unsub();
  }, [user]);

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

  const displayName = user.displayName ?? user.email?.split("@")[0] ?? "";

  return (
    <main className="max-w-4xl mx-auto px-5 pt-6 pb-10 space-y-5">
      {/* Header — vertical stack on mobile, side-by-side on desktop.
          On narrow screens identity and actions get their own row so neither
          gets cramped. On wider screens they share a row but with explicit
          flex-1 + flex-shrink-0 so the name can truncate gracefully on the
          *trailing* end (dir=ltr on Latin name, dir-aware ellipsis). */}
      <header className="space-y-3 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
        <div className="flex items-baseline gap-2.5 min-w-0 flex-wrap">
          <span className="text-sm text-(--color-moss) font-medium shrink-0">שלום,</span>
          <Link
            href="/dashboard/profile"
            aria-label="עריכת פרופיל ולוגו"
            className="group inline-flex items-baseline gap-2 min-w-0 hover:opacity-80 transition-opacity"
          >
            <h1
              dir="auto"
              className="text-2xl md:text-3xl font-[var(--font-display)] font-bold text-(--color-deep) leading-tight tracking-tight truncate"
            >
              {displayName}
            </h1>
            {claims?.admin && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-(--color-gold)/25 text-(--color-deep) rounded-full text-[11px] font-semibold shrink-0">
                <Award className="w-3 h-3" aria-hidden /> admin
              </span>
            )}
            {!claims?.admin && claims?.verified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-(--color-sage)/40 text-(--color-deep) rounded-full text-[11px] font-semibold shrink-0">
                <CheckCircle2 className="w-3 h-3" aria-hidden /> מאומת
              </span>
            )}
          </Link>
        </div>
        {/* Mobile: symmetric distribution — logout (RTL start = right),
            Open House primary CTA centered, map (RTL end = left).
            DOM order matters: in RTL flex+justify-between the first child
            renders rightmost.
            Desktop (md+): grouped tightly on the leading edge. */}
        <nav
          className="flex items-center gap-2 justify-between md:justify-end shrink-0"
          aria-label="פעולות חשבון"
        >
          <button
            type="button"
            onClick={async () => {
              await signOut(auth);
              router.push("/");
            }}
            aria-label="התנתק"
            className="inline-flex items-center justify-center bg-(--color-cream) text-(--color-deep) w-10 h-10 rounded-full hover:bg-(--color-sage)/40 transition-colors active:scale-[0.97] shrink-0"
          >
            <LogOut className="w-4 h-4" aria-hidden />
          </button>
          {isRealtor && (
            <Link
              href="/create"
              className="inline-flex items-center gap-1.5 bg-(--color-moss) text-(--color-ivory) px-4 h-10 rounded-full text-sm font-semibold hover:bg-(--color-forest) transition-colors active:scale-[0.97] shadow-sm shadow-(--color-moss)/20 shrink-0"
            >
              <Plus className="w-4 h-4" aria-hidden />
              Open House
            </Link>
          )}
          <Link
            href="/"
            aria-label="חזרה למפה"
            className="inline-flex items-center justify-center bg-(--color-cream) text-(--color-deep) w-10 h-10 rounded-full hover:bg-(--color-sage)/40 transition-colors active:scale-[0.97] shrink-0"
          >
            <MapIcon className="w-4 h-4" aria-hidden />
          </Link>
        </nav>
      </header>

      {/* Verification banner — only when not yet verified.
          Without this, pending users see a normal-looking dashboard and only
          discover they can't publish when they hit the create form. */}
      {!claims?.admin &&
        !claims?.verified &&
        verificationStatus === "pending" && (
          <div
            role="status"
            className="flex items-start gap-3 bg-(--color-gold)/15 ring-1 ring-(--color-gold)/30 text-(--color-deep) p-3.5 rounded-2xl"
          >
            <Clock
              className="w-5 h-5 text-(--color-gold) shrink-0 mt-0.5"
              aria-hidden
            />
            <div className="text-sm leading-snug">
              <strong className="font-semibold">החשבון בבדיקת אדמין.</strong>{" "}
              לא ניתן לפרסם אירועים עד שמספר רישיון התיווך יאושר. בדרך כלל עד
              48 שעות.
            </div>
          </div>
        )}

      {!claims?.admin &&
        !claims?.verified &&
        verificationStatus === "rejected" && (
          <div
            role="alert"
            className="flex items-start gap-3 bg-(--vis-red)/10 ring-1 ring-(--vis-red)/30 text-(--color-deep) p-3.5 rounded-2xl"
          >
            <XCircle
              className="w-5 h-5 text-(--vis-red) shrink-0 mt-0.5"
              aria-hidden
            />
            <div className="text-sm leading-snug space-y-1">
              <p>
                <strong className="font-semibold">בקשת האימות נדחתה.</strong>
              </p>
              {rejectionReason && (
                <p className="text-(--color-moss)">סיבה: {rejectionReason}</p>
              )}
              <p className="text-(--color-moss)">
                לבירור פנה ל-
                <a
                  href="mailto:openhousemap@gmail.com?subject=ערעור על אימות"
                  className="underline"
                >
                  openhousemap@gmail.com
                </a>
                .
              </p>
            </div>
          </div>
        )}

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
        Icon={Calendar}
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
        className="block p-4 rounded-2xl bg-(--color-cream)/55 ring-1 ring-(--color-moss)/8 hover:bg-(--color-cream) hover:ring-(--color-moss)/25 transition-all space-y-1"
      >
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-[var(--font-display)] text-(--color-deep) font-bold text-lg leading-none tracking-tight">
            {formatPrice(event.price)}
          </div>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full tracking-wide shrink-0"
            style={{ background: `${s.color}22`, color: s.color }}
          >
            {s.label}
          </span>
        </div>
        <div className="text-sm text-(--color-deep) font-medium truncate">
          {event.address}
        </div>
        <div className="text-xs text-(--color-moss)">
          <span dir="ltr">{event.date}</span>
          {" · "}
          <span dir="ltr">{event.startTime}–{event.endTime}</span>
          {event.rooms != null && ` · ${event.rooms} חד׳`}
        </div>
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
        Icon={Star}
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
            className="block p-4 rounded-2xl bg-(--color-cream)/55 ring-1 ring-(--color-moss)/8 hover:bg-(--color-cream) hover:ring-(--color-moss)/25 transition-all space-y-1"
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="font-[var(--font-display)] text-(--color-deep) font-bold text-lg leading-none tracking-tight">
                {formatPrice(event.price)}
              </div>
              <Star
                className="w-4 h-4 text-(--color-gold) fill-(--color-gold) shrink-0"
                aria-hidden
              />
            </div>
            <div className="text-sm text-(--color-deep) font-medium truncate">
              {event.address}
            </div>
            <div className="text-xs text-(--color-moss)">
              <span dir="ltr">{event.date}</span>
              {" · "}
              <span dir="ltr">{event.startTime}–{event.endTime}</span>
              {event.rooms != null && ` · ${event.rooms} חד׳`}
            </div>
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
        Icon={HomeIcon}
        text="טרם פרסמת אירועים"
        cta={{ href: "/create", label: "+ Open House" }}
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
  Icon,
  text,
  cta,
}: {
  Icon: typeof MapIcon;
  text: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="text-center py-14 space-y-4 bg-gradient-to-b from-transparent to-(--color-cream)/50 rounded-3xl">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-(--color-cream) text-(--color-moss)">
        <Icon className="w-7 h-7" aria-hidden />
      </div>
      <p className="text-(--color-moss) font-medium px-6">{text}</p>
      <Link
        href={cta.href}
        className="inline-block bg-(--color-deep) text-(--color-ivory) px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-(--color-forest) transition-colors"
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
      className={`relative text-right rounded-2xl p-3.5 transition-all active:scale-[0.97] ${
        active
          ? "bg-(--color-cream) ring-2 ring-(--color-moss) text-(--color-deep)"
          : "bg-(--color-cream)/60 ring-1 ring-(--color-moss)/10 text-(--color-deep) hover:ring-(--color-moss)/30"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-3xl font-[var(--font-display)] font-bold leading-none tracking-tight">
          {value}
        </span>
        <Icon
          aria-hidden
          className={`w-4.5 h-4.5 transition-colors ${
            active ? "text-(--color-moss)" : "text-(--color-moss)/60"
          }`}
        />
      </div>
      <div
        className={`text-[11px] mt-2 font-semibold tracking-wide truncate ${
          active ? "text-(--color-moss)" : "text-(--color-moss)/80"
        }`}
      >
        {label}
      </div>
    </button>
  );
}
