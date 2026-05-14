/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { FORMAT_SIZE, type CardEvent, type CardFormat } from "./types";

/**
 * Satori doesn't apply Unicode bidi — hebrew strings render LTR by default.
 * We pre-reverse them char-by-char so the visual reads correctly RTL.
 */
function reverseHebrew(s: string): string {
  return s.split("").reverse().join("");
}

function formatPriceShort(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `₪${m % 1 === 0 ? m : m.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 1000) return `₪${Math.round(n / 1000)}K`;
  return `₪${n}`;
}

function formatDate(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

interface RenderInput {
  event: CardEvent;
  format: CardFormat;
  /** Optional AI-generated city background as data URL or remote URL. */
  aiBackgroundUrl?: string | null;
  /** Property photo (already converted to data URL if needed). */
  photoUrl?: string | null;
  /** Logo (data URL or remote). */
  logoUrl?: string | null;
  /** Loaded font buffers. */
  fonts: Array<{
    name: string;
    data: ArrayBuffer | Buffer;
    weight: 400 | 500 | 700;
    style: "normal";
  }>;
}

export function renderShareCardImage({
  event,
  format,
  aiBackgroundUrl,
  photoUrl,
  logoUrl,
  fonts,
}: RenderInput): ImageResponse {
  const { width, height } = FORMAT_SIZE[format];
  const brandColor = event.realtor.brandColor || "#4A6E30";
  const dateText = `${formatDate(event.date)} · ${event.startTime}–${event.endTime}`;
  const priceText = formatPriceShort(event.price);
  const addressReversed = reverseHebrew(event.address);
  const taglineReversed = reverseHebrew("כל הבתים הפתוחים");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#141C0A",
          position: "relative",
        }}
      >
        {/* Layer 1: AI city background (if available) */}
        {aiBackgroundUrl && (
          <img
            src={aiBackgroundUrl}
            width={width}
            height={height}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "saturate(0.85) brightness(0.55)",
            }}
            alt=""
          />
        )}

        {/* Layer 2: Property photo card — centered, prominent */}
        {photoUrl && (
          <div
            style={{
              position: "absolute",
              top: format === "story" ? 200 : format === "og" ? 60 : 110,
              left: format === "og" ? 60 : "10%",
              right: format === "og" ? "50%" : "10%",
              bottom: format === "story" ? 700 : format === "og" ? 60 : 450,
              display: "flex",
              borderRadius: 24,
              overflow: "hidden",
              boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
              border: `3px solid ${brandColor}`,
            }}
          >
            <img
              src={photoUrl}
              width="100%"
              height="100%"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              alt=""
            />
          </div>
        )}

        {/* Layer 3: Top brand pill */}
        <div
          style={{
            position: "absolute",
            top: 32,
            left: format === "og" ? "auto" : "50%",
            right: format === "og" ? 32 : "auto",
            transform: format === "og" ? "none" : "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(246,248,242,0.95)",
            borderRadius: 999,
            padding: "10px 18px",
            boxShadow: "0 4px 16px rgba(20,28,10,0.18)",
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: brandColor,
              display: "flex",
            }}
          />
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#141C0A",
              letterSpacing: "-0.01em",
            }}
          >
            openhousemap.online
          </span>
        </div>

        {/* Layer 4: Hebrew text block bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding:
              format === "story"
                ? "60px 56px 80px"
                : format === "og"
                ? "32px 36px"
                : "44px 48px 56px",
            display: "flex",
            flexDirection: "column",
            background:
              "linear-gradient(180deg, rgba(20,28,10,0) 0%, rgba(20,28,10,0.85) 60%, rgba(20,28,10,0.96) 100%)",
          }}
        >
          <div
            style={{
              fontSize: format === "og" ? 22 : 26,
              fontWeight: 600,
              color: "#EAA830",
              letterSpacing: "0.04em",
              marginBottom: 10,
              display: "flex",
            }}
          >
            {dateText}
          </div>
          <div
            style={{
              fontSize: format === "story" ? 168 : format === "og" ? 92 : 132,
              fontWeight: 700,
              color: "#F6F8F2",
              lineHeight: 1,
              marginBottom: 14,
              letterSpacing: "-0.02em",
              display: "flex",
            }}
          >
            {priceText}
          </div>
          <div
            style={{
              fontSize: format === "story" ? 56 : format === "og" ? 32 : 44,
              fontWeight: 700,
              color: "#F6F8F2",
              marginBottom: 8,
              display: "flex",
            }}
          >
            {addressReversed}
          </div>
          {event.rooms != null && (
            <div
              style={{
                fontSize: format === "og" ? 20 : 28,
                fontWeight: 500,
                color: "rgba(246,248,242,0.78)",
                display: "flex",
              }}
            >
              {`${event.rooms} ${reverseHebrew("חד׳")}${event.size ? ` · ${event.size}m²` : ""}`}
            </div>
          )}
          <div
            style={{
              position: "absolute",
              top: -22,
              right: format === "og" ? 36 : 48,
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(246,248,242,0.5)",
              letterSpacing: "0.06em",
              display: "flex",
            }}
          >
            {taglineReversed}
          </div>
        </div>

        {/* Layer 5: Realtor logo + name corner */}
        {(logoUrl || event.realtor.office) && (
          <div
            style={{
              position: "absolute",
              top: format === "og" ? "auto" : 32,
              bottom: format === "og" ? 32 : "auto",
              left: 32,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {logoUrl && (
              <img
                src={logoUrl}
                width={56}
                height={56}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  objectFit: "contain",
                  background: "rgba(246,248,242,0.95)",
                  padding: 4,
                }}
                alt=""
              />
            )}
          </div>
        )}
      </div>
    ),
    {
      width,
      height,
      fonts: fonts.map((f) => ({
        name: f.name,
        data: f.data,
        weight: f.weight,
        style: f.style,
      })),
    }
  );
}
