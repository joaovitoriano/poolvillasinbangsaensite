import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import {
  Bath,
  BedDouble,
  Car,
  Clock,
  ExternalLink,
  MapPin,
  Users,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { ResponsiveImage } from "@/components/ResponsiveImage";
import { VillaBookingCalendar } from "@/components/VillaBookingCalendar";
import { VillaGallery } from "@/components/VillaGallery";
import { LegalLinks } from "@/components/LegalLinks";
import { AmenityIcon } from "@/lib/amenities";
import { HouseRuleIcon } from "@/lib/house-rules";
import { googleMapsEmbedUrl, googleMapsListingUrl } from "@/lib/google-maps";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string; guests?: string }>;
};

const bedLabels = {
  single: { en: "single bed", th: "เตียงเดี่ยว" },
  double: { en: "double bed", th: "เตียงคู่" },
  queen: { en: "queen bed", th: "เตียงควีน" },
  king: { en: "king bed", th: "เตียงคิง" },
  bunk: { en: "bunk bed", th: "เตียงสองชั้น" },
  sofa_bed: { en: "sofa bed", th: "โซฟาเบด" },
  floor_mattress: { en: "floor mattress", th: "ฟูกปูพื้น" },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (locale !== "en" && locale !== "th") return {};
  const villa = await fetchQuery(api.villas.getBySlug, { slug, locale });
  if (!villa) return {};
  const name = locale === "th" ? villa.nameTh : villa.nameEn;
  const description = locale === "th" ? villa.descriptionTh : villa.descriptionEn;
  return {
    title: `${name} | Pool Villas in Bangsaen`,
    description,
    alternates: {
      languages: { en: `/en/villas/${slug}`, th: `/th/villas/${slug}` },
    },
    openGraph: {
      title: name,
      description,
      images: villa.photos[0]?.url ? [villa.photos[0].url] : [],
    },
  };
}

