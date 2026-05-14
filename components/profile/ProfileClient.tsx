"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { ArrowRight, Upload, Trash2, Briefcase, Palette } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { db, storage } from "@/lib/firebase";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];
const MAX_BYTES = 2 * 1024 * 1024;

const BRAND_PRESETS = [
  { name: "Moss", hex: "#4A6E30" },
  { name: "Forest", hex: "#2E4E1A" },
  { name: "Gold", hex: "#EAA830" },
  { name: "Sage", hex: "#8AB060" },
  { name: "Sea", hex: "#3D6E78" },
  { name: "Plum", hex: "#7A3D6E" },
  { name: "Brick", hex: "#A04848" },
  { name: "Deep", hex: "#141C0A" },
];

interface ProfileState {
  officeName: string;
  logoUrl: string | null;
  officeBrandColor: string | null;
}

export default function ProfileClient() {
  const router = useRouter();
  const { user, claims, loading: authLoading } = useAuth();
  const isRealtor = !!(claims?.verified || claims?.admin);

  const [profile, setProfile] = useState<ProfileState>({
    officeName: "",
    logoUrl: null,
    officeBrandColor: null,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing profile
  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) return;
      const data = snap.data();
      setProfile({
        officeName: data.officeName ?? "",
        logoUrl: data.logoUrl ?? null,
        officeBrandColor: data.officeBrandColor ?? null,
      });
    })();
  }, [user]);

  // Auth gate
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/dashboard/profile");
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <main className="p-8 text-center text-(--color-moss)">טוען...</main>
    );
  }

  async function uploadLogo(file: File) {
    if (!user) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("פורמט לא נתמך. השתמש ב-PNG, JPEG, WebP או SVG.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("הקובץ גדול מ-2MB. דחוס את הלוגו לפני העלאה.");
      return;
    }
    setBusy(true);
    setError(null);

    try {
      const ext = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1];
      const path = `users/${user.uid}/logo/logo.${ext}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file, { contentType: file.type });
      const url = await getDownloadURL(ref);

      await setDoc(
        doc(db, "users", user.uid),
        { logoUrl: url, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setProfile((p) => ({ ...p, logoUrl: url }));
      setSavedAt(new Date());
    } catch (e) {
      console.error("[profile] upload failed", e);
      setError("שגיאה בהעלאה. נסה שוב.");
    } finally {
      setBusy(false);
    }
  }

  async function removeLogo() {
    if (!user || !profile.logoUrl) return;
    setBusy(true);
    setError(null);
    try {
      // Try delete each likely extension; ignore not-found errors.
      const exts = ["png", "jpeg", "jpg", "webp", "svg"];
      for (const ext of exts) {
        try {
          const ref = storageRef(storage, `users/${user.uid}/logo/logo.${ext}`);
          await deleteObject(ref);
        } catch {
          /* not present, skip */
        }
      }
      await setDoc(
        doc(db, "users", user.uid),
        { logoUrl: null, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setProfile((p) => ({ ...p, logoUrl: null }));
      setSavedAt(new Date());
    } catch (e) {
      console.error("[profile] remove failed", e);
      setError("שגיאה במחיקה. נסה שוב.");
    } finally {
      setBusy(false);
    }
  }

  async function pickColor(hex: string | null) {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        { officeBrandColor: hex, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setProfile((p) => ({ ...p, officeBrandColor: hex }));
      setSavedAt(new Date());
    } catch (e) {
      console.error("[profile] color save failed", e);
      setError("שגיאה בשמירה.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-5 pt-6 pb-10 space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-(--color-moss) hover:text-(--color-deep) font-medium"
      >
        <ArrowRight className="w-4 h-4" />
        חזרה ללוח
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-[var(--font-display)] font-bold tracking-tight text-(--color-deep)">
          פרופיל ומשרד
        </h1>
        <p className="text-sm text-(--color-moss)">
          הלוגו והצבע יופיעו על כרטיסי אירועים <strong>חדשים</strong>. אירועים
          שכבר פורסמו ישמרו על הלוגו הקיים עד שיפורסם מחדש.
        </p>
      </header>

      {error && (
        <div className="bg-(--vis-red)/10 text-(--vis-red) px-4 py-3 rounded-2xl text-sm">
          {error}
        </div>
      )}

      {/* Logo section */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-(--color-deep) flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-(--color-moss)" aria-hidden />
          לוגו המשרד
        </h2>

        <div className="bg-(--color-cream)/55 ring-1 ring-(--color-moss)/10 rounded-2xl p-5 flex items-center gap-5">
          <div className="shrink-0 w-24 h-24 rounded-2xl bg-(--color-ivory) ring-1 ring-(--color-moss)/15 grid place-items-center overflow-hidden">
            {profile.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logoUrl}
                alt="לוגו"
                className="w-full h-full object-contain"
              />
            ) : (
              <Briefcase
                className="w-8 h-8 text-(--color-moss)/40"
                aria-hidden
              />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="text-sm text-(--color-deep) font-medium">
              {profile.officeName || "לא הוגדר שם משרד"}
            </div>
            <p className="text-xs text-(--color-moss) leading-relaxed">
              PNG / JPEG / WebP / SVG · עד 2MB · רקע שקוף עדיף
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="inline-flex items-center gap-1.5 bg-(--color-deep) text-(--color-ivory) px-3.5 h-9 rounded-full text-sm font-semibold hover:bg-(--color-forest) disabled:opacity-50 transition-colors active:scale-[0.97]"
              >
                <Upload className="w-4 h-4" />
                {profile.logoUrl ? "החלף לוגו" : "העלה לוגו"}
              </button>
              {profile.logoUrl && (
                <button
                  type="button"
                  onClick={removeLogo}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 bg-(--color-cream) text-(--color-deep) px-3.5 h-9 rounded-full text-sm font-medium hover:bg-(--vis-red)/10 hover:text-(--vis-red) disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  הסר
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadLogo(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </section>

      {/* Brand color section */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-(--color-deep) flex items-center gap-2">
          <Palette className="w-4 h-4 text-(--color-moss)" aria-hidden />
          צבע המותג
        </h2>

        <div className="bg-(--color-cream)/55 ring-1 ring-(--color-moss)/10 rounded-2xl p-4 space-y-3">
          <p className="text-xs text-(--color-moss) leading-relaxed">
            הצבע יופיע כקצה דקור על כרטיסי השיתוף לרשתות חברתיות. לא משפיע על
            המראה של האתר.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => pickColor(null)}
              aria-pressed={profile.officeBrandColor === null}
              className={`px-3 h-9 rounded-full text-xs font-semibold transition-all ${
                profile.officeBrandColor === null
                  ? "bg-(--color-deep) text-(--color-ivory) ring-2 ring-(--color-deep)"
                  : "bg-(--color-ivory) text-(--color-deep) ring-1 ring-(--color-moss)/20 hover:ring-(--color-moss)/40"
              }`}
            >
              ברירת מחדל
            </button>
            {BRAND_PRESETS.map((c) => {
              const active = profile.officeBrandColor === c.hex;
              return (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => pickColor(c.hex)}
                  aria-label={c.name}
                  aria-pressed={active}
                  className={`relative w-9 h-9 rounded-full ring-2 transition-all ${
                    active
                      ? "ring-(--color-deep) scale-110"
                      : "ring-(--color-moss)/15 hover:ring-(--color-moss)/45"
                  }`}
                  style={{ background: c.hex }}
                />
              );
            })}
          </div>
        </div>
      </section>

      {savedAt && (
        <p className="text-xs text-(--color-moss)/80 text-center">
          נשמר {savedAt.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}

      {!isRealtor && (
        <div className="bg-(--color-gold)/10 ring-1 ring-(--color-gold)/30 rounded-2xl px-4 py-3 text-sm text-(--color-deep)">
          הלוגו יופיע על האירועים שלך לאחר שתאומת כמתווך.
        </div>
      )}
    </main>
  );
}
