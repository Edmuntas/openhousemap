"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  type Timestamp,
} from "firebase/firestore";
import { httpsCallable, getFunctions } from "firebase/functions";
import { Check, X, Clock, ExternalLink, Loader2 } from "lucide-react";
import { db, app } from "@/lib/firebase";

type FilterTab = "pending" | "verified" | "rejected" | "all";

interface PendingUser {
  uid: string;
  name?: string;
  surname?: string;
  phone?: string;
  officeName?: string;
  licenseNumber?: string;
  verificationStatus?: "pending" | "verified" | "rejected";
  verified?: boolean;
  createdAt?: Timestamp;
  rejectionReason?: string;
}

const TABS: { id: FilterTab; label: string }[] = [
  { id: "pending", label: "ממתינים לאישור" },
  { id: "verified", label: "מאומתים" },
  { id: "rejected", label: "נדחו" },
  { id: "all", label: "הכול" },
];

export default function AdminRealtorsClient() {
  const [tab, setTab] = useState<FilterTab>("pending");
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const usersRef = collection(db, "users");
    // The "all" tab can't filter; pending/verified/rejected use a where.
    const q =
      tab === "all"
        ? query(usersRef, orderBy("createdAt", "desc"))
        : query(
            usersRef,
            where("verificationStatus", "==", tab),
            orderBy("createdAt", "desc")
          );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: PendingUser[] = snap.docs.map((d) => ({
          uid: d.id,
          ...(d.data() as Omit<PendingUser, "uid">),
        }));
        setUsers(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[admin/realtors]", err);
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [tab]);

  async function act(uid: string, action: "approve" | "reject") {
    if (
      action === "reject" &&
      !confirm("לדחות את המתווך? פעולה זו ניתנת להפיכה ידנית בלבד.")
    ) {
      return;
    }
    setBusyUid(uid);
    setError(null);
    try {
      const functions = getFunctions(app, "europe-west1");
      const fn = httpsCallable<
        { uid: string; action: "approve" | "reject"; reason?: string },
        { ok: boolean; status: string }
      >(functions, "adminVerifyRealtor");
      await fn({ uid, action });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[admin/realtors]", msg);
      setError(msg);
    } finally {
      setBusyUid(null);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--color-deep)">ניהול מתווכים</h1>
          <p className="text-sm text-(--color-moss) mt-1">
            אישור או דחייה של בקשות הרשמה. אישור מעניק יכולת פרסום אירועים.
          </p>
        </div>
      </header>

      <div className="flex gap-1.5 flex-wrap" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-1.5 text-sm rounded-full transition-colors ${
              tab === t.id
                ? "bg-(--color-deep) text-(--color-ivory)"
                : "bg-(--color-cream) text-(--color-deep) hover:bg-(--color-sage)/30"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="text-sm text-(--vis-red) bg-(--vis-red)/10 px-3 py-2 rounded-xl"
        >
          {error}
        </p>
      )}

      {loading ? (
        <div className="text-center py-12 text-(--color-moss)">
          <Loader2 className="w-5 h-5 animate-spin inline" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-(--color-moss) bg-(--color-cream)/40 rounded-2xl">
          {tab === "pending" ? "אין בקשות ממתינות 🎉" : "ריק"}
        </div>
      ) : (
        <ul className="space-y-2">
          {users.map((u) => (
            <li
              key={u.uid}
              className="bg-white ring-1 ring-(--color-cream) rounded-2xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center"
            >
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="font-semibold text-(--color-deep) truncate">
                  {u.name} {u.surname}
                  <StatusChip status={u.verificationStatus} />
                </div>
                <div className="text-xs text-(--color-moss) truncate">
                  {u.officeName || "—"}
                </div>
                <div className="text-xs text-(--color-moss) flex flex-wrap gap-x-3 gap-y-0.5 items-center">
                  <span dir="ltr">{u.phone || "—"}</span>
                  <span>·</span>
                  <span>
                    רישיון:{" "}
                    <span dir="ltr">{u.licenseNumber || "—"}</span>
                  </span>
                  {u.licenseNumber && (
                    <a
                      href={`https://data.gov.il/dataset/realtors/resource/a0f56034-88db-4132-8803-854bcdb01ca1?q=${encodeURIComponent(
                        u.licenseNumber
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-(--color-moss) hover:text-(--color-deep) underline decoration-dotted underline-offset-2"
                    >
                      בדוק <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {u.rejectionReason && (
                  <div className="text-xs text-(--vis-red) mt-1">
                    סיבת דחייה: {u.rejectionReason}
                  </div>
                )}
              </div>

              {u.verificationStatus !== "verified" && (
                <button
                  type="button"
                  disabled={busyUid === u.uid}
                  onClick={() => act(u.uid, "approve")}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-(--vis-green) text-white hover:opacity-90 disabled:opacity-50"
                >
                  {busyUid === u.uid ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  אשר
                </button>
              )}
              {u.verificationStatus !== "rejected" && (
                <button
                  type="button"
                  disabled={busyUid === u.uid}
                  onClick={() => act(u.uid, "reject")}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-white border border-(--vis-red)/40 text-(--vis-red) hover:bg-(--vis-red)/10 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  דחה
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function StatusChip({
  status,
}: {
  status: PendingUser["verificationStatus"];
}) {
  if (!status || status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 ms-2 px-1.5 py-0.5 rounded-full bg-(--color-gold)/20 text-(--color-gold) text-[10px] font-medium align-middle">
        <Clock className="w-3 h-3" /> ממתין
      </span>
    );
  }
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 ms-2 px-1.5 py-0.5 rounded-full bg-(--vis-green)/20 text-(--vis-green) text-[10px] font-medium align-middle">
        <Check className="w-3 h-3" /> מאומת
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 ms-2 px-1.5 py-0.5 rounded-full bg-(--vis-red)/20 text-(--vis-red) text-[10px] font-medium align-middle">
      <X className="w-3 h-3" /> נדחה
    </span>
  );
}
