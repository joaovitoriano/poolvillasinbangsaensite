import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

const COPY = {
  en: {
    back: "Home",
    kicker: "Guest information",
    title: "Policies and booking information",
    introduction: "Review how booking requests, payments, and villa-specific policies work before your trip.",
    policies: [
      {
        title: "Booking requests",
        body: "Submitting a request does not confirm a booking. The owner confirms availability, the final price, and the next steps directly by LINE or phone.",
      },
      {
        title: "Payments",
        body: "No payment is collected on this website. Payment details are shared only after the owner has contacted you and confirmed the request.",
      },
      {
        title: "Villa policies",
        body: "Cancellation terms, security deposits, check-in details, and house rules are shown on each villa page and confirmed again before a booking is accepted.",
      },
    ],
  },
  th: {
    back: "หน้าแรก",
    kicker: "ข้อมูลสำหรับผู้เข้าพัก",
    title: "นโยบายและข้อมูลการจอง",
    introduction: "อ่านข้อมูลเกี่ยวกับคำขอจอง การชำระเงิน และนโยบายของวิลล่าก่อนเดินทาง",
    policies: [
      {
        title: "คำขอจอง",
        body: "การส่งคำขอยังไม่ถือว่าเป็นการยืนยันการจอง เจ้าของจะยืนยันวันว่าง ราคาสุดท้าย และขั้นตอนถัดไปทาง LINE หรือโทรศัพท์โดยตรง",
      },
      {
        title: "การชำระเงิน",
        body: "เว็บไซต์นี้ไม่รับชำระเงิน เจ้าของจะแจ้งรายละเอียดการชำระเงินหลังจากติดต่อและยืนยันคำขอแล้วเท่านั้น",
      },
      {
        title: "นโยบายของวิลล่า",
        body: "เงื่อนไขการยกเลิก เงินประกัน รายละเอียดการเช็กอิน และกฎของที่พักจะแสดงในหน้าวิลล่าแต่ละหลังและยืนยันอีกครั้งก่อนรับการจอง",
      },
    ],
  },
} as const;

export default async function PoliciesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "th") notFound();
  const copy = COPY[locale];

  return (
    <main className="min-h-screen bg-[var(--paper)]">
      <header className="bg-[var(--navy-deep)] px-5 text-white sm:px-8">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between">
          <Link href={`/${locale}`}>
            <Image src="/brand-logo-white.png" alt={locale === "th" ? "พูลวิลล่าในบางแสน" : "Pool Villas in Bangsaen"} width={220} height={44} className="h-8 w-auto" />
          </Link>
          <Link href={`/${locale}`}>← {copy.back}</Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[.18em] text-[var(--terracotta)]">{copy.kicker}</p>
        <h1 className="mt-3 font-serif text-5xl font-semibold text-[var(--navy)]">{copy.title}</h1>
        <p className="mt-5 text-sm leading-7 text-[var(--soft)]">{copy.introduction}</p>
        <div className="mt-10 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {copy.policies.map((policy) => (
            <section key={policy.title} className="py-7">
              <h2 className="font-serif text-3xl font-semibold">{policy.title}</h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--soft)]">{policy.body}</p>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
