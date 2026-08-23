"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bath,
  BedDouble,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";

import { formatNumericDateRange } from "@/lib/date-format";
import { shouldBypassImageOptimization } from "@/lib/remote-image";

export type HomepageVilla = {
  _id: string;
  slug: string;
  nameEn: string;
  nameTh: string;
  formattedAddress?: string;
  weekdayPriceThb: number;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  mainPhotoUrl: string | null;
  amenities: Array<{
    _id: string;
    slug: string;
    labelEn: string;
    labelTh: string;
    icon?: string;
  }>;
};

type Locale = "th" | "en";

const COPY = {
  th: {
    navVillas: "พูลวิลล่าทั้งหมด",
    navCategories: "เลือกตามสไตล์",
    navWhy: "ทำไมต้องจองกับเรา",
    eyebrow: "พูลวิลล่าส่วนตัวในบางแสน",
    headline: "หาพูลวิลล่าที่ใช่ สำหรับทริปบางแสนของคุณ",
    lead: "เลือกวันเข้าพักและจำนวนผู้เข้าพัก แล้วเปรียบเทียบบ้านที่เหมาะกับกลุ่มของคุณ",
    search: "ค้นหาพูลวิลล่า",
    guests: "ผู้เข้าพัก",
    selectDates: "เลือกวันเช็กอินและเช็กเอาต์",
    selected: "วันเข้าพัก",
    clear: "ล้างวันที่",
    categoriesKicker: "เลือกตามสไตล์",
    categoriesTitle: "เลือกบ้านให้เข้ากับทริปของคุณ",
    all: "ทั้งหมด",
    categories: [
      ["near-beach", "ใกล้ชายหาด", "เดินทางไปชายหาดได้สะดวก", "/areas/bang-saen-beach.jpg"],
      ["party", "สำหรับปาร์ตี้", "คาราโอเกะ บาร์บีคิว และพื้นที่สังสรรค์", "/home-hero/06.jpg"],
      ["large", "สำหรับกลุ่มใหญ่", "พื้นที่และห้องนอนสำหรับทุกคน", "/areas/saen-suk.jpg"],
      ["family", "สำหรับครอบครัว", "สระส่วนตัว ครัว และพื้นที่สำหรับครอบครัว", "/home-hero/02.jpg"],
    ],
    whyKicker: "ข้อมูลครบก่อนเลือก",
    whyTitle: "เปรียบเทียบสิ่งสำคัญได้ในที่เดียว",
    benefits: [
      ["ดูวันว่างและราคา", "เลือกวันที่แล้วดูราคาของบ้านแต่ละหลัง"],
      ["ค้นหาตามสไตล์", "กรองตามจำนวนผู้เข้าพัก ทำเล และสิ่งอำนวยความสะดวก"],
      ["ดูรายละเอียดครบ", "เช็กรูปภาพ ห้องนอน กฎของที่พัก และทำเลก่อนเลือก"],
    ],
    villasKicker: "พูลวิลล่าในบางแสน",
    villasTitle: "เลือกบ้านสำหรับทริปของคุณ",
    results: "หลัง",
    from: "เริ่มต้น",
    night: "คืน",
    sleeps: "คน",
    view: "ดูรายละเอียด",
    more: "ดูบ้านเพิ่มเติม",
    empty: "ไม่พบบ้านในหมวดนี้",
    emptyBody: "เลือกหมวดอื่นเพื่อดูบ้านที่พร้อมให้เลือก",
    footer: "© 2026 Pool Villas in Bangsaen · Bang Saen, Chonburi",
  },
  en: {
    navVillas: "All villas",
    navCategories: "Browse by style",
    navWhy: "Why book with us",
    eyebrow: "Private pool villas in Bang Saen",
    headline: "Find the right pool villa for your Bang Saen trip",
    lead: "Choose your dates and group size, then compare villas that fit your stay.",
    search: "Find villas",
    guests: "Guests",
    selectDates: "Select check-in and check-out dates",
    selected: "Stay dates",
    clear: "Clear dates",
    categoriesKicker: "Browse by stay",
    categoriesTitle: "Choose a villa that fits your trip",
    all: "All villas",
    categories: [
      ["near-beach", "Close to the beach", "Easy access to the Bang Saen coast", "/areas/bang-saen-beach.jpg"],
      ["party", "For parties", "Karaoke, BBQs and room to celebrate", "/home-hero/06.jpg"],
      ["large", "For large groups", "More bedrooms and room for everyone", "/areas/saen-suk.jpg"],
      ["family", "For families", "Private pools, kitchens and family space", "/home-hero/02.jpg"],
    ],
    whyKicker: "Compare with confidence",
    whyTitle: "Everything you need to choose your stay",
    benefits: [
      ["See dates and prices", "Choose your dates and compare each villa's nightly rates."],
      ["Filter what matters", "Narrow the list by group size, location and amenities."],
      ["Know before you choose", "Review photos, bedrooms, house rules and location details."],
    ],
    villasKicker: "Pool villas in Bang Saen",
    villasTitle: "Choose a villa for your trip",
    results: "villas",
    from: "From",
    night: "night",
    sleeps: "guests",
    view: "View villa",
    more: "Show more villas",
    empty: "No villas match this category",
    emptyBody: "Choose another category to see more villas.",
    footer: "© 2026 Pool Villas in Bangsaen · Bang Saen, Chonburi",
  },
} as const;

