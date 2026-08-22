"use client";

import { useState } from "react";
import { CalendarDays, Search, Users } from "lucide-react";

const copy = {
  en: { checkIn:"Check-in", checkOut:"Check-out", guests:"Guests", button:"Search villas", note:"Choose your dates and group size to find the right stay." },
  th: { checkIn:"เช็กอิน", checkOut:"เช็กเอาต์", guests:"ผู้เข้าพัก", button:"ค้นหาวิลล่า", note:"เลือกวันที่และจำนวนผู้เข้าพักเพื่อค้นหาบ้านที่เหมาะกับทริป" },
} as const;
function today() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

export function SearchForm({ locale, initialCheckIn="", initialCheckOut="", initialGuests=2 }: { locale:"en"|"th"; initialCheckIn?:string; initialCheckOut?:string; initialGuests?:number }) {
  const t=copy[locale]; const [checkIn,setCheckIn]=useState(initialCheckIn); const [checkOut,setCheckOut]=useState(initialCheckOut); const [guests,setGuests]=useState(initialGuests);
  return <form action={`/${locale}/villas`} className="rounded-2xl border border-white/15 bg-white p-3 text-[var(--ink)] shadow-[0_24px_70px_rgba(0,0,0,.24)] sm:p-4"><div className="grid gap-2 md:grid-cols-[1fr_1fr_150px_auto]">
    <label className="rounded-xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 transition focus-within:border-[var(--pool)] focus-within:bg-white"><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[var(--soft)]"><CalendarDays size={13}/>{t.checkIn}</span><input name="checkIn" type="date" min={today()} value={checkIn} onChange={(e)=>{setCheckIn(e.target.value);if(checkOut&&checkOut<=e.target.value)setCheckOut("")}} className="mt-2 w-full bg-transparent text-sm outline-none"/></label>
    <label className="rounded-xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 transition focus-within:border-[var(--pool)] focus-within:bg-white"><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[var(--soft)]"><CalendarDays size={13}/>{t.checkOut}</span><input name="checkOut" type="date" min={checkIn||today()} value={checkOut} onChange={(e)=>setCheckOut(e.target.value)} className="mt-2 w-full bg-transparent text-sm outline-none"/></label>
    <label className="rounded-xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 transition focus-within:border-[var(--pool)] focus-within:bg-white"><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[var(--soft)]"><Users size={13}/>{t.guests}</span><input name="guests" type="number" min={1} max={40} value={guests} onChange={(e)=>setGuests(Math.max(1,Number(e.target.value)))} className="mt-2 w-full bg-transparent text-sm outline-none"/></label>
    <button type="submit" className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[var(--terracotta)] px-6 text-sm font-bold text-white transition hover:bg-[#aa664c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><Search size={17}/>{t.button}</button>
  </div><p className="px-1 pt-3 text-[11px] text-[var(--soft)]">{t.note}</p></form>;
}
