import type { Metadata, Viewport } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
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
      className={`${syne.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
