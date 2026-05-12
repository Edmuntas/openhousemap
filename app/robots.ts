import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/e/"],
      disallow: ["/dashboard", "/admin", "/create"],
    },
    sitemap: "https://openhousemap.online/sitemap.xml",
  };
}
