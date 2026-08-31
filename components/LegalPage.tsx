import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LegalLinks } from "@/components/LegalLinks";
import { LEGAL_CONTACT_URL, LEGAL_UPDATED_AT, legalContent, type LegalDocument, type LegalLocale } from "@/lib/legal-content";

export function legalMetadata(document: LegalDocument, locale: LegalLocale): Metadata {
  const copy = legalContent[document][locale];
  return {
    title: `${copy.title} | ${locale === "th" ? "พูลวิลล่าในบางแสน" : "Pool Villas in Bangsaen"}`,
    description: copy.description,
    alternates: {
      canonical: `/${locale}/${document}`,
      languages: { en: `/en/${document}`, th: `/th/${document}` },
    },
  };
}

export function LegalPage({ document, locale }: { document: LegalDocument; locale: LegalLocale }) {
  const copy = legalContent[document][locale];
  const th = locale === "th";
  const contactDescription = document === "privacy-policy"
    ? (th ? "หากมีคำถามเกี่ยวกับความเป็นส่วนตัวหรือต้องการใช้สิทธิเกี่ยวกับข้อมูลส่วนบุคคล โปรดติดต่อ Kanokkorn Mungsakorn ผู้ดำเนินการพูลวิลล่าในบางแสน ผ่าน LINE" : "For privacy questions or requests about your personal information, contact Kanokkorn Mungsakorn, operator of Pool Villas in Bangsaen, through LINE.")
    : (th ? "หากมีคำถามเกี่ยวกับข้อกำหนดนี้หรือการใช้เว็บไซต์ โปรดติดต่อ Kanokkorn Mungsakorn ผู้ดำเนินการพูลวิลล่าในบางแสน ผ่าน LINE" : "For questions about these terms or using the website, contact Kanokkorn Mungsakorn, operator of Pool Villas in Bangsaen, through LINE.");
  const linkClass = "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--peach)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--navy-deep)]";

  return (
    <div lang={locale} className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="bg-[var(--navy-deep)] px-5 text-white sm:px-8">
        <div className="mx-auto flex min-h-20 max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
          <Link href={`/${locale}`} className={`inline-flex min-h-11 items-center ${linkClass}`}>
            <Image src="/brand-logo-white.png" alt={th ? "พูลวิลล่าในบางแสน" : "Pool Villas in Bangsaen"} width={220} height={44} className="h-auto w-[150px] sm:w-[190px]" />
          </Link>
          <nav aria-label={th ? "เมนูหลัก" : "Main navigation"} className="flex items-center gap-4 text-sm">
            <Link href={`/${locale}`} className={`inline-flex min-h-11 items-center transition-colors hover:text-[var(--peach)] ${linkClass}`}>{th ? "หน้าแรก" : "Home"}</Link>
            <a href={`/${th ? "en" : "th"}/${document}`} hrefLang={th ? "en" : "th"} aria-label={th ? "ดูหน้านี้เป็นภาษาอังกฤษ" : "View this page in Thai"} className={`inline-flex min-h-11 min-w-11 items-center justify-center font-bold transition-colors hover:text-[var(--peach)] ${linkClass}`}>{th ? "EN" : "TH"}</a>
          </nav>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <article>
          <h1 className="font-serif text-4xl font-semibold leading-tight text-[var(--navy)] sm:text-5xl">{copy.title}</h1>
          <p className="mt-4 text-sm text-[var(--soft)]">
            {th ? "ปรับปรุงล่าสุด: " : "Last updated: "}<time dateTime={LEGAL_UPDATED_AT}>{th ? "31 สิงหาคม 2569" : "31 August 2026"}</time>
          </p>
          <p className="mt-6 text-base leading-8">{copy.description}</p>
          <nav aria-label={th ? "สารบัญ" : "On this page"} className="mt-8 border-y border-[var(--line)] py-5">
            <p className="text-sm font-semibold text-[var(--navy)]">{th ? "สารบัญ" : "On this page"}</p>
            <ol className="mt-3 grid gap-x-6 sm:grid-cols-2">
              {copy.sections.map((section, index) => <li key={section.title}><a href={`#section-${index + 1}`} className="inline-flex min-h-11 items-center py-2 text-sm leading-6 text-[var(--pool)] underline decoration-current/30 underline-offset-4 hover:text-[var(--navy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terracotta)]">{section.title}</a></li>)}
              <li><a href="#contact" className="inline-flex min-h-11 items-center py-2 text-sm leading-6 text-[var(--pool)] underline decoration-current/30 underline-offset-4 hover:text-[var(--navy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terracotta)]">{th ? "ติดต่อเรา" : "Contact us"}</a></li>
            </ol>
          </nav>
          <div className="mt-10 space-y-9">
            {copy.sections.map((section, index) => (
              <section key={section.title} id={`section-${index + 1}`} className="scroll-mt-6">
                <h2 className="text-xl font-semibold leading-8 text-[var(--navy)]">{section.title}</h2>
                <div className="mt-3 space-y-4 text-base leading-8 [overflow-wrap:anywhere]">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.links ? <ul className="space-y-1">{section.links.map((link) => (
                    <li key={link.href}><a href={link.href} className="inline-block py-2 text-[var(--pool)] underline underline-offset-4 hover:text-[var(--navy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terracotta)] focus-visible:ring-offset-2">{link.label}</a></li>
                  ))}</ul> : null}
                </div>
              </section>
            ))}
            <section id="contact" className="scroll-mt-6 border-t border-[var(--line)] pt-8">
              <h2 className="text-xl font-semibold text-[var(--navy)]">{th ? "ติดต่อเรา" : "Contact us"}</h2>
              <p className="mt-3 text-base leading-8">{contactDescription}</p>
              <a href={LEGAL_CONTACT_URL} className="mt-3 inline-flex min-h-11 items-center py-2 font-semibold text-[var(--pool)] underline underline-offset-4 hover:text-[var(--navy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terracotta)] focus-visible:ring-offset-2">LINE: @kanokpool</a>
            </section>
          </div>
        </article>
      </main>
      <footer className="bg-[var(--navy-deep)] px-5 pb-24 pt-6 text-white sm:px-8 sm:pb-8">
        <div className="mx-auto max-w-5xl sm:pr-16"><LegalLinks locale={locale} /></div>
      </footer>
    </div>
  );
}
