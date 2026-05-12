"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
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
import type {
  PropertyType,
  EventVisibility,
} from "@/types/event";
import {
  RESIDENTIAL_TYPES,
  APARTMENT_LIKE_TYPES,
} from "@/types/event";
import type { AddressValue } from "./AddressPicker";
import TimeSelect from "./TimeSelect";

const AddressPicker = dynamic(() => import("./AddressPicker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-72 rounded-xl bg-(--color-cream)/30 flex items-center justify-center text-sm text-(--color-moss)">
      טוען מפה...
    </div>
  ),
});

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: "דירה",
  garden_apartment: "דירת גן",
  penthouse: "פנטהאוז",
  duplex: "דופלקס",
  house: "בית פרטי",
  land: "מגרש",
  commercial: "מסחרי",
};

const PROPERTY_TYPE_ORDER: PropertyType[] = [
  "apartment",
  "garden_apartment",
  "penthouse",
  "duplex",
  "house",
  "land",
  "commercial",
];

function hasRooms(t: PropertyType): boolean {
  return RESIDENTIAL_TYPES.includes(t);
}
function hasFloors(t: PropertyType): boolean {
  return APARTMENT_LIKE_TYPES.includes(t) || t === "commercial";
}
function hasElevator(t: PropertyType): boolean {
  return APARTMENT_LIKE_TYPES.includes(t);
}
function hasMirpeset(t: PropertyType): boolean {
  return APARTMENT_LIKE_TYPES.includes(t);
}
function hasMamad(t: PropertyType): boolean {
  return RESIDENTIAL_TYPES.includes(t);
}
function hasGardenSize(t: PropertyType): boolean {
  return t === "garden_apartment";
}
function hasRoofTerrace(t: PropertyType): boolean {
  return t === "penthouse";
}
function hasPlotSize(t: PropertyType): boolean {
  return t === "house" || t === "land";
}
function hasGardenPool(t: PropertyType): boolean {
  return t === "house";
}
function hasBuiltSize(t: PropertyType): boolean {
  return t !== "land";
}
function hasBathrooms(t: PropertyType): boolean {
  return RESIDENTIAL_TYPES.includes(t);
}

interface FormState {
  address: AddressValue;
  propertyType: PropertyType;
  price: string;
  rooms: string;
  bathrooms: string;
  size: string;
  floor: string;
  totalFloors: string;
  plotSize: string;
  gardenSize: string;
  roofTerraceSize: string;
  parking: boolean;
  mamad: boolean;
  mirpeset: boolean;
  elevator: boolean;
  ac: boolean;
  renovated: boolean;
  garden: boolean;
  pool: boolean;
  date: string;
  startTime: string;
  endTime: string;
  visibility: EventVisibility;
  realtorInputText: string;
}

interface UploadedPhoto {
  full: string;
  medium: string;
  thumb: string;
}

