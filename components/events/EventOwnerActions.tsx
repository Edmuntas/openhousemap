"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { XCircle, Archive } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";

interface Props {
  eventId: string;
  ownerId: string;
  status: string;
  archiveStatus?: string;
}

/**
 * Renders owner-only management controls (Edit / Cancel / Archive).
 * Hides itself if the current user is not the event owner or admin.
 * Safe to mount unconditionally — handles auth loading internally.
 */
export default function EventOwnerActions({
  eventId,
  ownerId,
  status,
  archiveStatus,
}: Props) {
  const router = useRouter();
  const { user, claims, loading } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) return null;
  const isOwner = user?.uid === ownerId;
  const isAdmin = !!claims?.admin;
  if (!isOwner && !isAdmin) return null;

  async function cancel() {
    if (busy) return;
    if (!confirm("לבטל את האירוע? כל ה־RSVP יקבלו הודעה.")) return;
    setBusy("cancel");
    setError(null);
    try {
      await updateDoc(doc(db, "events", eventId), {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        mapVisible: false,
        updatedAt: serverTimestamp(),
      });
      router.refresh();
    } catch (e) {
      console.error("[owner-actions] cancel failed", e);
      setError("שגיאה בביטול. נסה שוב.");
    } finally {
      setBusy(null);
    }
  }

  async function archive() {
    if (busy) return;
    if (!confirm("להעביר את האירוע לארכיון? לא יוצג יותר ברשימה הראשית.")) return;
    setBusy("archive");
    setError(null);
    try {
      await updateDoc(doc(db, "events", eventId), {
        archiveStatus: "archived",
        archivedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      router.refresh();
    } catch (e) {
      console.error("[owner-actions] archive failed", e);
      setError("שגיאה בהעברה לארכיון. נסה שוב.");
    } finally {
      setBusy(null);
    }
  }

  const isCancelled = status === "cancelled";
  const isArchived = archiveStatus === "archived";

  return (
    <section className="border-t border-(--color-cream) pt-5 space-y-3">
      <h2 className="text-sm font-semibold text-(--color-moss) tracking-wide">
        {isAdmin && !isOwner ? "כלי מנהל" : "ניהול האירוע שלי"}
      </h2>
      {error && (
        <div className="bg-(--vis-red)/10 text-(--vis-red) text-xs px-3 py-2 rounded-xl">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={cancel}
          disabled={!!busy || isCancelled}
          className="inline-flex items-center justify-center gap-2 bg-(--color-cream) text-(--color-deep) h-11 rounded-full text-sm font-medium hover:bg-(--vis-red)/15 hover:text-(--vis-red) disabled:opacity-50 transition-colors active:scale-[0.97]"
        >
          <XCircle className="w-4 h-4" />
          {isCancelled ? "בוטל" : busy === "cancel" ? "מבטל..." : "בטל אירוע"}
        </button>
        <button
          type="button"
          onClick={archive}
          disabled={!!busy || isArchived}
          className="inline-flex items-center justify-center gap-2 bg-(--color-cream) text-(--color-deep) h-11 rounded-full text-sm font-medium hover:bg-(--color-sage)/40 disabled:opacity-50 transition-colors active:scale-[0.97]"
        >
          <Archive className="w-4 h-4" />
          {isArchived ? "בארכיון" : busy === "archive" ? "מעביר..." : "ארכיון"}
        </button>
      </div>
      <p className="text-xs text-(--color-moss)/70 leading-relaxed">
        עריכת פרטי האירוע תהיה זמינה בקרוב. בינתיים, ניתן לבטל את האירוע
        ולפרסם חדש.
      </p>
    </section>
  );
}
