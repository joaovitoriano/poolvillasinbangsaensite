import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";

import { HomepageExperience, type HomepageVilla } from "@/components/HomepageExperience";
import { api } from "@/convex/_generated/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const th = locale === "th";
  return {
    title: th ? "พูลวิลล่าบางแสน | ค้นหาบ้านพักสำหรับทริปของคุณ" : "Pool Villas in Bang Saen | Find your stay",
    description: th
      ? "เลือกวันที่จากปฏิทิน และค้นหาพูลวิลล่าตามสไตล์และจำนวนผู้เข้าพักในบางแสน"
      : "Choose your dates and browse Bang Saen pool villas by travel style and group size.",
    alternates: { canonical: `/${th ? "th" : "en"}`, languages: { th: "/th", en: "/en" } },
  };
}

export default async function Homepage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "th" && locale !== "en") notFound();
  const rows = await fetchQuery(api.villas.search, { locale, sort: "recommended" });
  const villas: HomepageVilla[] = rows.map((villa) => ({
    _id: villa._id,
    slug: villa.slug,
    nameEn: villa.nameEn,
    nameTh: villa.nameTh,
    formattedAddress: villa.formattedAddress,
    weekdayPriceThb: villa.weekdayPriceThb,
    bedrooms: villa.bedrooms,
    bathrooms: villa.bathrooms,
    maxGuests: villa.maxGuests,
    mainPhotoUrl: villa.mainPhotoUrl,
    amenities: villa.amenities.map((amenity) => ({
      _id: amenity._id,
      slug: amenity.slug,
      labelEn: amenity.labelEn,
      labelTh: amenity.labelTh,
      icon: amenity.icon,
    })),
  }));
  return <HomepageExperience locale={locale} villas={villas} />;
}
