import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cityBySlug } from "@/lib/cities";
import { renderHomeCity } from "../_city/home";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = await cityBySlug(citySlug);
  if (!city) return {};
  return {
    title: `Rental brokers in ${city.name}`,
    description: `A community-maintained directory of rental brokers across ${city.name}. Find brokers by area and reach them directly on WhatsApp or a call. No sign-up.`,
    openGraph: {
      title: `YesBroker: Rental brokers in ${city.name}`,
      description: `Find rental brokers in any ${city.name} locality and message them directly. Community-maintained, no accounts.`,
      type: "website",
    },
  };
}

export default async function CityHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { city: citySlug } = await params;
  const sp = await searchParams;
  const city = await cityBySlug(citySlug);
  if (!city) notFound();
  return renderHomeCity(city, sp, `/${citySlug}/add`);
}
