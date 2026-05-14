import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n/request";

export default createMiddleware({
  locales: [...locales],
  defaultLocale,
  // Hebrew (default) at /, others at /en, /ru, /fr
  localePrefix: "as-needed",
  // Never auto-redirect based on browser Accept-Language. App is hebrew-first
  // for Israeli realtors. Users can still switch via /en, /ru, /fr URLs.
  localeDetection: false,
});

export const config = {
  // Exclude:
  // - api routes (server-only)
  // - _next internals
  // - Next.js metadata routes (opengraph-image, apple-icon, twitter-image, icon, sitemap, robots, manifest)
  //   These have no file extension but must NOT pass through the locale router.
  // - anything with a file extension (.css, .js, .png, .svg, .ico, etc.)
  matcher: [
    "/((?!api|_next|opengraph-image|twitter-image|apple-icon|icon|sitemap|robots|manifest|.*\\..*).*)",
  ],
};
