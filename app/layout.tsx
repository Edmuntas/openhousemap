import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

// Rubik covers hebrew + latin + cyrillic in one family. Earlier Syne/DM_Sans
// were latin-only so hebrew text was rendering in the OS fallback font and
// the interface looked inconsistent.
// Trim weights to what's actually used (was 6 weights, ~270KB; now 3 = ~135KB)
const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin", "hebrew"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://openhousemap.online"),
  title: {
    default: "OpenHouse Map — כל הבתים הפתוחים במקום אחד",
    template: "%s | OpenHouse Map",
  },
  description: "מפת בתים פתוחים ארצית למתווכים בישראל. All Open Houses — In One Place.",
  applicationName: "OpenHouse Map",
  authors: [{ name: "AdmontREM" }],
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#4A6E30",
  viewportFit: "cover", // iPhone Dynamic Island / notch — let content use safe-area-inset-*
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${rubik.variable} h-full antialiased`}
    >
      <head>
        {/* Speed: warm up map tile + photo CDNs so the first tile/photo doesn't wait on DNS+TLS */}
        <link rel="preconnect" href="https://basemaps.cartocdn.com" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="dns-prefetch" href="https://nominatim.openstreetmap.org" />
        <link rel="dns-prefetch" href="https://photon.komoot.io" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
