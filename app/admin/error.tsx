"use client";

import Link from "next/link";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fbfaf6] p-6">
      <section className="max-w-md border border-[#ddd6ca] bg-white p-7 text-center shadow-[0_18px_50px_rgba(0,30,51,.07)]">
        <p className="font-mono text-[10px] uppercase tracking-[.16em] text-[#c66f4e]">Management error / ข้อผิดพลาดในการจัดการ</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-[#001e33]">Management area unavailable / ไม่สามารถเปิดพื้นที่จัดการได้</h1>
        <p className="mt-2 text-sm leading-6 text-[#68777a]">The page could not be loaded and your data was not changed. Try again or return to the public website. / ไม่สามารถโหลดหน้านี้ได้และข้อมูลของคุณยังไม่ถูกเปลี่ยนแปลง โปรดลองอีกครั้งหรือกลับไปยังเว็บไซต์สาธารณะ</p>
        <div className="mt-5 flex justify-center gap-2"><button onClick={reset} className="min-h-11 bg-[#001e33] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e]">Try again / ลองอีกครั้ง</button><Link href="/en" className="inline-flex min-h-11 items-center border border-[#cfc8bc] px-4 text-sm font-semibold text-[#001e33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e]">Public website / เว็บไซต์สาธารณะ</Link></div>
      </section>
    </main>
  );
}
