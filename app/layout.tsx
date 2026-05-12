import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

// Rubik covers hebrew + latin + cyrillic in one family. Earlier Syne/DM_Sans
// were latin-only so hebrew text was rendering in the OS fallback font and
// the interface looked inconsistent.
const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin", "hebrew", "cyrillic"],
  weight: ["300", "400", "500", "600", "700", "900"],
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