function iso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateFromIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function SmallStayCalendar({
  locale,
  checkIn,
  checkOut,
  onChange,
}: {
  locale: Locale;
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
}) {
  const t = COPY[locale];
  const today = useMemo(() => iso(new Date()), []);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const suppressClick = useRef(false);

  const cells = useMemo(() => {
    const start = month.getDay();
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - start + 1;
      return day > 0 && day <= days
        ? iso(new Date(month.getFullYear(), month.getMonth(), day))
        : null;
    });
  }, [month]);

  const weekdays = locale === "th"
    ? ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
    : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const monthLabel = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(month);

  function rangeFor(date: string) {
    const start = anchor && hover ? (anchor < hover ? anchor : hover) : checkIn;
    const end = anchor && hover ? (anchor < hover ? hover : anchor) : checkOut;
    return Boolean(start && end && date >= start && date <= end);
  }

  function finish(date: string) {
    if (!anchor || date === anchor) return;
    const start = anchor < date ? anchor : date;
    const end = anchor < date ? date : anchor;
    onChange(start, end);
    setAnchor(null);
    setHover(null);
  }

  const activeStart = anchor && hover
    ? (anchor < hover ? anchor : hover)
    : checkIn;
  const activeEnd = anchor && hover
    ? (anchor < hover ? hover : anchor)
    : checkOut;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/20 bg-[#fffdfa] text-[var(--ink)] shadow-[0_22px_60px_rgba(0,14,30,.24)]">
      <div className="flex items-center justify-between px-4 pb-3 pt-4 sm:px-5">
        <button
          type="button"
          aria-label={locale === "th" ? "เดือนก่อนหน้า" : "Previous month"}
          disabled={month <= new Date(dateFromIso(today).getFullYear(), dateFromIso(today).getMonth(), 1)}
          onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))}
          className="flex size-9 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--navy)] transition hover:border-[var(--navy)] disabled:pointer-events-none disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terracotta)]"
        >
          <ChevronLeft size={15} />
        </button>
        <div className="text-center">
          <p className="font-mono text-[8px] font-bold uppercase tracking-[.18em] text-[var(--terracotta)]">
            {locale === "th" ? "เลือกวันที่เข้าพัก" : "Choose your stay"}
          </p>
          <p className="mt-0.5 font-serif text-xl font-semibold capitalize">{monthLabel}</p>
        </div>
        <button
          type="button"
          aria-label={locale === "th" ? "เดือนถัดไป" : "Next month"}
          onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))}
          className="flex size-9 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--navy)] transition hover:border-[var(--navy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terracotta)]"
        >
          <ChevronRight size={15} />
        </button>
      </div>
      <div className="mx-4 grid grid-cols-7 border-y border-[var(--line)] py-2 sm:mx-5">
        {weekdays.map((day) => (
          <span key={day} className="text-center font-mono text-[8px] font-bold uppercase tracking-[.08em] text-[var(--soft)]">
            {day}
          </span>
        ))}
      </div>
      <div
        className="grid touch-pan-y select-none grid-cols-7 px-4 py-3 sm:px-5"
        onPointerMove={(event) => {
          if (!dragging || !anchor) return;
          const target = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest<HTMLElement>("[data-home-date]");
          const date = target?.dataset.homeDate;
          if (date && date >= today) setHover(date);
        }}
        onPointerUp={() => {
          if (dragging && anchor && hover && hover !== anchor) {
            finish(hover);
            suppressClick.current = true;
          }
          setDragging(false);
        }}
        onPointerCancel={() => setDragging(false)}
      >
        {cells.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} className="min-h-11" />;
          const past = date < today;
          const selected = rangeFor(date);
          const isToday = date === today;
          const rangeShape = selected
            ? activeStart === activeEnd
              ? "rounded-xl"
              : date === activeStart
                ? "rounded-l-xl"
                : date === activeEnd
                  ? "rounded-r-xl"
                  : ""
            : "";
          return (
            <button
              key={date}
              type="button"
              data-home-date={date}
              disabled={past}
              onPointerDown={(event) => {
                if (past) return;
                event.preventDefault();
                if (!anchor || checkOut) {
                  setAnchor(date);
                  setHover(date);
                  onChange("", "");
                } else {
                  setHover(date);
                }
                setDragging(true);
              }}
              onPointerEnter={() => {
                if (dragging && anchor) setHover(date);
              }}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                if (!anchor) {
                  setAnchor(date);
                  setHover(date);
                  onChange("", "");
                } else finish(date);
              }}
              className={`relative flex min-h-11 items-center justify-center text-sm font-semibold transition-colors ${past ? "cursor-not-allowed text-[#c6bfb5]" : selected ? `bg-[var(--terracotta)] text-white ${rangeShape}` : "hover:bg-[var(--paper-deep)]"} focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--terracotta)]`}
            >
              <span className={`relative z-10 flex size-9 items-center justify-center transition ${isToday && !past && !selected ? "rounded-full ring-1 ring-inset ring-[var(--terracotta)]" : ""}`}>
                {Number(date.slice(-2))}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex min-h-12 items-center justify-between gap-3 border-t border-[var(--line)] bg-white/60 px-4 py-2.5 text-[10px] sm:px-5">
        <span className="flex items-center gap-2 text-[var(--soft)]">
          <CalendarDays size={13} className="shrink-0 text-[var(--terracotta)]" />
          {checkIn && checkOut ? `${t.selected}: ${formatNumericDateRange(checkIn, checkOut)}` : t.selectDates}
        </span>
        {checkIn || anchor ? (
          <button
            type="button"
            onClick={() => {
              onChange("", "");
              setAnchor(null);
              setHover(null);
            }}
            className="shrink-0 font-bold text-[var(--navy)] underline decoration-[var(--terracotta)] underline-offset-4"
          >
            {t.clear}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function RotatingHeroImage({ images, locale }: { images: string[]; locale: Locale }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (images.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % images.length), 6500);
    return () => window.clearInterval(timer);
  }, [images.length]);

  return (
    <div
      data-home-hero-image
      className="relative order-first min-h-[310px] overflow-hidden bg-[var(--navy-deep)] sm:min-h-[420px] lg:order-none lg:min-h-[650px]"
    >
      {images.map((src, index) => (
        <Image
          key={src}
          src={src}
          unoptimized={shouldBypassImageOptimization(src)}
          alt={locale === "th" ? "พูลวิลล่าในบางแสน" : "Pool villa in Bang Saen"}
          fill
          priority={index === 0}
          sizes="(min-width:1024px) 50vw, 100vw"
          className={`object-cover transition-opacity duration-1000 ${index === active ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy-deep)]/45 via-transparent to-black/45" />
      <div className="absolute bottom-5 right-5 flex gap-1.5">
        {images.map((src, index) => (
          <button
            key={src}
            type="button"
            aria-label={`Show image ${index + 1}`}
            onClick={() => setActive(index)}
            className={`h-1.5 transition-all ${index === active ? "w-8 bg-white" : "w-3 bg-white/45"}`}
          />
        ))}
      </div>
    </div>
  );
}

function villaMatchesCategory(villa: HomepageVilla, category: string | null) {
  if (!category) return true;
  const slugs = new Set(villa.amenities.map((amenity) => amenity.slug));
  const location = (villa.formattedAddress ?? "").toLowerCase();
  if (category === "near-beach") return slugs.has("beachfront") || location.includes("beach") || location.includes("หาด");
  if (category === "party") return slugs.has("karaoke") || slugs.has("bbq") || slugs.has("games");
  if (category === "large") return villa.maxGuests >= 15;
  if (category === "family") return slugs.has("private-pool") || slugs.has("kitchen");
  return true;
}

export function HomepageExperience({
  locale,
  villas,
}: {
  locale: Locale;
  villas: HomepageVilla[];
}) {
  const t = COPY[locale];
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [category, setCategory] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const filtered = useMemo(
    () => villas.filter((villa) => villaMatchesCategory(villa, category)),
    [villas, category],
  );
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const showMore = useCallback(() => {
    setVisibleCount((count) => Math.min(count + 6, filtered.length));
  }, [filtered.length]);

  useEffect(() => {
    setVisibleCount(6);
  }, [category]);

  useEffect(() => {
    if (!hasMore || !sentinel.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) showMore();
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [hasMore, showMore]);

  const heroImages = useMemo(() => {
    const villaImages = villas.map((villa) => villa.mainPhotoUrl).filter((url): url is string => Boolean(url));
    return Array.from(new Set([...villaImages, "/home-hero/01.jpg", "/home-hero/06.jpg"])) .slice(0, 5);
  }, [villas]);

  const searchQuery = new URLSearchParams();
  if (checkIn && checkOut) {
    searchQuery.set("checkIn", checkIn);
    searchQuery.set("checkOut", checkOut);
  }
  searchQuery.set("guests", String(guests));

  return (
    <main className="min-h-screen overflow-x-clip bg-[var(--paper)]">
      <header className="relative bg-[var(--navy-deep)] text-white">
        <nav className="absolute inset-x-0 top-0 z-20 mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:grid lg:grid-cols-2 lg:px-12">
          <div className="flex min-w-0 flex-1 items-center justify-between lg:pr-12">
            <Link href={`/${locale}`} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--peach)]">
              <Image src="/brand-logo-white.png" alt={locale === "th" ? "พูลวิลล่าในบางแสน" : "Pool Villas in Bangsaen"} width={220} height={44} className="h-7 w-auto sm:h-8" />
            </Link>
            <Link href={`/${locale}/villas`} className="text-[11px] font-semibold hover:text-[var(--peach)] sm:text-xs">{t.search}</Link>
          </div>
          <Link href={`/${locale === "th" ? "en" : "th"}`} className="ml-5 text-xs font-bold hover:text-[var(--peach)] lg:ml-0 lg:justify-self-end">
            {locale === "th" ? "EN" : "TH"}
          </Link>
        </nav>
        <div className="grid w-full lg:grid-cols-2">
          <div className="flex min-w-0 items-center pb-10 pt-10 sm:pb-12 sm:pt-12 lg:pb-14 lg:pt-32">
            <div className="ml-auto w-full max-w-[720px] px-5 sm:px-8 lg:px-12">
              <div className="w-full max-w-[580px]">
              <p className="font-mono text-[10px] uppercase tracking-[.19em] text-[var(--peach)]">{t.eyebrow}</p>
              <h1 className="mt-3 max-w-xl font-serif text-3xl font-semibold leading-[1.04] sm:text-4xl lg:text-[2.9rem]">
                {t.headline}
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-white/65">{t.lead}</p>
              <div className="mt-7 max-w-[540px]">
                <SmallStayCalendar
                  locale={locale}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onChange={(start, end) => {
                    setCheckIn(start);
                    setCheckOut(end);
                  }}
                />
                <div className="mt-3 grid overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_16px_40px_rgba(0,14,30,.18)] sm:grid-cols-[1fr_auto]">
                  <div className="flex min-h-14 items-center justify-between bg-[#122136] px-4">
                    <span className="flex items-center gap-2.5 text-xs font-semibold"><Users size={16} className="text-[var(--peach)]" />{t.guests}</span>
                    <div className="flex items-center gap-3">
                      <button type="button" aria-label={locale === "th" ? "ลดจำนวนผู้เข้าพัก" : "Decrease guests"} disabled={guests <= 1} onClick={() => setGuests((value) => Math.max(1, value - 1))} className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/5 transition hover:bg-white/10 disabled:opacity-30"><Minus size={13} /></button>
                      <span className="w-5 text-center text-sm font-bold tabular-nums">{guests}</span>
                      <button type="button" aria-label={locale === "th" ? "เพิ่มจำนวนผู้เข้าพัก" : "Increase guests"} disabled={guests >= 40} onClick={() => setGuests((value) => Math.min(40, value + 1))} className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/5 transition hover:bg-white/10 disabled:opacity-30"><Plus size={13} /></button>
                    </div>
                  </div>
                  <Link
                    href={`/${locale}/villas?${searchQuery.toString()}`}
                    className={`flex min-h-14 items-center justify-center gap-2 px-6 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${checkIn && checkOut ? "bg-[var(--terracotta)] text-white hover:bg-[#aa664c]" : "bg-white text-[var(--navy)] hover:bg-[var(--paper-deep)]"}`}
                  >
                    <Search size={16} />
                    <span>{t.search}</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
          </div>
          <RotatingHeroImage images={heroImages} locale={locale} />
        </div>
      </header>

      <section id="categories" className="border-b border-[var(--line)] bg-white px-5 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1280px]">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[var(--terracotta)]">{t.categoriesKicker}</p>
              <h2 className="mt-2 max-w-2xl font-serif text-3xl font-semibold sm:text-4xl">{t.categoriesTitle}</h2>
            </div>
            {category ? <button type="button" onClick={() => setCategory(null)} className="self-start text-xs font-bold underline sm:self-auto">{t.all}</button> : null}
          </div>
          <div className="mt-7 grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
            {t.categories.map(([id, title, body, image]) => (
              <button
                key={id}
                type="button"
                aria-pressed={category === id}
                onClick={() => {
                  setCategory(category === id ? null : id);
                  document.querySelector("#all-villas")?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`group relative aspect-[4/3] overflow-hidden rounded-2xl text-left shadow-[0_12px_30px_rgba(0,19,38,.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terracotta)] ${category === id ? "ring-2 ring-[var(--terracotta)] ring-offset-2" : ""}`}
              >
                <Image src={image} alt="" fill unoptimized={shouldBypassImageOptimization(image)} sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition duration-500 group-hover:scale-[1.035]" />
                <span className="absolute inset-0 bg-gradient-to-t from-[var(--navy-deep)] via-[var(--navy-deep)]/10 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                  <strong className="block font-serif text-xl sm:text-2xl">{title}</strong>
                  <span className="mt-1 hidden text-xs leading-5 text-white/70 sm:block">{body}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="why-us" className="border-b border-[var(--line)] px-5 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1280px]">
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[var(--terracotta)]">{t.whyKicker}</p>
          <h2 className="mt-2 max-w-2xl font-serif text-3xl font-semibold sm:text-4xl">{t.whyTitle}</h2>
          <div className="mt-7 grid overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_14px_36px_rgba(0,19,38,.06)] md:grid-cols-3 md:divide-x md:divide-[var(--line)]">
            {t.benefits.map(([title, body], index) => {
              const Icon = [CalendarDays, SlidersHorizontal, ListChecks][index];
              return (
                <article key={title} className="border-b border-[var(--line)] p-5 last:border-b-0 md:border-b-0 sm:p-6">
                  <Icon size={22} strokeWidth={1.7} className="text-[var(--terracotta)]" />
                  <h3 className="mt-4 font-serif text-xl font-semibold">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-[var(--soft)]">{body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="all-villas" className="px-5 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1280px]">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[var(--terracotta)]">{t.villasKicker}</p>
              <h2 className="mt-2 max-w-2xl font-serif text-3xl font-semibold sm:text-4xl">{t.villasTitle}</h2>
            </div>
            <p className="text-xs font-bold text-[var(--soft)]">{filtered.length} {t.results}</p>
          </div>

          {visible.length > 0 ? (
            <div className="mt-8 grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((villa) => {
                const name = locale === "th" ? villa.nameTh : villa.nameEn;
                return (
                  <article key={villa._id} className="group min-w-0">
                    <Link href={`/${locale}/villas/${villa.slug}`} className="block overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_30px_rgba(0,19,38,.07)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(0,19,38,.11)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terracotta)]">
                      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--paper-deep)]">
                        {villa.mainPhotoUrl ? (
                          <Image src={villa.mainPhotoUrl} alt={name} fill unoptimized={shouldBypassImageOptimization(villa.mainPhotoUrl)} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.025]" />
                        ) : null}
                      </div>
                      <div className="bg-white p-4">
                        <h3 className="truncate font-serif text-2xl font-semibold">{name}</h3>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[var(--soft)]">
                          <span className="flex items-center gap-1"><BedDouble size={13} />{villa.bedrooms}</span>
                          <span className="flex items-center gap-1"><Bath size={13} />{villa.bathrooms}</span>
                          <span className="flex items-center gap-1"><Users size={13} />{villa.maxGuests} {t.sleeps}</span>
                        </div>
                        <div className="mt-4 flex items-end justify-between gap-3">
                          <p className="text-[10px] text-[var(--soft)]">{t.from}<br /><strong className="font-price text-lg text-[var(--ink)]">฿{villa.weekdayPriceThb.toLocaleString()}</strong> / {t.night}</p>
                          <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--navy)] group-hover:text-[var(--terracotta)]">{t.view}<ArrowRight size={13} /></span>
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 border border-dashed border-[var(--line)] bg-white px-6 py-14 text-center">
              <h3 className="font-serif text-2xl font-semibold">{t.empty}</h3>
              <p className="mt-2 text-sm text-[var(--soft)]">{t.emptyBody}</p>
              <button type="button" onClick={() => setCategory(null)} className="mt-5 bg-[var(--navy)] px-5 py-3 text-xs font-bold text-white">{t.all}</button>
            </div>
          )}

          <div ref={sentinel} className="mt-9 flex min-h-12 items-center justify-center text-xs text-[var(--soft)]" aria-live="polite">
            {hasMore ? (
              <button type="button" onClick={showMore} className="flex items-center gap-2 font-bold hover:text-[var(--navy)]"><span className="size-2 animate-pulse rounded-full bg-[var(--terracotta)]" />{t.more}</button>
            ) : null}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/12 bg-[var(--navy-deep)] px-5 pb-20 pt-8 text-white sm:px-8 sm:py-8 lg:px-12">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <Image src="/brand-logo-white.png" alt={locale === "th" ? "พูลวิลล่าในบางแสน" : "Pool Villas in Bangsaen"} width={220} height={44} className="h-auto w-[170px] shrink-0 sm:w-[190px]" />
          <p className="max-w-xl px-4 text-[11px] leading-5 text-white/55 sm:px-0 sm:text-xs">{t.footer}</p>
        </div>
      </footer>
    </main>
  );
}
