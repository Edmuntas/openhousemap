"use client";

import { useEffect, useState } from "react";
import {
  Navigation2,
  MessageCircle,
  CalendarPlus,
  Share2,
  Check,
  Link2,
} from "lucide-react";

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  );
}
import {
  wazeDeepLink,
  whatsappShareLink,
  facebookShareLink,
  buildShareText,
} from "@/lib/waze";
import { buildIcs } from "@/lib/ics";
import type { ServerEvent } from "@/lib/event-server";

interface Props {
  event: ServerEvent;
}

type NavigatorWithShare = Navigator & {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
};

export default function EventActionsClient({ event }: Props) {
  const eventUrl = `https://openhousemap.online/e/${event.id}`;
  const shareText = buildShareText(event);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  // Detect after hydration — `navigator` is undefined on the server, and
  // checking it inline would render different markup on server vs client.
  // The set-state-in-effect lint rule fires here, but feature detection
  // is the textbook use case for it.
  const [hasNativeShare, setHasNativeShare] = useState(false);
  useEffect(() => {
    const nav = navigator as NavigatorWithShare;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasNativeShare(typeof nav.share === "function");
  }, []);

  function downloadIcs() {
    const ics = buildIcs({
      id: event.id,
      address: event.address,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      price: event.price,
      rooms: event.rooms,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `openhouse-${event.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Native share with photo attached when supported (mobile Safari/Chrome).
   *  Falls back to text+link share, then to clipboard copy. */
  async function nativeShare() {
    const nav = navigator as NavigatorWithShare;
    if (!nav.share) {
      copyLink();
      return;
    }
    setBusy(true);
    try {
      // Same derive trick as the OG metadata: medium slot currently mirrors
      // full, so rewrite to the resize-ext-generated _800x600.jpg.
      const photo = event.photos[0];
      const photoUrl =
        photo?.medium && photo.medium !== photo.full
          ? photo.medium
          : photo?.full?.replace(/\.(jpe?g|png|webp)(\?|$)/i, "_800x600.$1$2");
      let files: File[] | undefined;
      if (photoUrl && nav.canShare) {
        try {
          const resp = await fetch(photoUrl);
          const blob = await resp.blob();
          const file = new File([blob], `openhouse-${event.id}.jpg`, {
            type: blob.type || "image/jpeg",
          });
          if (nav.canShare({ files: [file] })) {
            files = [file];
          }
        } catch {
          // CORS or fetch fail — share without file
        }
      }
      await nav.share({
        title: event.address,
        text: `${shareText}\n${eventUrl}`,
        ...(files ? { files } : { url: eventUrl }),
      });
    } catch (e) {
      // User dismissed share sheet — that's not an error
      if ((e as Error).name !== "AbortError") {
        console.error("[share] native share failed", e);
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${eventUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("[share] clipboard copy failed", e);
    }
  }

  return (
    <section className="space-y-2 pt-2">
      {/* Primary row: Waze + Calendar — these every visitor needs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <a
          href={wazeDeepLink(event.address)}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-(--color-moss) text-(--color-ivory) py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-(--color-forest) transition-colors active:scale-[0.97]"
        >
          <Navigation2 className="w-4 h-4" />
          Waze
        </a>
        <button
          type="button"
          onClick={downloadIcs}
          className="bg-(--color-gold)/20 text-(--color-deep) py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-(--color-gold)/40 transition-colors active:scale-[0.97]"
        >
          <CalendarPlus className="w-4 h-4" />
          הוסף ליומן
        </button>
      </div>

      {/* Share row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <a
          href={whatsappShareLink(shareText, eventUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#25D366]/10 text-[#128C7E] py-2.5 px-3 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-[#25D366]/20 transition-colors active:scale-[0.97]"
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp
        </a>
        <a
          href={facebookShareLink(eventUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#1877F2]/10 text-[#1877F2] py-2.5 px-3 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-[#1877F2]/20 transition-colors active:scale-[0.97]"
        >
          <FacebookIcon className="w-4 h-4" />
          Facebook
        </a>
        {hasNativeShare ? (
          <button
            type="button"
            onClick={nativeShare}
            disabled={busy}
            className="bg-(--color-cream) text-(--color-deep) py-2.5 px-3 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-(--color-sage) transition-colors active:scale-[0.97] disabled:opacity-60"
          >
            <Share2 className="w-4 h-4" />
            {busy ? "..." : "שתף עם תמונה"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={copyLink}
          className="bg-(--color-cream) text-(--color-deep) py-2.5 px-3 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-(--color-sage) transition-colors active:scale-[0.97]"
        >
          {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
          {copied ? "הועתק" : "העתק קישור"}
        </button>
      </div>
    </section>
  );
}
