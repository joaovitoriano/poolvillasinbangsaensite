import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import {
  Bath,
  BedDouble,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { formatNumericDateRange } from "@/lib/date-format";
import { shouldBypassImageOptimization } from "@/lib/remote-image";
import type { Metadata } from "next";

type Search = {
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  minPrice?: string;
  maxPrice?: string;
  bedrooms?: string;
  location?: string;
  amenities?: string | string[];
  sort?: string;
};
const validSort = new Set([
  "recommended",
  "price_asc",
  "price_desc",
  "capacity",
  "newest",
]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const th = locale === "th";
  return {
    title: th ? "ค้นหาพูลวิลล่าในบางแสน" : "Find pool villas in Bang Saen",
    description: th
      ? "ดูพูลวิลล่าในบางแสน เปรียบเทียบราคา ทำเล ห้องนอน และสิ่งอำนวยความสะดวก แล้วเลือกวันบนปฏิทินของบ้านแต่ละหลัง"
      : "Browse Bang Saen pool villas by price, location, bedrooms and amenities, then choose dates on each villa's calendar.",
    alternates: {
      canonical: `/${th ? "th" : "en"}/villas`,
      languages: { en: "/en/villas", th: "/th/villas" },
    },
  };
}

export default async function VillasDirectory({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Search>;
}) {
  const [{ locale }, search] = await Promise.all([params, searchParams]);
  if (locale !== "en" && locale !== "th") notFound();
  const amenitySlugs =
    typeof search.amenities === "string"
      ? [search.amenities]
      : (search.amenities ?? []);
  const num = (value?: string) =>
    value && Number.isFinite(Number(value)) ? Number(value) : undefined;
  const [villas, amenities] = await Promise.all([
    fetchQuery(api.villas.search, {
      locale,
      checkIn: search.checkIn || undefined,
      checkOut: search.checkOut || undefined,
      guests: num(search.guests),
      minPrice: num(search.minPrice),
      maxPrice: num(search.maxPrice),
      bedrooms: num(search.bedrooms),
      location: search.location || undefined,
      amenitySlugs,
      sort: validSort.has(search.sort ?? "")
        ? (search.sort as
            "recommended" | "price_asc" | "price_desc" | "capacity" | "newest")
        : "recommended",
    }),
    fetchQuery(api.villas.listAmenities, {}),
  ]);
  const t =
    locale === "th"
      ? {
          kicker: "พูลวิลล่าในบางแสน",
          title: "เลือกพูลวิลล่าสำหรับทริปของคุณ",
          body: "ดูบ้านทั้งหมด แล้วเปิดปฏิทินของแต่ละหลังเพื่อเลือกวันว่างและดูราคารวม",
          filters: "กรองผลลัพธ์",
          location: "ทำเล",
          locationPlaceholder: "เช่น หาดบางแสน",
          bedrooms: "จำนวนห้องนอนขั้นต่ำ",
          any: "ไม่จำกัด",
          min: "ราคาต่อคืนต่ำสุด",
          max: "ราคาต่อคืนสูงสุด",
          amenities: "สิ่งอำนวยความสะดวก",
          apply: "ดูผลลัพธ์",
          clear: "ล้างตัวกรอง",
          result: "หลัง",
          results: "หลัง",
          noResults: "ยังไม่พบบ้านที่ตรงกับการค้นหานี้",
          noBody: "ลองเปลี่ยนวันที่ จำนวนผู้เข้าพัก หรือลดตัวกรองบางรายการ",
          available: "ว่างในวันที่เลือก",
          unavailable: "ไม่ว่างตามวันที่เลือก",
          from: "เริ่มที่",
          night: "คืน",
          view: "ดูรายละเอียด",
          sort: "เรียงตาม",
          update: "อัปเดต",
          recommended: "แนะนำ",
          low: "ราคาต่ำไปสูง",
          high: "ราคาสูงไปต่ำ",
          capacity: "รองรับมากที่สุด",
          newest: "ใหม่ล่าสุด",
        }
      : {
          kicker: "Private pool villas in Bang Saen",
          title: "Browse pool villas for your Bang Saen trip",
          body: "Explore the villas, then open any property to choose dates and see the total price.",
          filters: "Filter villas",
          location: "Location",
          locationPlaceholder: "e.g. Bang Saen Beach",
          bedrooms: "Minimum bedrooms",
          any: "Any",
          min: "Min. nightly price",
          max: "Max. nightly price",
          amenities: "Amenities",
          apply: "Show results",
          clear: "Clear filters",
          result: "villa found",
          results: "villas found",
          noResults: "No villas match your search",
          noBody: "Try different dates, fewer guests, or removing a filter.",
          available: "Available for your dates",
          unavailable: "Unavailable for your dates",
          from: "From",
          night: "night",
          view: "View details",
          sort: "Sort by",
          update: "Update",
          recommended: "Recommended",
          low: "Price: low to high",
          high: "Price: high to low",
          capacity: "Largest capacity",
          newest: "Newest",
        };
  const stayParams = new URLSearchParams();
  if (search.checkIn) stayParams.set("checkIn", search.checkIn);
  if (search.checkOut) stayParams.set("checkOut", search.checkOut);
  if (search.guests) stayParams.set("guests", search.guests);
  const staySuffix = stayParams.toString();
  return (
    <main className="min-h-screen overflow-x-clip bg-[var(--paper)]">
      <header className="bg-[var(--navy-deep)] px-5 text-white sm:px-8 lg:px-12">
        <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between">
          <Link href={`/${locale}`}>
            <Image
              src="/brand-logo-white.png"
              alt={locale === "th" ? "พูลวิลล่าในบางแสน" : "Pool Villas in Bangsaen"}
              width={220}
              height={44}
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex items-center text-xs font-bold">
            <Link href={`/${locale === "en" ? "th" : "en"}`}>
              {locale === "en" ? "TH" : "EN"}
            </Link>
          </div>
        </div>
      </header>
      <section className="border-t border-white/10 bg-[var(--navy-deep)] px-5 pb-12 pt-10 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1280px]">
          <p className="font-mono text-[11px] uppercase tracking-[.2em] text-[var(--peach)]">
            {t.kicker}
          </p>
          <h1 className="mt-3 max-w-4xl font-serif text-4xl font-semibold leading-[1.02] sm:text-6xl sm:leading-[.98]">
            {t.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65">
            {t.body}
          </p>
        </div>
      </section>
      <section className="px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1280px] gap-8 lg:grid-cols-[260px_1fr]">
          <aside>
            <details className="group overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_10px_26px_rgba(0,19,38,.06)] lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-bold lg:hidden">
                <span className="flex items-center gap-2"><SlidersHorizontal size={16} />{t.filters}</span>
                <span className="text-[var(--terracotta)] group-open:rotate-45">+</span>
              </summary>
            <form className="hidden border-t border-[var(--line)] p-5 group-open:block lg:sticky lg:top-5 lg:block lg:rounded-2xl lg:border lg:bg-white lg:shadow-[0_14px_38px_rgba(0,19,38,.07)]">
              <div className="hidden items-center gap-2 border-b border-[var(--line)] pb-4 lg:flex">
                <SlidersHorizontal size={16} />
                <h2 className="font-semibold">{t.filters}</h2>
              </div>
              {search.checkIn ? (
                <input type="hidden" name="checkIn" value={search.checkIn} />
              ) : null}
              {search.checkOut ? (
                <input type="hidden" name="checkOut" value={search.checkOut} />
              ) : null}
              {search.guests ? (
                <input type="hidden" name="guests" value={search.guests} />
              ) : null}
              <label className="mt-5 block text-xs font-bold">
                {t.location}
                <input
                  name="location"
                  defaultValue={search.location}
                  placeholder={t.locationPlaceholder}
                  className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm outline-none focus:border-[var(--pool)] focus:bg-white focus-visible:ring-2 focus-visible:ring-[var(--terracotta)]"
                />
              </label>
              <label className="mt-4 block text-xs font-bold">
                {t.bedrooms}
                <select
                  name="bedrooms"
                  defaultValue={search.bedrooms ?? ""}
                  className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm focus:border-[var(--pool)] focus:bg-white"
                >
                  <option value="">{t.any}</option>
                  {[2, 3, 4, 5, 6].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <label className="text-xs font-bold">
                  {t.min}
                  <input
                    name="minPrice"
                    type="number"
                    min="0"
                    step="500"
                    defaultValue={search.minPrice}
                    className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm focus:border-[var(--pool)] focus:bg-white"
                  />
                </label>
                <label className="text-xs font-bold">
                  {t.max}
                  <input
                    name="maxPrice"
                    type="number"
                    min="0"
                    step="500"
                    defaultValue={search.maxPrice}
                    className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm focus:border-[var(--pool)] focus:bg-white"
                  />
                </label>
              </div>
              <fieldset className="mt-5">
                <legend className="text-xs font-bold">{t.amenities}</legend>
                <div className="mt-3 max-h-64 space-y-2 overflow-y-auto overscroll-contain rounded-xl border border-[var(--line)] bg-white p-2">
                  {amenities.map((item) => (
                    <label
                      key={item._id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-[var(--paper)]"
                    >
                      <input
                        type="checkbox"
                        name="amenities"
                        value={item.slug}
                        defaultChecked={amenitySlugs.includes(item.slug)}
                        className="accent-[var(--terracotta)]"
                      />
                      {locale === "th" ? item.labelTh : item.labelEn}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="sticky bottom-0 mt-5 border-t border-[var(--line)] bg-[var(--paper)] pt-3">
                <button className="w-full rounded-xl bg-[var(--navy)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--navy-deep)] focus-visible:ring-2 focus-visible:ring-[var(--terracotta)]">{t.apply}</button>
                <Link href={`/${locale}/villas?view=all`} className="mt-3 block text-center text-xs underline">{t.clear}</Link>
              </div>
            </form>
            </details>
          </aside>
          <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold">
                  {villas.length} {villas.length === 1 ? t.result : t.results}
                </p>
                {search.checkIn && search.checkOut ? (
                  <p className="mt-1 text-xs text-[var(--soft)]">
                    {formatNumericDateRange(search.checkIn, search.checkOut)}
                    {search.guests ? ` · ${search.guests} ${locale === "th" ? "คน" : "guests"}` : ""}
                  </p>
                ) : null}
              </div>
              <form className="flex flex-wrap items-center justify-end gap-2">
                <input
                  type="hidden"
                  name="checkIn"
                  value={search.checkIn ?? ""}
                />
                <input
                  type="hidden"
                  name="checkOut"
                  value={search.checkOut ?? ""}
                />
                <input
                  type="hidden"
                  name="guests"
                  value={search.guests ?? ""}
                />
                <input type="hidden" name="location" value={search.location ?? ""} />
                <input type="hidden" name="bedrooms" value={search.bedrooms ?? ""} />
                <input type="hidden" name="minPrice" value={search.minPrice ?? ""} />
                <input type="hidden" name="maxPrice" value={search.maxPrice ?? ""} />
                {amenitySlugs.map((slug)=><input key={slug} type="hidden" name="amenities" value={slug}/>)}
                <label className="text-xs font-bold">
                  <span className="sr-only sm:not-sr-only">{t.sort}</span>{" "}
                  <select
                    name="sort"
                    defaultValue={search.sort ?? "recommended"}
                    className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm sm:ml-2"
                  >
                    <option value="recommended">{t.recommended}</option>
                    <option value="price_asc">{t.low}</option>
                    <option value="price_desc">{t.high}</option>
                    <option value="capacity">{t.capacity}</option>
                    <option value="newest">{t.newest}</option>
                  </select>
                </label>
                <button className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-bold">
                  {t.update}
                </button>
              </form>
            </div>
            {villas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white p-10 text-center">
                <h2 className="font-serif text-3xl font-semibold">
                  {t.noResults}
                </h2>
                <p className="mt-3 text-sm text-[var(--soft)]">{t.noBody}</p>
                <Link
                  href={`/${locale}/villas?view=all`}
                  className="mt-6 inline-block bg-[var(--navy)] px-5 py-3 text-sm font-bold text-white"
                >
                  {t.clear}
                </Link>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {villas.map((villa) => {
                  const name = locale === "th" ? villa.nameTh : villa.nameEn;
                  const searchedDates = Boolean(
                    search.checkIn && search.checkOut,
                  );
                  return (
                    <article
                      key={villa._id}
                    className={`group overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_30px_rgba(0,19,38,.07)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(0,19,38,.11)] ${villa.available ? "" : "opacity-65"}`}
                    >
                      <Link
                        href={`/${locale}/villas/${villa.slug}${staySuffix ? `?${staySuffix}` : ""}`}
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--paper-deep)]">
                          {villa.mainPhotoUrl ? (
                            <Image
                              src={villa.mainPhotoUrl}
                              unoptimized={shouldBypassImageOptimization(villa.mainPhotoUrl)}
                              alt={name}
                              fill
                              sizes="(min-width:1280px) 28vw, (min-width:640px) 45vw, 100vw"
                              className="object-cover transition duration-500 group-hover:scale-[1.025]"
                            />
                          ) : null}
                          {searchedDates ? (
                            <span
                              className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.1em] shadow-sm backdrop-blur ${villa.available ? "bg-white/95 text-[var(--green)]" : "bg-[var(--navy-deep)]/90 text-white"}`}
                            >
                              {villa.available ? t.available : t.unavailable}
                            </span>
                          ) : null}
                        </div>
                        <div className="p-5">
                          <h2 className="font-serif text-2xl font-semibold">
                            {name}
                          </h2>
                          <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--soft)]">
                            <span className="flex items-center gap-1">
                              <BedDouble size={14} />
                              {villa.bedrooms}
                            </span>
                            <span className="flex items-center gap-1">
                              <Bath size={14} />
                              {villa.bathrooms}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users size={14} />
                              {villa.maxGuests}
                            </span>
                          </div>
                          <p className="mt-5 border-t border-[var(--line)] pt-4 text-sm">
                            {t.from}{" "}
                            <strong className="font-price text-lg">
                              ฿{villa.weekdayPriceThb.toLocaleString()}
                            </strong>{" "}
                            / {t.night}
                          </p>
                          <span className="mt-4 block rounded-xl bg-[var(--navy)] px-4 py-3 text-center text-sm font-bold text-white transition group-hover:bg-[var(--terracotta)]">
                            {t.view}
                          </span>
                        </div>
                      </Link>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
