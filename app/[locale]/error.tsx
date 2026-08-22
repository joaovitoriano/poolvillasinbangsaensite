"use client";

import { usePathname } from "next/navigation";

export default function LocalizedError({reset}:{reset:()=>void}){const th=usePathname().startsWith("/th");return <main className="grid min-h-screen place-items-center bg-[var(--paper)] p-6 text-center"><div><h1 className="font-serif text-4xl font-semibold text-[var(--navy)]">{th?"เราไม่สามารถโหลดหน้านี้ได้":"We could not load this page."}</h1><p className="mt-3 text-sm text-[var(--soft)]">{th?"โปรดลองอีกครั้งในอีกสักครู่":"Please try again in a moment."}</p><button onClick={reset} className="mt-6 min-h-11 bg-[var(--navy)] px-5 text-sm font-bold text-white">{th?"ลองอีกครั้ง":"Try again"}</button></div></main>}
