import { notFound } from "next/navigation";
import { cityBySlug, DEFAULT_CITY_SLUG } from "@/lib/cities";
import { renderHomeCity } from "./_city/home";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const city = await cityBySlug(DEFAULT_CITY_SLUG);
  if (!city) notFound();
  return renderHomeCity(city, sp, "/add");
}
