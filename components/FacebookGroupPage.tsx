import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { fetchQuery } from "convex/nextjs";

import { LineContactButton } from "@/components/LineContactButton";
import { api } from "@/convex/_generated/api";
import { lineContactUrl } from "@/convex/lib/line";

type Locale = "en" | "th";

const FACEBOOK_GROUP_URL = "https://www.facebook.com/groups/973604368983397";

const COPY = {
  en: {
    logoAlt: "Pool Villas in Bangsaen",
    languageLabel: "View this page in Thai",
    language: "TH",
    title: "Skip Talking to Agents and Talk Directly with Managers and Owners.",
    body: "Only villa managers and owners can advertise in our Facebook group. Connect with them directly for better service and the best price.",
    imageAlt: "Private pool villa in Bang Saen",
    imageLabel: "Pool villa in Bang Saen",
    action: "Join our Facebook group",
    viewVillas: "View pool villas",
  },
  th: {
    logoAlt: "พูลวิลล่าในบางแสน",
    languageLabel: "ดูหน้านี้เป็นภาษาอังกฤษ",
    language: "EN",
    title: "ข้ามการคุยกับนายหน้า แล้วคุยกับผู้จัดการและเจ้าของโดยตรง",
    body: "กลุ่ม Facebook ของเราอนุญาตให้เฉพาะผู้จัดการและเจ้าของวิลล่าลงประกาศเท่านั้น คุณจึงติดต่อพวกเขาได้โดยตรง เพื่อรับบริการที่ดีกว่าและราคาที่ดีที่สุด",
    imageAlt: "พูลวิลล่าส่วนตัวในบางแสน",
    imageLabel: "พูลวิลล่าในบางแสน",
    action: "เข้าร่วมกลุ่ม Facebook ของเรา",
    viewVillas: "ดูพูลวิลล่า",
  },
} as const;

export async function FacebookGroupPage({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  const languageHref = locale === "en" ? "/th/facebookgroup" : "/facebookgroup";
  const settings = await fetchQuery(api.settings.getPublic, {}).catch(() => null);
  const lineUrl = lineContactUrl(settings?.lineId ?? "");

  return (
    <>
      <main className="relative grid min-h-[100svh] grid-rows-2 overflow-hidden bg-[var(--navy-deep)] text-white">
        <section className="relative flex items-center justify-center px-5 pb-14 pt-20 text-center sm:px-8 sm:pb-16 lg:px-12">
          <header className="absolute inset-x-0 top-0 z-10 px-5 sm:px-8 lg:px-12">
            <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between">
              <Link
                href={`/${locale}`}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--peach)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--navy-deep)]"
              >
                <Image
                  src="/brand-logo-white.png"
                  alt={copy.logoAlt}
                  width={220}
                  height={44}
                  className="h-7 w-auto sm:h-8"
                  priority
                />
              </Link>
              <Link
                href={languageHref}
                aria-label={copy.languageLabel}
                className="flex min-h-11 min-w-11 items-center justify-center text-xs font-bold transition-colors hover:text-[var(--peach)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--peach)]"
              >
                {copy.language}
              </Link>
            </div>
          </header>

          <div className="mx-auto max-w-5xl">
            <h1
              id="facebook-group-title"
              className="mx-auto max-w-5xl font-serif text-4xl font-semibold leading-[.98] tracking-[-.02em] text-balance sm:text-5xl lg:text-6xl"
            >
              {copy.title}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/65 sm:mt-5 sm:text-base sm:leading-7">
              {copy.body}
            </p>
          </div>
        </section>

        <section className="relative" aria-label={copy.imageLabel}>
          <Image
            src="/home-hero/03.jpg"
            alt={copy.imageAlt}
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-[var(--navy-deep)]/10" aria-hidden="true" />
        </section>

        <div className="absolute left-1/2 top-1/2 z-20 w-[calc(100%_-_2.5rem)] max-w-[520px] -translate-x-1/2 -translate-y-1/2">
          <a
            href={FACEBOOK_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-h-20 w-full items-center justify-between gap-5 rounded-2xl bg-[var(--terracotta)] px-6 py-5 text-base font-bold text-white shadow-[0_16px_40px_rgba(0,19,38,.28)] transition-colors hover:bg-[#aa664c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--navy-deep)] sm:min-h-24 sm:px-8 sm:text-lg"
          >
            <span>{copy.action}</span>
            <span className="grid size-11 shrink-0 place-items-center rounded-full border border-white/30 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true">
              <ArrowUpRight size={21} />
            </span>
          </a>
          <Link
            href="/th/villas"
            className="absolute left-0 top-full mt-3 flex h-full min-h-20 w-full items-center justify-center rounded-2xl border-2 border-white bg-[var(--navy-deep)]/35 px-6 py-5 text-base font-bold text-white transition-colors hover:bg-[var(--navy-deep)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--navy-deep)] sm:min-h-24 sm:px-8 sm:text-lg"
          >
            {copy.viewVillas}
          </Link>
        </div>
      </main>
      {lineUrl ? <LineContactButton href={lineUrl} locale={locale} /> : null}
    </>
  );
}
