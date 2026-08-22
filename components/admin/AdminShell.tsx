"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  Gauge,
  Globe2,
  Home,
  Inbox,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminRoutes, adminViewFromPathname, type AdminView } from "./admin-routes";
export type AdminSessionUser = {
  workosUserId: string;
  role: "admin" | "superadmin";
};
import { AdminToastProvider } from "./AdminUI";
import { useAdminLocale, type AdminLocale } from "./AdminLocale";

export const adminViewMeta: Record<string, { title: string; eyebrow: string; description: string }> = {
  overview: { title: "Overview", eyebrow: "Today", description: "See what needs attention and choose the next useful action." },
  inquiries: { title: "Inquiries", eyebrow: "Today", description: "Contact guests and move each booking request to a clear next state. Requests do not hold dates." },
  calendar: { title: "Availability", eyebrow: "Today", description: "See why dates are unavailable and keep the public calendar trustworthy." },
  villas: { title: "Villas", eyebrow: "Website", description: "Keep every villa accurate, complete, and ready for guests to discover." },
  settings: { title: "Business settings", eyebrow: "Workspace", description: "Update the public business identity and guest contact details." },
  integrations: { title: "Integrations", eyebrow: "Workspace", description: "Manage notification recipients, check whether messages and calendar data can be trusted, and recover from issues." },
  seo: { title: "SEO", eyebrow: "Workspace", description: "Control the default title and description shown in search results." },
  audit: { title: "Audit activity", eyebrow: "Workspace", description: "Review who changed important records and when the change occurred." },
};

const adminViewMetaTh: typeof adminViewMeta = {
  overview: { title: "ภาพรวม", eyebrow: "วันนี้", description: "ดูสิ่งที่ต้องดำเนินการและเลือกงานถัดไปที่เหมาะสม" },
  inquiries: { title: "คำขอจอง", eyebrow: "วันนี้", description: "ติดต่อผู้เข้าพักและอัปเดตสถานะคำขอจองให้ชัดเจน โดยคำขอจะยังไม่กันวันเข้าพัก" },
  calendar: { title: "วันว่าง", eyebrow: "วันนี้", description: "ตรวจสอบสาเหตุที่วันไม่ว่างและดูแลปฏิทินบนเว็บไซต์ให้ถูกต้อง" },
  villas: { title: "วิลล่า", eyebrow: "เว็บไซต์", description: "ดูแลข้อมูลวิลล่าให้ถูกต้อง ครบถ้วน และพร้อมให้ผู้เข้าพักค้นพบ" },
  settings: { title: "การตั้งค่าธุรกิจ", eyebrow: "พื้นที่ทำงาน", description: "อัปเดตข้อมูลธุรกิจและช่องทางติดต่อสำหรับผู้เข้าพัก" },
  integrations: { title: "การเชื่อมต่อ", eyebrow: "พื้นที่ทำงาน", description: "จัดการผู้รับการแจ้งเตือน ตรวจสอบความพร้อมของข้อความและข้อมูลปฏิทิน รวมถึงแก้ไขเมื่อมีปัญหา" },
  seo: { title: "SEO", eyebrow: "พื้นที่ทำงาน", description: "จัดการชื่อและคำอธิบายเริ่มต้นที่แสดงในผลการค้นหา" },
  audit: { title: "ประวัติการใช้งาน", eyebrow: "พื้นที่ทำงาน", description: "ตรวจสอบว่าใครแก้ไขข้อมูลสำคัญและแก้ไขเมื่อใด" },
};

const shellCopy = {
  en: {
    skip: "Skip to main content",
    navigation: "Management navigation",
    publicWebsite: "View public website",
    language: "Admin language",
    open: "Open navigation",
    close: "Close",
    signOut: "Sign out",
    brand: "Pool Villas in Bangsaen",
    roles: { admin: "admin", superadmin: "superadmin" },
  },
  th: {
    skip: "ข้ามไปยังเนื้อหาหลัก",
    navigation: "เมนูระบบจัดการ",
    publicWebsite: "ดูเว็บไซต์สาธารณะ",
    language: "ภาษาของระบบจัดการ",
    open: "เปิดเมนู",
    close: "ปิด",
    signOut: "ออกจากระบบ",
    brand: "พูลวิลล่าในบางแสน",
    roles: { admin: "ผู้ดูแล", superadmin: "ผู้ดูแลระบบ" },
  },
} as const;

