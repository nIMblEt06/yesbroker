import type { MetadataRoute } from "next";
import { fetchCities, DEFAULT_CITY_SLUG } from "@/lib/cities";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://yesbroker.xyz";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cities = await fetchCities();

  const entries: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/add`, changeFrequency: "weekly", priority: 0.7 },
  ];

  for (const city of cities) {
    if (city.slug === DEFAULT_CITY_SLUG) continue;
    entries.push({ url: `${siteUrl}/${city.slug}`, changeFrequency: "daily", priority: 1 });
    entries.push({ url: `${siteUrl}/${city.slug}/add`, changeFrequency: "weekly", priority: 0.7 });
  }

  return entries;
}
