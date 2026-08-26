import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cityBySlug, DEFAULT_CITY_SLUG } from "@/lib/cities";
import { renderAddCity } from "../_city/add";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Add a broker",
  description:
    "Add a rental broker to the YesBroker directory, one at a time or paste a whole list.",
};

export default async function AddPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const city = await cityBySlug(DEFAULT_CITY_SLUG);
  if (!city) notFound();
  return renderAddCity(city, sp);
}
