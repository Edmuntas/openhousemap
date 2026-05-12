import { setRequestLocale } from "next-intl/server";
import MapHomeClient from "@/components/map/MapHomeClient";

export default async function MapHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MapHomeClient />;
}
