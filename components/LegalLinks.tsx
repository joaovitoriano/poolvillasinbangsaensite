import Link from "next/link";

export function LegalLinks({ locale }: { locale: "en" | "th" }) {
  const th = locale === "th";
  return (
    <nav lang={locale} aria-label={th ? "ข้อมูลทางกฎหมาย" : "Legal information"} className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
      <Link href={`/${locale}/privacy-policy`} className="inline-flex min-h-11 items-center py-2 underline decoration-current/40 underline-offset-4 transition-colors hover:text-[var(--peach)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--peach)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--navy-deep)]">
        {th ? "นโยบายความเป็นส่วนตัว" : "Privacy policy"}
      </Link>
      <Link href={`/${locale}/terms-and-conditions`} className="inline-flex min-h-11 items-center py-2 underline decoration-current/40 underline-offset-4 transition-colors hover:text-[var(--peach)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--peach)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--navy-deep)]">
        {th ? "ข้อกำหนดและเงื่อนไข" : "Terms and conditions"}
      </Link>
    </nav>
  );
}