type NavItem = {
  id: AdminView;
  label: string;
  labelTh: string;
  icon: typeof Gauge;
};

type NavGroup = {
  label?: string;
  labelTh?: string;
  superadmin?: boolean;
  items: NavItem[];
};

const groups: NavGroup[] = [
  {
    items: [
      { id: "overview", label: "Overview", labelTh: "ภาพรวม", icon: Gauge },
      { id: "inquiries", label: "Inquiries", labelTh: "คำขอจอง", icon: Inbox },
      { id: "calendar", label: "Availability", labelTh: "วันว่าง", icon: CalendarDays },
      { id: "settings", label: "Business settings", labelTh: "การตั้งค่าธุรกิจ", icon: Settings },
    ],
  },
  {
    label: "Website",
    labelTh: "เว็บไซต์",
    items: [
      { id: "villas", label: "Villas", labelTh: "วิลล่า", icon: Home },
    ],
  },
  {
    label: "Workspace",
    labelTh: "พื้นที่ทำงาน",
    superadmin: true,
    items: [
      { id: "integrations", label: "Integrations", labelTh: "การเชื่อมต่อ", icon: ShieldCheck },
      { id: "seo", label: "SEO", labelTh: "SEO", icon: Globe2 },
      { id: "audit", label: "Audit activity", labelTh: "ประวัติการใช้งาน", icon: Activity },
    ],
  },
];

function LanguageSwitch({ locale, onChange }: { locale: AdminLocale; onChange: (locale: AdminLocale) => void }) {
  const copy = shellCopy[locale];
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-1.5">
      <span className="text-xs font-semibold text-white/68">{locale === "th" ? "ภาษา" : "Language"}</span>
      <div className="grid grid-cols-2 rounded-lg border border-white/15 bg-black/10 p-0.5" role="group" aria-label={copy.language}>
        {(["en", "th"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={locale === option}
            className={`min-h-8 min-w-11 rounded-md px-2 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efb58e] ${locale === option ? "bg-white text-[#001e33] shadow-sm" : "text-white/58 hover:text-white"}`}
          >
            {option === "en" ? "EN" : "ไทย"}
          </button>
        ))}
      </div>
    </div>
  );
}

