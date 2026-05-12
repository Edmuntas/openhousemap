import type { MetadataRoute } from "next";

// Dynamic sitemap — fetches all active+public event IDs from Firestore.
// Implementation pending Firebase Admin SDK wiring in lib/firebase-admin.ts.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://openhousemap.online";
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/accessibility`, changeFrequency: "yearly", priority: 0.3 },
  ];
  // TODO: append event pages once Firebase Admin is configured
  return staticRoutes;
}
