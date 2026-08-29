import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type Locale = "en" | "th";

const FACEBOOK_GROUP_URL = "https://www.facebook.com/groups/973604368983397";

const COPY = {
  en: {
    logoAlt: "Pool Villas in Bangsaen",
    languageLabel: "View this page in Thai",
    language: "TH",
    title: "Skip Talking to Agents and Talk Directly with Managers and Owners.",
    body: "Only villa managers and owners can advertise in our Facebook group. Connect with them directly for better service and the best price.",
    action: "Join our Facebook group",
  },
  th: {
    logoAlt: "พูลวิลล่าในบางแสน",
    languageLabel: "ดูหน้านี้เป็นภาษาอังกฤษ",
    language: "EN",
    title: "ข้ามการคุยกับนายหน้า แล้วคุยกับผู้จัดการและเจ้าของโดยตรง",
    body: "กลุ่ม Facebook ของเราอนุญาตให้เฉพาะผู้จัดการและเจ้าของวิลล่าลงประกาศเท่านั้น คุณจึงติดต่อพวกเขาได้โดยตรง เพื่อรับบริการที่ดีกว่าและราคาที่ดีที่สุด",
    action: "เข้าร่วมกลุ่ม Facebook ของเรา",
  },
} as const;

export function FacebookGroupPage({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  const languageHref = locale === "en" ? "/th/facebookgroup" : "/facebookgroup";

  return (
    <main className="paper-grain relative min-h-[100svh] overflow-hidden bg-[var(--navy-deep)] text-white">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[var(--terracotta)]" />

      <header className="relative z-10 px-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between border-b border-white/12">
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

      <div className="relative z-10 mx-auto grid min-h-[calc(100svh-5rem)] max-w-[1280px] grid-rows-2 px-5 sm:px-8 lg:px-12">
        <section className="flex items-end pb-7 pt-8 sm:pb-10 lg:pb-12" aria-labelledby="facebook-group-title">
          <div className="max-w-5xl">
            <h1
              id="facebook-group-title"
              className="max-w-4xl font-serif text-[clamp(2.25rem,6.4vw,5.8rem)] font-semibold leading-[.96] tracking-[-.025em] text-balance"
            >
              {copy.title}
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-white/65 sm:mt-6 sm:text-base sm:leading-7">
              {copy.body}
            </p>
          </div>
        </section>

        <section className="flex items-start justify-center pb-8 pt-8 sm:pt-11 lg:pt-14" aria-label={copy.action}>
          <a
            href={FACEBOOK_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-h-20 w-full max-w-[520px] items-center justify-between gap-5 rounded-2xl bg-[var(--terracotta)] px-6 py-5 text-base font-bold text-white transition-colors hover:bg-[#aa664c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--navy-deep)] sm:min-h-24 sm:px-8 sm:text-lg"
          >
            <span>{copy.action}</span>
            <span className="grid size-11 shrink-0 place-items-center rounded-full border border-white/30 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true">
              <ArrowUpRight size={21} />
            </span>
          </a>
        </section>
      </div>
    </main>
  );
}
