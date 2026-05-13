"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable, getFunctions } from "firebase/functions";
import { auth, db, app } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, claims, loading: authLoading } = useAuth();

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [language, setLanguage] = useState<"he" | "en" | "ru">("he");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  // Already verified? skip registration
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const next = searchParams.get("next") ?? "/dashboard";
      router.replace(`/login?next=${encodeURIComponent(`/register?next=${next}`)}`);
      return;
    }
    if (claims?.verified || claims?.admin) {
      const next = searchParams.get("next") ?? "/dashboard";
      router.replace(next);
      return;
    }
    // Pre-fill from existing partial user doc
    (async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const u = snap.data();
        setName(u.name ?? "");
        setSurname(u.surname ?? "");
        setPhone(u.phone ?? "");
        setOfficeName(u.officeName ?? "");
        setLicenseNumber(u.licenseNumber ?? "");
        setLanguage(u.language ?? "he");
      }
      setBootstrapped(true);
    })();
  }, [authLoading, user, claims, router, searchParams]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.currentUser) return;
    setSubmitting(true);
    setError(null);
    try {
      // 1. Write profile doc
      const userRef = doc(db, "users", auth.currentUser.uid);
      await setDoc(
        userRef,
        {
          uid: auth.currentUser.uid,
          name: name.trim(),
          surname: surname.trim(),
          phone: phone.trim(),
          officeName: officeName.trim(),
          licenseNumber: licenseNumber.trim(),
          language,
          emailOptIn: false,
          digestOptIn: false,
          role: "realtor",
          verificationStatus: "pending",
          verified: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 2. Trigger license verification cloud function
      try {
        const functions = getFunctions(app, "europe-west1");
        const verify = httpsCallable<
          { licenseNumber: string },
          { verified: boolean }
        >(functions, "verifyLicense");
        await verify({ licenseNumber: licenseNumber.trim() });
        // Refresh id token to pick up new custom claims
        await auth.currentUser.getIdToken(true);
      } catch (verifyErr) {
        // Verification failure isn't blocking — admin can approve later
        console.warn("[register] license verify failed:", verifyErr);
      }

      // 3. Redirect
      const next = searchParams.get("next") ?? "/dashboard";
      router.push(next);
    } catch (e) {
      console.error("[register]", e);
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  if (authLoading || !bootstrapped) {
    return <main className="p-8 text-center text-(--color-moss)">טוען...</main>;
  }

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-3xl font-[var(--font-display)] text-(--color-deep) mb-2">
        השלמת הרשמה
      </h1>
      <p className="text-sm text-(--color-moss) mb-6">
        כדי להגיב על Open House ולפרסם אירועים שלך, מלא פרטים בסיסיים
      </p>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="שם פרטי">
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              autoComplete="given-name"
            />
          </Field>
          <Field label="שם משפחה">
            <input
              required
              type="text"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              className="input"
              autoComplete="family-name"
            />
          </Field>
        </div>

        <Field label="טלפון">
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+972 50 123 4567"
            className="input"
            autoComplete="tel"
          />
        </Field>

        <Field label="משרד / חברה">
          <input
            required
            type="text"
            value={officeName}
            onChange={(e) => setOfficeName(e.target.value)}
            className="input"
            autoComplete="organization"
          />
        </Field>

        <Field label="מספר רישיון תיווך">
          <input
            required
            type="text"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            placeholder="12345"
            className="input"
            inputMode="numeric"
            pattern="[0-9]*"
          />
        </Field>

        <Field label="שפה מועדפת">
          <div className="flex gap-2">
            {(["he", "en", "ru"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLanguage(l)}
                className={`flex-1 px-3 py-2 rounded-xl text-sm transition-colors ${
                  language === l
                    ? "bg-(--color-moss) text-(--color-ivory)"
                    : "bg-(--color-cream) text-(--color-deep)"
                }`}
              >
                {l === "he" ? "עברית" : l === "en" ? "English" : "Русский"}
              </button>
            ))}
          </div>
        </Field>

        {error && (
          <p role="alert" className="text-(--vis-red) bg-(--vis-red)/10 p-3 rounded-xl text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-(--color-deep) text-(--color-ivory) py-3.5 rounded-xl font-medium hover:bg-(--color-forest) disabled:opacity-50 transition-colors"
        >
          {submitting ? "מאמת..." : "סיום הרשמה"}
        </button>

        <p className="text-xs text-(--color-moss)/80 text-center">
          הרישיון יאומת מול data.gov.il באופן אוטומטי. אם לא נמצא — אדמין יבדוק ידנית.
        </p>
      </form>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border-radius: 0.75rem;
          background: var(--color-cream);
          color: var(--color-deep);
          border: 1px solid transparent;
          outline-color: var(--color-moss);
        }
        :global(.input:focus) {
          border-color: var(--color-moss);
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-(--color-moss) mb-1 block">{label}</span>
      {children}
    </label>
  );
}