export default async function VillaPage({ params, searchParams }: Props) {
  const [{ locale, slug }, search] = await Promise.all([params, searchParams]);
  if (locale !== "en" && locale !== "th") notFound();
  const villa = await fetchQuery(api.villas.getBySlug, { slug, locale });
  if (!villa) notFound();
  const th = locale === "th";
  const stayParams = new URLSearchParams();
  if (search.checkIn) stayParams.set("checkIn", search.checkIn);
  if (search.checkOut) stayParams.set("checkOut", search.checkOut);
  if (search.guests) stayParams.set("guests", search.guests);
  const staySuffix = stayParams.toString();
  const stayQuery = staySuffix ? `?${staySuffix}` : "";
  const villaListParams = new URLSearchParams({ view: "all" });
  if (search.checkIn) villaListParams.set("checkIn", search.checkIn);
  if (search.checkOut) villaListParams.set("checkOut", search.checkOut);
  if (search.guests) villaListParams.set("guests", search.guests);
  const guestCount = search.guests && /^(?:[1-9]|[1-3]\d|40)$/.test(search.guests)
    ? Number(search.guests)
    : undefined;
  const name = th ? villa.nameTh : villa.nameEn;
  const description = th ? villa.descriptionTh : villa.descriptionEn;
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapSrc = mapsApiKey ? googleMapsEmbedUrl({ apiKey: mapsApiKey, latitude: villa.latitude, longitude: villa.longitude, locale }) : null;
  const googleMapsHref = googleMapsListingUrl({ latitude: villa.latitude, longitude: villa.longitude });
  const t = th
    ? {
        all: "วิลล่าทั้งหมด",
        from: "ราคาเริ่มต้น",
        night: "คืน",
        details: "รายละเอียดที่พัก",
        bedrooms: "ห้องนอน",
        bathrooms: "ห้องน้ำ",
        guests: "ผู้เข้าพักสูงสุด",
        parking: "ที่จอดรถ",
        checkin: "เช็กอิน",
        checkout: "เช็กเอาต์",
        amenities: "สิ่งอำนวยความสะดวก",
        sleeping: "การจัดเตียง",
        rules: "กฎของที่พัก",
        deposit: "เงินประกัน",
        cancellation: "เงื่อนไขการยกเลิก",
        location: "ตำแหน่ง",
        address: "ที่อยู่",
        related: "วิลล่าที่คุณอาจชอบ",
        view: "ดูวิลล่า",
        footer: "© 2026 Pool Villas in Bangsaen · Bang Saen, Chonburi",
      }
    : {
        all: "All villas",
        from: "From",
        night: "night",
        details: "Property details",
        bedrooms: "Bedrooms",
        bathrooms: "Bathrooms",
        guests: "Maximum guests",
        parking: "Parking",
        checkin: "Check-in",
        checkout: "Check-out",
        amenities: "Amenities",
        sleeping: "Sleeping arrangements",
        rules: "House rules",
        deposit: "Deposit",
        cancellation: "Cancellation information",
        location: "Location",
        address: "Address",
        related: "You may also like",
        view: "View villa",
        footer: "© 2026 Pool Villas in Bangsaen · Bang Saen, Chonburi",
      };
  return (
    <main className="min-h-screen overflow-x-clip bg-[var(--paper)]">
      <header className="bg-[var(--navy-deep)] px-5 text-white sm:px-8 lg:px-12">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between">
          <Link href={`/${locale}`}>
            <Image
              src="/brand-logo-white.png"
              alt={locale === "th" ? "พูลวิลล่าในบางแสน" : "Pool Villas in Bangsaen"}
              width={220}
              height={44}
              className="h-7 w-auto sm:h-8"
            />
          </Link>
          <div className="flex gap-5 text-xs font-bold">
            <Link href={`/${locale}/villas?${villaListParams.toString()}`}>← {t.all}</Link>
            <Link href={`/${th ? "en" : "th"}/villas/${slug}${stayQuery}`}>
              {th ? "EN" : "TH"}
            </Link>
          </div>
        </div>
      </header>
      <VillaGallery photos={villa.photos} locale={locale} villaName={name} />
      <section className="px-5 pb-6 pt-10 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1120px]">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="font-serif text-4xl font-semibold leading-[1.02] sm:text-6xl sm:leading-none">
                {name}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--soft)]">
                {description}
              </p>
            </div>
            <p className="text-sm lg:text-right">
              {t.from}
              <br />
              <strong className="font-price text-4xl font-semibold">
                ฿{villa.weekdayPriceThb.toLocaleString()}
              </strong>{" "}
              / {t.night}
            </p>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-[var(--line)] pt-5 text-sm">
            <span className="flex items-center gap-2">
              <BedDouble size={17} />
              <b>{villa.bedrooms}</b> {t.bedrooms}
            </span>
            <span className="flex items-center gap-2">
              <Bath size={17} />
              <b>{villa.bathrooms}</b> {t.bathrooms}
            </span>
            <span className="flex items-center gap-2">
              <Users size={17} />
              <b>{villa.maxGuests}</b> {t.guests}
            </span>
            <span className="flex items-center gap-2">
              <Car size={17} />
              <b>{villa.parkingSpaces}</b> {t.parking}
            </span>
            <a
              href="#availability"
              className="w-full rounded-xl bg-[var(--terracotta)] px-5 py-3 text-center font-bold text-white transition hover:bg-[#aa664c] sm:ml-auto sm:w-auto sm:py-2.5"
            >
              {th ? "เลือกวันที่" : "Choose dates"}
            </a>
          </div>
        </div>
      </section>
      <section className="border-y border-[var(--line)] bg-[#f3f7f6] px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,.85fr)] lg:items-start">
          <VillaBookingCalendar
            villaId={villa._id}
            locale={locale}
            weekdayPriceThb={villa.weekdayPriceThb}
            weekendPriceThb={villa.weekendPriceThb}
            rates={villa.rates}
            unavailable={villa.unavailable}
            initialCheckIn={search.checkIn}
            initialCheckOut={search.checkOut}
            initialGuests={guestCount}
            embedded
          />
          <article className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <div className="grid gap-8">
            <section>
              <h2 className="font-serif text-3xl font-semibold">
                {t.amenities}
              </h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {villa.amenities.map((item) => (
                  <li
                    key={item._id}
                    className="flex min-h-10 items-center gap-3 text-sm"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center text-[var(--navy)]">
                      <AmenityIcon
                        slug={item.slug}
                        icon={item.icon}
                        size={21}
                      />
                    </span>
                    <span className="min-w-0 break-words">
                      {th ? item.labelTh : item.labelEn}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="font-serif text-3xl font-semibold">{t.rules}</h2>
              <ul className="mt-4 space-y-2.5">
                {villa.rules.map((rule) => (
                  <li key={rule._id} className="flex gap-3 text-sm">
                    <span className="flex size-7 shrink-0 items-center justify-center text-[var(--terracotta)]">
                      <HouseRuleIcon icon={rule.icon ?? "other"} size={20} />
                    </span>
                    <span className="min-w-0 break-words">{th ? rule.textTh : rule.textEn}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <section className="mt-10">
              <h2 className="font-serif text-3xl font-semibold">{t.sleeping}</h2>
              <ul className="mt-4 grid gap-px overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
                {villa.sleeping.map((room) => (
                  <li key={room._id} className="bg-white px-4 py-3 text-sm">
                    <b>{th ? `ห้องนอน ${room.bedroomNumber}` : `Bedroom ${room.bedroomNumber}`}</b>
                    <br />
                    <span className="text-[var(--soft)]">
                      {room.beds.map((bed) => bedLabels[bed][th ? "th" : "en"]).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
          </section>
            <section className="mt-10 grid gap-8 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(0,19,38,.06)] sm:grid-cols-2 sm:gap-10 sm:p-6 lg:grid-cols-1 lg:gap-6 xl:grid-cols-2">
              <div>
                <h2 className="text-sm font-bold">{t.details}</h2>
                <div className="mt-2.5 space-y-2">
                  <p className="flex items-center gap-2 text-sm">
                    <Clock size={15} />
                    {t.checkin}: {villa.checkInTime}
                  </p>
                  <p className="flex items-center gap-2 text-sm">
                    <Clock size={15} />
                    {t.checkout}: {villa.checkOutTime}
                  </p>
                  {villa.securityDepositThb ? (
                    <p className="pt-2 text-sm">
                      <b>{t.deposit}:</b>{" "}
                      <span className="font-price">฿{villa.securityDepositThb.toLocaleString()}</span>
                    </p>
                  ) : null}
                </div>
              </div>
              <div>
                <h2 className="text-sm font-bold">{t.cancellation}</h2>
                <p className="mt-2.5 text-sm leading-6 text-[var(--soft)]">
                  {th
                    ? "เงื่อนไขการยกเลิกจะได้รับการยืนยันโดยตรงจากเจ้าของก่อนตอบรับการจอง"
                    : "Cancellation terms are confirmed directly by the owner before a booking is accepted."}
                </p>
              </div>
            </section>
          </article>
        </div>
      </section>
      {villa.formattedAddress && googleMapsHref ? <section className="border-b border-[var(--line)] bg-[#e8efed] px-5 py-12 sm:px-8 sm:py-14 lg:px-12">
        <article className="mx-auto max-w-[1120px]">
          <h2 className="font-serif text-3xl font-semibold sm:text-4xl">{t.location}</h2>
          <a href={googleMapsHref} target="_blank" rel="noreferrer" aria-label={`${t.address}: ${villa.formattedAddress}`} className="mt-2 inline-flex max-w-3xl items-start gap-2 text-sm font-semibold leading-6 text-[var(--navy)] transition hover:text-[var(--terracotta)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terracotta)]"><MapPin size={17} className="mt-1 shrink-0" aria-hidden="true" /><span>{villa.formattedAddress}</span><ExternalLink size={14} className="mt-1.5 shrink-0" aria-hidden="true" /></a>
          {mapSrc ? <div className="mt-5 min-h-80 overflow-hidden rounded-2xl border border-[#cbd6d2] bg-[#dbe4e1] lg:min-h-[430px]">
            <iframe title={`${t.location}: ${name}`} src={mapSrc} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" className="h-80 w-full border-0 sm:h-96 lg:h-[430px]" allowFullScreen />
          </div> : null}
        </article>
      </section> : null}
          {villa.related.length ? (
            <section className="px-5 py-10 sm:px-8 sm:py-12 lg:px-12">
              <div className="mx-auto max-w-[1120px]">
              <h2 className="font-serif text-3xl font-semibold">{t.related}</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {villa.related.map((item) => {
                  const relatedName = th ? item.nameTh : item.nameEn;
                  return (
                    <Link
                      key={item._id}
                      href={`/${locale}/villas/${item.slug}${stayQuery}`}
                      className="group overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_30px_rgba(0,19,38,.07)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(0,19,38,.11)]"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--paper-deep)]">
                        {item.mainPhoto ? (
                          <ResponsiveImage
                            photo={item.mainPhoto}
                            alt={relatedName}
                            sizes="(min-width: 1024px) 357px, (min-width: 640px) calc(50vw - 44px), calc(100vw - 40px)"
                            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                          />
                        ) : null}
                      </div>
                      <div className="p-4">
                        <h3 className="font-serif text-2xl font-semibold">
                          {relatedName}
                        </h3>
                        <p className="mt-2 text-xs text-[var(--soft)]">
                          <span className="font-price">฿{item.weekdayPriceThb.toLocaleString()}</span> / {t.night}
                        </p>
                        <span className="mt-4 inline-flex text-xs font-bold text-[var(--terracotta)]">
                          {t.view} →
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              </div>
            </section>
          ) : null}
      <footer className="border-t border-white/12 bg-[var(--navy-deep)] px-5 pb-20 pt-8 text-white sm:px-8 sm:py-8 lg:px-12">
        <div className="mx-auto flex max-w-[1120px] flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <Image
            src="/brand-logo-white.png"
            alt={th ? "พูลวิลล่าในบางแสน" : "Pool Villas in Bangsaen"}
            width={220}
            height={44}
            className="h-auto w-[170px] shrink-0 sm:w-[190px]"
          />
          <p className="max-w-xl px-4 text-[11px] leading-5 text-white/55 sm:px-0 sm:text-xs">
            {t.footer}
          </p>
        </div>
        <div className="mx-auto mt-4 max-w-[1120px] sm:pr-16"><LegalLinks locale={locale} /></div>
      </footer>
    </main>
  );
}
