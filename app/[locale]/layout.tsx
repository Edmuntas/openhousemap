import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { locales, type Locale } from "@/i18n/request";
import CookieBanner from "@/components/layout/CookieBanner";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(locales as readonly string[]).includes(locale)) notFound();

  setRequestLocale(locale as Locale);
  const messages = await getMessages();
  const dir = locale === "he" ? "rtl" : "ltr";

  return (
    <div lang={locale} dir={dir} className="contents">
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
        <CookieBanner />
      </NextIntlClientProvider>
    </div>
  );
}
