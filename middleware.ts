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
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
