"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable, getFunctions } from "firebase/functions";
import ngeohash from "ngeohash";
import { db, auth, storage, app } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

type Visibility = "public" | "mixed" | "colleagues";
type PropertyType = "apartment" | "house" | "penthouse" | "land" | "commercial";

interface FormState {
  address: string;
  city: string;
  lat: string;
  lng: string;
  propertyType: PropertyType;
  price: string;
  rooms: string;
  bathrooms: string;
  size: string;
  floor: string;
  totalFloors: string;
  parking: boolean;
  mamad: boolean;
  mirpeset: boolean;
  date: string;
  startTime: string;
  endTime: string;
  visibility: Visibility;
  realtorInputText: string;
}

interface UploadedPhoto {
  full: string;
  medium: string;
  thumb: string;
}

const initial: FormState = {
  address: "",
  city: "",
  lat: "",
  lng: "",
  propertyType: "apartment",
  price: "",
  rooms: "",
  bathrooms: "1",
  size: "",
  floor: "",
  totalFloors: "",
  parking: false,
  mamad: false,
  mirpeset: false,
  date: "",
  startTime: "17:00",
  endTime: "19:00",
  visibility: "public",
  realtorInputText: "",
};

export default function CreateEventClient() {
  const router = useRouter();
  const { user, claims, loading: authLoading } = useAuth();
  const [form, setForm] = useState<FormState>(initial);
  const [eventId] = useState(() => doc(collection(db, "events")).id);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descHe, setDescHe] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descRu, setDescRu] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || !claims?.verified)) {
      router.replace("/login?next=/create");
    }
  }, [authLoading, user, claims, router]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handlePhotos(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: UploadedPhoto[] = [];
      for (let i = 0; i < Math.min(files.length, 10); i++) {
        const f = files[i];
        const path = `events/${eventId}/photo_${Date.now()}_${i}_${f.name}`;
        const r = storageRef(storage, path);
        await uploadBytes(r, f, { contentType: f.type });
        const fullUrl = await getDownloadURL(r);
        // Resize extension generates 400x300/800x600/1600x1200 in background.
        // Use the original URL as a placeholder until those propagate.
        uploaded.push({ full: fullUrl, medium: fullUrl, thumb: fullUrl });
      }
      setPhotos((prev) => [...prev, ...uploaded].slice(0, 10));
    } catch (e) {
      console.error(e);
      setError(`Photo upload failed: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  async function generateAiDescription() {
    setGeneratingDesc(true);
    setError(null);
    try {
      const functions = getFunctions(app, "europe-west1");
      const fn = httpsCallable<
        { eventData: object; realtorInputText: string },
        { description: { he: string; en: string; ru: string } }
      >(functions, "generateDescription");
      const eventData = {
        address: form.address,
        city: form.city,
        propertyType: form.propertyType,
        price: Number(form.price),
        rooms: Number(form.rooms),
        bathrooms: Number(form.bathrooms),
        size: Number(form.size),
        floor: form.floor ? Number(form.floor) : undefined,
        totalFloors: form.totalFloors ? Number(form.totalFloors) : undefined,
        parking: form.parking,
        mamad: form.mamad,
        mirpeset: form.mirpeset,
      };
      const res = await fn({ eventData, realtorInputText: form.realtorInputText });
      setDescHe(res.data.description.he);
      setDescEn(res.data.description.en);
      setDescRu(res.data.description.ru);
    } catch (e) {
      console.error(e);
      setError(`AI generation failed: ${(e as Error).message}`);
    } finally {
      setGeneratingDesc(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.currentUser) return;
    setError(null);
    setSubmitting(true);
    try {
      const lat = Number(form.lat);
      const lng = Number(form.lng);
      if (!lat || !lng) throw new Error("נא להזין קואורדינטות (lat, lng)");
      const geohash = ngeohash.encode(lat, lng, 9);
      const eventRef = doc(db, "events", eventId);

      // Pull realtor snapshot from /users/{uid}
      const userSnap = await (
        await import("firebase/firestore")
      ).getDoc(doc(db, "users", auth.currentUser.uid));
      const userData = userSnap.exists() ? userSnap.data() : {};

      await setDoc(eventRef, {
        ownerId: auth.currentUser.uid,
        address: form.address,
        city: form.city,
        coordinates: { lat, lng },
        geohash,
        propertyType: form.propertyType,
        price: Number(form.price),
        rooms: Number(form.rooms),
        bathrooms: Number(form.bathrooms),
        size: Number(form.size),
        floor: form.floor ? Number(form.floor) : undefined,
        totalFloors: form.totalFloors ? Number(form.totalFloors) : undefined,
        parking: form.parking,
        mamad: form.mamad,
        mirpeset: form.mirpeset,
        photos,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        visibility: form.visibility,
        description: {
          he: descHe || "",
          en: descEn || "",
          ru: descRu || "",
        },
        realtorInputText: form.realtorInputText,
        status: "active",
        archiveStatus: "active",
        cancelledAt: null,
        completedAt: null,
        archivedAt: null,
        feedbackRequested: false,
        mapVisible: true,
        realtorSnapshot: {
          name: userData.name ?? "",
          surname: userData.surname ?? "",
          officeName: userData.officeName ?? "",
          licenseNumber: userData.licenseNumber ?? "",
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      router.push(`/e/${eventId}`);
    } catch (e) {
      console.error(e);
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return <main className="p-8 text-center text-(--color-moss)">טוען...</main>;
  }
  if (!user || !claims?.verified) {
    return null;
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-[var(--font-display)] text-(--color-deep) mb-6">
        צור Open House חדש
      </h1>

      <form onSubmit={submit} className="space-y-5">
        <Field label="כתובת מלאה">
          <input
            required
            type="text"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            className="input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="עיר">
            <input
              required
              type="text"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="סוג נכס">
            <select
              value={form.propertyType}
              onChange={(e) =>
                update("propertyType", e.target.value as PropertyType)
              }
              className="input"
            >
              <option value="apartment">דירה</option>
              <option value="house">בית פרטי</option>
              <option value="penthouse">פנטהאוס</option>
              <option value="land">קרקע</option>
              <option value="commercial">מסחרי</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="קו רוחב (lat)">
            <input
              required
              type="number"
              step="any"
              value={form.lat}
              onChange={(e) => update("lat", e.target.value)}
              className="input"
              placeholder="32.0653"
            />
          </Field>
          <Field label="קו אורך (lng)">
            <input
              required
              type="number"
              step="any"
              value={form.lng}
              onChange={(e) => update("lng", e.target.value)}
              className="input"
              placeholder="34.7747"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="מחיר (₪)">
            <input
              required
              type="number"
              min="1"
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
              className="input"
              placeholder="3000000"
            />
          </Field>
          <Field label='גודל (מ"ר)'>
            <input
              required
              type="number"
              min="1"
              value={form.size}
              onChange={(e) => update("size", e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <Field label="חדרים">
            <input
              required
              type="number"
              min="1"
              step="0.5"
              value={form.rooms}
              onChange={(e) => update("rooms", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="חדרי שירותים">
            <input
              type="number"
              min="0"
              value={form.bathrooms}
              onChange={(e) => update("bathrooms", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="קומה">
            <input
              type="number"
              value={form.floor}
              onChange={(e) => update("floor", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="קומות סהכ">
            <input
              type="number"
              value={form.totalFloors}
              onChange={(e) => update("totalFloors", e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <fieldset className="flex gap-4 flex-wrap">
          <legend className="text-sm text-(--color-moss) mb-1">תוספות</legend>
          <Check label="חניה" value={form.parking} onChange={(v) => update("parking", v)} />
          <Check label="ממ״ד" value={form.mamad} onChange={(v) => update("mamad", v)} />
          <Check label="מרפסת" value={form.mirpeset} onChange={(v) => update("mirpeset", v)} />
        </fieldset>

        <div className="grid grid-cols-3 gap-3">
          <Field label="תאריך">
            <input
              required
              type="date"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="שעת התחלה">
            <input
              required
              type="time"
              value={form.startTime}
              onChange={(e) => update("startTime", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="שעת סיום">
            <input
              required
              type="time"
              value={form.endTime}
              onChange={(e) => update("endTime", e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <Field label="נראות">
          <div className="flex gap-2">
            {(["public", "mixed", "colleagues"] as Visibility[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => update("visibility", v)}
                className={`flex-1 px-3 py-2 rounded-xl text-sm transition-colors ${
                  form.visibility === v
                    ? "bg-(--color-moss) text-(--color-ivory)"
                    : "bg-(--color-cream) text-(--color-deep)"
                }`}
              >
                {v === "public"
                  ? "🟢 ציבורי"
                  : v === "mixed"
                  ? "🟡 משולב"
                  : "🔴 קולגות"}
              </button>
            ))}
          </div>
        </Field>

        <Field label="הערות לתיאור AI">
          <textarea
            value={form.realtorInputText}
            onChange={(e) => update("realtorInputText", e.target.value)}
            rows={2}
            className="input"
            placeholder="דירה משופצת, נוף לים, שכונה שקטה..."
          />
        </Field>

        <Field label={`תמונות (${photos.length}/10)`}>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handlePhotos(e.target.files)}
            disabled={uploading || photos.length >= 10}
            className="block w-full text-sm text-(--color-moss)"
          />
          {photos.length > 0 && (
            <div className="grid grid-cols-5 gap-2 mt-2">
              {photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={p.thumb}
                  alt=""
                  className="w-full h-20 object-cover rounded-lg"
                />
              ))}
            </div>
          )}
        </Field>

        <div className="border-t border-(--color-cream) pt-4 space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="font-medium text-(--color-deep)">תיאור</h2>
            <button
              type="button"
              onClick={generateAiDescription}
              disabled={generatingDesc || !form.address || !form.price}
              className="bg-(--color-gold)/30 text-(--color-deep) px-3 py-1.5 rounded-lg text-sm hover:bg-(--color-gold)/50 disabled:opacity-50"
            >
              {generatingDesc ? "מייצר..." : "✨ צור עם AI"}
            </button>
          </div>
          <textarea
            value={descHe}
            onChange={(e) => setDescHe(e.target.value)}
            placeholder="תיאור בעברית..."
            rows={3}
            dir="rtl"
            className="input"
          />
          <textarea
            value={descEn}
            onChange={(e) => setDescEn(e.target.value)}
            placeholder="English description..."
            rows={2}
            dir="ltr"
            className="input"
          />
          <textarea
            value={descRu}
            onChange={(e) => setDescRu(e.target.value)}
            placeholder="Описание на русском..."
            rows={2}
            dir="ltr"
            className="input"
          />
        </div>

        {error && (
          <p role="alert" className="text-(--vis-red) bg-(--vis-red)/10 p-3 rounded-xl text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full bg-(--color-deep) text-(--color-ivory) py-3.5 rounded-xl font-medium hover:bg-(--color-forest) disabled:opacity-50 transition-colors"
        >
          {submitting ? "שומר..." : "פרסם Open House"}
        </button>
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
          font-family: var(--font-dm-sans), sans-serif;
        }
        :global(.input:focus) {
          border-color: var(--color-moss);
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm text-(--color-moss) mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function Check({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 accent-(--color-moss)"
      />
      <span className="text-(--color-deep)">{label}</span>
    </label>
  );
}
