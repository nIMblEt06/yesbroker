import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cityBySlug } from "@/lib/cities";
import { renderAddCity } from "../../_city/add";

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
    title: "Add a broker",
    description: `Add a rental broker to the YesBroker ${city.name} directory, one at a time or paste a whole list.`,
  };
}

export default async function CityAddPage({
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
  return renderAddCity(city, sp);
}
