import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "OpenHouse Map — כל הבתים הפתוחים במקום אחד";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #F6F8F2 0%, #F0E8D0 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 80,
          position: "relative",
        }}
      >
        {/* Soft sage glow on the side */}
        <div
          style={{
            position: "absolute",
            top: -200,
            left: -200,
            width: 800,
            height: 800,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(138,176,96,0.25) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -180,
            right: -180,
            width: 700,
            height: 700,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(74,110,48,0.18) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            marginBottom: 40,
          }}
        >
          <svg
            width="120"
            height="120"
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#4A6E30"
              d="M32 2 C18.7 2 8 12.7 8 26 c0 18.4 24 36 24 36 s24-17.6 24-36 C56 12.7 45.3 2 32 2 z"
            />
            <path
              fill="#F6F8F2"
              d="M32 14 L18 26 L21 26 L21 39 L29 39 L29 31 L35 31 L35 39 L43 39 L43 26 L46 26 Z"
            />
          </svg>
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              color: "#141C0A",
              letterSpacing: "-0.03em",
              lineHeight: 1,
              display: "flex",
            }}
          >
            OpenHouse Map
          </div>
        </div>

        {/* Hebrew tagline */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: "#2E4E1A",
            textAlign: "center",
            direction: "rtl",
            marginBottom: 24,
            display: "flex",
          }}
        >
          כל הבתים הפתוחים — במקום אחד
        </div>

        {/* English subline */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 500,
            color: "#4A6E30",
            textAlign: "center",
            display: "flex",
          }}
        >
          Israel&apos;s live map of open house events
        </div>

        {/* URL footer */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 28,
            fontWeight: 600,
            color: "#4A6E30",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#EAA830",
              display: "flex",
            }}
          />
          openhousemap.online
        </div>
      </div>
    ),
    { ...size }
  );
}
