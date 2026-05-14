import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#4A6E30",
          borderRadius: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 64 64"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#F6F8F2"
            d="M32 2 C18.7 2 8 12.7 8 26 c0 18.4 24 36 24 36 s24-17.6 24-36 C56 12.7 45.3 2 32 2 z"
          />
          <path
            fill="#4A6E30"
            d="M32 14 L18 26 L21 26 L21 39 L29 39 L29 31 L35 31 L35 39 L43 39 L43 26 L46 26 Z"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