function NavContent({ user, view, locale, onLocaleChange, onSelect, canNavigate, mobile = false }: { user: AdminSessionUser; view: AdminView; locale: AdminLocale; onLocaleChange: (locale: AdminLocale) => void; onSelect: () => void; canNavigate: () => boolean; mobile?: boolean }) {
  const copy = shellCopy[locale];
  return (
    <>
      <nav aria-label={copy.navigation} className={`px-3 py-4 ${mobile ? "flex-none overflow-visible" : "min-h-0 flex-1 overflow-y-auto"}`}>
        {groups.filter((group) => !group.superadmin || user.role === "superadmin").map((group, groupIndex) => (
          <div key={group.label ?? groupIndex} className="mb-5 last:mb-0">
            {group.label ? <p className="mb-1.5 px-3 font-mono text-[9px] font-medium uppercase tracking-[.17em] text-white/42">{locale === "th" ? group.labelTh : group.label}</p> : null}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <Link
                    key={item.id}
                    href={adminRoutes[item.id as AdminView]}
                    onClick={(event) => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                      if (!canNavigate()) { event.preventDefault(); return; }
                      onSelect();
                    }}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#efb58e] ${active ? "bg-white/14 text-white" : "text-white/68 hover:bg-white/7 hover:text-white"}`}
                  >
                    <Icon size={17} strokeWidth={1.8} />
                    <span>{locale === "th" ? item.labelTh : item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-white/12 p-3">
        <LanguageSwitch locale={locale} onChange={onLocaleChange} />
        <Link href={`/${locale}`} className="mt-1 flex min-h-10 items-center gap-3 px-3 text-xs font-semibold text-white/68 transition hover:bg-white/7 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efb58e]">
          <ExternalLink size={15} /> {copy.publicWebsite}
        </Link>
      </div>
    </>
  );
}

export function AdminShell({ user, canNavigate, children }: { user: AdminSessionUser; canNavigate: () => boolean; children: React.ReactNode }) {
  const { signOut } = useAuth();
  const { locale, setLocale } = useAdminLocale();
  const pathname = usePathname();
  const view = adminViewFromPathname(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuPanel = useRef<HTMLDivElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const copy = shellCopy[locale];
  const localizedMeta = locale === "th" ? adminViewMetaTh : adminViewMeta;
  const meta = localizedMeta[view] ?? localizedMeta.overview;
  const isVillaDetail = /^\/admin\/villas\/(?!new(?:\/|$))[^/]+\/?$/.test(pathname);

  useEffect(() => {
    if (!mobileOpen) return;
    const trigger = menuTrigger.current;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    menuPanel.current?.focus();
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") setMobileOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", onKey); trigger?.focus(); };
  }, [mobileOpen]);

  function changeLocale(nextLocale: AdminLocale) {
    setLocale(nextLocale);
  }

  return (
    <AdminToastProvider>
    <div className="admin-workspace min-h-screen bg-[#f4f6f3] text-[#163038]">
      <a href="#admin-main" className="fixed left-3 top-3 z-[70] -translate-y-20 bg-white px-4 py-2 text-sm font-semibold text-[#001e33] shadow-lg focus:translate-y-0">{copy.skip}</a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-[#001e33] text-white md:flex">
        <div className="flex h-20 shrink-0 items-center border-b border-white/12 px-5">
          <Image src="/brand-logo-white.png" alt={copy.brand} width={200} height={42} className="h-8 w-auto" />
        </div>
        <NavContent user={user} view={view} locale={locale} onLocaleChange={changeLocale} onSelect={() => setMobileOpen(false)} canNavigate={canNavigate} />
        <div className="border-t border-white/12 p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">{copy.roles[user.role]}</span>
            <button type="button" onClick={() => void signOut({ returnTo: `${window.location.origin}/${locale}` })} className="flex min-h-9 items-center gap-1.5 px-2 text-[11px] font-semibold text-white/65 hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efb58e]"><LogOut size={14} /> {copy.signOut}</button>
          </div>
        </div>
      </aside>

      <header className="flex h-16 items-center justify-between border-b border-[#ddd6ca] bg-[#fbfaf6]/95 px-4 backdrop-blur md:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <button ref={menuTrigger} type="button" className="grid size-10 shrink-0 place-items-center text-[#001e33] transition-colors hover:text-[#0f6474] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e] focus-visible:ring-offset-2" onClick={() => setMobileOpen(true)} aria-label={copy.open}><Menu size={19} /></button>
          <div className="min-w-0"><p className="font-mono text-[8px] uppercase tracking-[.15em] text-[#0f6474]">{meta.eyebrow}</p><p className="truncate text-sm font-semibold text-[#001e33]">{meta.title}</p></div>
        </div>
        <button type="button" onClick={() => void signOut({ returnTo: `${window.location.origin}/${locale}` })} className="grid size-10 place-items-center text-[#68777a] hover:text-[#001e33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e]" aria-label={copy.signOut}><LogOut size={17} /></button>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-[#001326]/55 md:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) setMobileOpen(false); }}>
          <div ref={menuPanel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={copy.navigation} className="my-4 h-[calc(100%-2rem)] w-[min(86vw,320px)] overflow-y-auto rounded-r-3xl bg-[#001e33] text-white outline-none shadow-2xl">
            <div className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-white/12 bg-[#001e33] px-5"><Image src="/brand-logo-white.png" alt={copy.brand} width={190} height={40} className="h-8 w-auto" /><button type="button" onClick={() => setMobileOpen(false)} className="min-h-11 px-2 text-xs font-semibold text-white/70">{copy.close}</button></div>
            <NavContent mobile user={user} view={view} locale={locale} onLocaleChange={changeLocale} onSelect={() => setMobileOpen(false)} canNavigate={canNavigate} />
          </div>
        </div>
      ) : null}

      <main id="admin-main" tabIndex={-1} className="px-4 py-6 sm:px-6 md:ml-60 md:px-8 md:py-8 xl:px-10">
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-6">
            {isVillaDetail ? (
              <Link
                href="/admin/villas"
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  if (!canNavigate()) event.preventDefault();
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0f6474] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e] focus-visible:ring-offset-2"
              >
                <ArrowLeft size={14} /> {locale === "th" ? "กลับไปหน้าวิลล่า" : "Back to villas"}
              </Link>
            ) : (
              <p className="font-mono text-[10px] font-medium uppercase tracking-[.16em] text-[#0f6474]">{meta.eyebrow} · {copy.brand}</p>
            )}
            <h1 className="mt-1 font-serif text-3xl font-semibold leading-none tracking-[-.02em] text-[#001e33] sm:text-4xl">{meta.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68777a]">{meta.description}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
    </AdminToastProvider>
  );
}