const initial: FormState = {
  address: { address: "", city: "", lat: null, lng: null },
  propertyType: "apartment",
  price: "",
  rooms: "",
  bathrooms: "1",
  size: "",
  floor: "",
  totalFloors: "",
  plotSize: "",
  gardenSize: "",
  roofTerraceSize: "",
  parking: false,
  mamad: false,
  mirpeset: false,
  elevator: false,
  ac: false,
  renovated: false,
  garden: false,
  pool: false,
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

  const t = form.propertyType;

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
        address: form.address.address,
        city: form.address.city,
        propertyType: t,
        price: Number(form.price),
        rooms: hasRooms(t) ? Number(form.rooms) || undefined : undefined,
        bathrooms: hasBathrooms(t) ? Number(form.bathrooms) || undefined : undefined,
        size: hasBuiltSize(t) ? Number(form.size) || undefined : undefined,
        floor: hasFloors(t) && form.floor ? Number(form.floor) : undefined,
        totalFloors:
          hasFloors(t) && form.totalFloors ? Number(form.totalFloors) : undefined,
        plotSize:
          hasPlotSize(t) && form.plotSize ? Number(form.plotSize) : undefined,
        gardenSize:
          hasGardenSize(t) && form.gardenSize ? Number(form.gardenSize) : undefined,
        roofTerraceSize:
          hasRoofTerrace(t) && form.roofTerraceSize
            ? Number(form.roofTerraceSize)
            : undefined,
        parking: form.parking,
        mamad: hasMamad(t) ? form.mamad : false,
        mirpeset: hasMirpeset(t) ? form.mirpeset : false,
        elevator: hasElevator(t) ? form.elevator : false,
        ac: form.ac,
        renovated: form.renovated,
        garden: hasGardenPool(t) ? form.garden : false,
        pool: hasGardenPool(t) ? form.pool : false,
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
      const { lat, lng } = form.address;
      if (!lat || !lng) {
        throw new Error("בחר כתובת מהאוטוקומפליט או לחץ על המפה");
      }
      if (!form.address.address || !form.address.city) {
        throw new Error("חסר פרטי כתובת");
      }
      const geohash = ngeohash.encode(lat, lng, 9);
      const eventRef = doc(db, "events", eventId);

      const userSnap = await (
        await import("firebase/firestore")
      ).getDoc(doc(db, "users", auth.currentUser.uid));
      const userData = userSnap.exists() ? userSnap.data() : {};

      const docData: Record<string, unknown> = {
        ownerId: auth.currentUser.uid,
        address: form.address.address,
        city: form.address.city,
        coordinates: { lat, lng },
        geohash,
        propertyType: t,
        price: Number(form.price),
        parking: form.parking,
        mamad: hasMamad(t) ? form.mamad : false,
        mirpeset: hasMirpeset(t) ? form.mirpeset : false,
        elevator: hasElevator(t) ? form.elevator : false,
        ac: form.ac,
        renovated: form.renovated,
        garden: hasGardenPool(t) ? form.garden : false,
        pool: hasGardenPool(t) ? form.pool : false,
        photos,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        visibility: form.visibility,
        description: { he: descHe || "", en: descEn || "", ru: descRu || "" },
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
      };

      if (hasRooms(t) && form.rooms) docData.rooms = Number(form.rooms);
      if (hasBathrooms(t) && form.bathrooms)
        docData.bathrooms = Number(form.bathrooms);
      if (hasBuiltSize(t) && form.size) docData.size = Number(form.size);
      if (hasFloors(t) && form.floor) docData.floor = Number(form.floor);
      if (hasFloors(t) && form.totalFloors)
        docData.totalFloors = Number(form.totalFloors);
      if (hasPlotSize(t) && form.plotSize)
        docData.plotSize = Number(form.plotSize);
      if (hasGardenSize(t) && form.gardenSize)
        docData.gardenSize = Number(form.gardenSize);
      if (hasRoofTerrace(t) && form.roofTerraceSize)
        docData.roofTerraceSize = Number(form.roofTerraceSize);

      await setDoc(eventRef, docData);
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
        <Field label="סוג נכס">
          <div className="flex flex-wrap gap-2">
            {PROPERTY_TYPE_ORDER.map((pt) => (
              <button
                key={pt}
                type="button"
                onClick={() => update("propertyType", pt)}
                className={`px-3 py-1.5 rounded-xl text-sm transition-colors ${
                  t === pt
                    ? "bg-(--color-moss) text-(--color-ivory)"
                    : "bg-(--color-cream) text-(--color-deep) hover:bg-(--color-cream)/70"
                }`}
              >
                {PROPERTY_TYPE_LABELS[pt]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="כתובת">
          <AddressPicker
            value={form.address}
            onChange={(v) => update("address", v)}
          />
        </Field>

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

        {hasBuiltSize(t) && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t === "commercial" ? 'גודל בנוי (מ"ר)' : 'גודל בנוי (מ"ר)'}>
              <input
                type="number"
                min="1"
                value={form.size}
                onChange={(e) => update("size", e.target.value)}
                className="input"
              />
            </Field>
            {hasRooms(t) && (
              <Field label="חדרים">
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={form.rooms}
                  onChange={(e) => update("rooms", e.target.value)}
                  className="input"
                />
              </Field>
            )}
          </div>
        )}

        {hasPlotSize(t) && (
          <Field label='גודל מגרש (מ"ר)'>
            <input
              type="number"
              min="1"
              value={form.plotSize}
              onChange={(e) => update("plotSize", e.target.value)}
              className="input"
            />
          </Field>
        )}

        {hasGardenSize(t) && (
          <Field label='גודל גינה (מ"ר)'>
            <input
              type="number"
              min="1"
              value={form.gardenSize}
              onChange={(e) => update("gardenSize", e.target.value)}
              className="input"
            />
          </Field>
        )}

        {hasRoofTerrace(t) && (
          <Field label='גודל מרפסת גג (מ"ר)'>
            <input
              type="number"
              min="1"
              value={form.roofTerraceSize}
              onChange={(e) => update("roofTerraceSize", e.target.value)}
              className="input"
            />
          </Field>
        )}

        {(hasBathrooms(t) || hasFloors(t)) && (
          <div className="grid grid-cols-3 gap-3">
            {hasBathrooms(t) && (
              <Field label="חדרי שירותים">
                <input
                  type="number"
                  min="0"
                  value={form.bathrooms}
                  onChange={(e) => update("bathrooms", e.target.value)}
                  className="input"
                />
              </Field>
            )}
            {hasFloors(t) && (
              <>
                <Field label="קומה">
                  <input
                    type="number"
                    value={form.floor}
                    onChange={(e) => update("floor", e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label='סה"כ קומות'>
                  <input
                    type="number"
                    value={form.totalFloors}
                    onChange={(e) => update("totalFloors", e.target.value)}
                    className="input"
                  />
                </Field>
              </>
            )}
          </div>
        )}

        {t !== "land" && (
          <fieldset className="flex gap-x-4 gap-y-2 flex-wrap">
            <legend className="text-sm text-(--color-moss) mb-1 w-full">תכונות</legend>
            <Check label="חניה" value={form.parking} onChange={(v) => update("parking", v)} />
            {hasMamad(t) && (
              <Check label="ממ״ד" value={form.mamad} onChange={(v) => update("mamad", v)} />
            )}
            {hasMirpeset(t) && (
              <Check label="מרפסת" value={form.mirpeset} onChange={(v) => update("mirpeset", v)} />
            )}
            {hasElevator(t) && (
              <Check label="מעלית" value={form.elevator} onChange={(v) => update("elevator", v)} />
            )}
            <Check label="מיזוג" value={form.ac} onChange={(v) => update("ac", v)} />
            <Check label="משופץ" value={form.renovated} onChange={(v) => update("renovated", v)} />
            {hasGardenPool(t) && (
              <>
                <Check label="גינה" value={form.garden} onChange={(v) => update("garden", v)} />
                <Check label="בריכה" value={form.pool} onChange={(v) => update("pool", v)} />
              </>
            )}
          </fieldset>
        )}

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
            <TimeSelect
              required
              value={form.startTime}
              onChange={(v) => update("startTime", v)}
            />
          </Field>
          <Field label="שעת סיום">
            <TimeSelect
              required
              value={form.endTime}
              onChange={(v) => update("endTime", v)}
            />
          </Field>
        </div>

        <Field label="נראות">
          <div className="flex gap-2">
            {(["public", "mixed", "colleagues"] as EventVisibility[]).map((v) => (
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

        {t !== "land" && (
          <Field label={`תמונות (${photos.length}/10)`}>
            <label
              className={`block border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                uploading || photos.length >= 10
                  ? "border-(--color-cream) bg-(--color-cream)/30 cursor-not-allowed opacity-60"
                  : "border-(--color-moss)/40 bg-(--color-cream)/30 hover:border-(--color-moss) hover:bg-(--color-cream)/60"
              }`}
            >
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  handlePhotos(e.target.files);
                  e.target.value = "";
                }}
                disabled={uploading || photos.length >= 10}
                className="sr-only"
              />
              <div className="text-(--color-deep) font-medium">
                {uploading
                  ? "מעלה..."
                  : photos.length >= 10
                  ? "הגעת ל-10 תמונות"
                  : "📸 בחר תמונות או צלם"}
              </div>
              <div className="text-xs text-(--color-moss) mt-1">
                {photos.length === 0
                  ? "JPG / PNG · עד 10 תמונות"
                  : `${photos.length}/10 תמונות הועלו · לחץ להוספה`}
              </div>
            </label>
            {photos.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mt-3">
                {photos.map((p, i) => (
                  <div key={i} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.thumb}
                      alt=""
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPhotos((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-(--vis-red) text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="מחק"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>
        )}

        <div className="border-t border-(--color-cream) pt-4 space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="font-medium text-(--color-deep)">תיאור</h2>
            <button
              type="button"
              onClick={generateAiDescription}
              disabled={generatingDesc || !form.address.address || !form.price}
              title={
                !form.address.address
                  ? "הזן כתובת קודם"
                  : !form.price
                  ? "הזן מחיר קודם"
                  : ""
              }
              className="bg-(--color-gold)/30 text-(--color-deep) px-3 py-1.5 rounded-lg text-sm hover:bg-(--color-gold)/50 disabled:opacity-50 disabled:cursor-not-allowed"
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
