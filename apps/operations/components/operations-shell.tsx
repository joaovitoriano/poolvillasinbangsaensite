"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  Globe2,
  LayoutDashboard,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { signOutAction } from "@/app/ops/actions";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: { en: string; th: string };
  mobileLabel?: { en: string; th: string };
  icon: typeof LayoutDashboard;
};
type OperationsRole = "admin" | "owner" | "agent";
type ActiveVilla = { _id: string; name: string };

function getNavigation(role: OperationsRole, activeVilla?: ActiveVilla) {
  const outer: NavItem[] = [
    { href: "/ops/overview", label: { en: "Overview", th: "ภาพรวม" }, icon: LayoutDashboard },
    { href: "/ops/villas", label: { en: "Villas", th: "วิลล่า" }, icon: Building2 },
  ];
  {
    outer.push({
      href: "/ops/financials",
      label: { en: "Financials", th: "การเงิน" },
      mobileLabel: { en: "Financials", th: "การเงิน" },
      icon: ChartNoAxesCombined,
    });
  }

  outer.push({ href: "/ops/settings", label: { en: "Account", th: "บัญชี" }, icon: User });
  const villa: NavItem[] = activeVilla
    ? [
        { href: `/ops/villas/${activeVilla._id}/calendar`, label: { en: "Calendar", th: "ปฏิทิน" }, icon: CalendarDays },
        { href: `/ops/villas/${activeVilla._id}/bookings`, label: { en: "Bookings", th: "การจอง" }, icon: ClipboardList },
        ...(role !== "agent" ? [{ href: `/ops/villas/${activeVilla._id}/financials`, label: { en: "Financials", th: "การเงิน" }, icon: ChartNoAxesCombined }] : []),
        ...(role === "admin"
          ? [{ href: `/ops/villas/${activeVilla._id}/settings`, label: { en: "Settings", th: "การตั้งค่า" }, icon: Settings }]
          : []),
      ]
    : [];

  return { outer, villa };
}

function MobileBottomNavigation({ role, pathname, activeVilla }: { role: OperationsRole; pathname: string; activeVilla?: ActiveVilla }) {
  const { t } = useLocale();
  const { outer, villa } = getNavigation(role, activeVilla);
  const items = activeVilla
    ? [{ href: "/ops/villas", label: { en: "Go back", th: "ย้อนกลับ" }, icon: ArrowLeft }, ...villa]
    : outer;

  return (
    <nav
      aria-label={t(activeVilla ? { en: "Villa navigation", th: "เมนูวิลล่า" } : { en: "Main navigation", th: "เมนูหลัก" })}
      className="fixed inset-x-0 mx-auto w-full max-w-[var(--app-width)] bottom-0 z-40 border-t bg-white/98 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex min-h-16 max-w-lg items-stretch px-1">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/ops/overview" && item.href !== "/ops/villas" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium text-muted-foreground transition-colors active:bg-muted/70",
                active && "text-foreground",
              )}
            >
              {active && <span aria-hidden="true" className="absolute inset-x-3 top-0 h-0.5 rounded-b bg-foreground" />}
              <Icon aria-hidden="true" className={cn("size-5", active && "stroke-[2.25]")} />
              <span className="w-full truncate text-center leading-tight">{t(item.mobileLabel ?? item.label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function LoadingShell() {
  return (
    <div className="flex min-h-screen">
      <main className="flex-1 p-6"><Skeleton className="h-8 w-56" /><Skeleton className="mt-8 h-80 w-full" /></main>
    </div>
  );
}

export function OperationsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLocale();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { user: workosUser } = useAuth();
  const syncCurrent = useMutation(api.users.syncCurrent);
  const didSync = useRef(false);
  const [syncError, setSyncError] = useState(false);
  useEffect(() => {
    if (isAuthenticated && !didSync.current) {
      didSync.current = true;
      void syncCurrent({}).catch(() => { didSync.current = false; setSyncError(true); });
    }
  }, [isAuthenticated, syncCurrent]);
  const currentUser = useQuery(api.users.current, isAuthenticated ? {} : "skip");
  const villas = useQuery(api.villas.listAccessible, currentUser ? {} : "skip");
  const activeVillaId = pathname.match(/^\/ops\/villas\/([^/]+)/)?.[1];
  const activeVilla = villas?.find((villa) => villa._id === activeVillaId);
  const router = useRouter();
  const unavailableVilla = Boolean(currentUser && villas && activeVillaId && !activeVilla);
  useEffect(() => { if (unavailableVilla) router.replace("/ops/overview"); }, [unavailableVilla, router]);

  if (syncError) return <div className="grid min-h-screen place-items-center bg-white p-6"><div className="max-w-md rounded-xl border bg-white p-6 text-center"><h1 className="font-semibold">{t({ en: "Operations access unavailable", th: "ไม่สามารถเข้าถึงระบบจัดการได้" })}</h1><p className="mt-2 text-sm text-muted-foreground">{t({ en: "Your account could not be connected to the operations organization.", th: "ไม่สามารถเชื่อมบัญชีของคุณกับองค์กรระบบจัดการได้" })}</p><form action={signOutAction} className="mt-4"><Button type="submit" variant="outline">{t({ en: "Sign out", th: "ออกจากระบบ" })}</Button></form></div></div>;
  if (isLoading || (isAuthenticated && (currentUser === undefined || villas === undefined))) return <LoadingShell />;
  if (unavailableVilla || !workosUser || !currentUser) return <LoadingShell />;

  const currentPage = getNavigation(currentUser.role).outer.find((item) => pathname === item.href);
  const headerTitle = activeVilla?.name ?? (currentPage ? t(currentPage.mobileLabel ?? currentPage.label) : t({ en: "Villa Operations", th: "จัดการวิลล่า" }));
  const isCalendarRoute = /^\/ops\/villas\/[^/]+\/calendar\/?$/i.test(pathname);
  const isVillaFinancialsRoute = /^\/ops\/villas\/[^/]+\/financials\/?$/i.test(pathname);
  const mainClass = isCalendarRoute
    ? "mx-auto w-full min-w-0 overflow-x-clip p-0 pt-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))]"
    : isVillaFinancialsRoute
    ? "mx-auto w-full min-w-0 overflow-x-clip p-4 pb-[calc(4rem+1px+env(safe-area-inset-bottom))]"
    : "mx-auto w-full min-w-0 overflow-x-clip p-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))]";

  return (
    <div className="min-h-screen bg-white text-foreground">
      <div>
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-white/95 px-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">{headerTitle}</p>
              {activeVilla?.contactName && <p className="truncate text-[11px] text-muted-foreground">{activeVilla.contactName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setLocale(locale === "en" ? "th" : "en")}><Globe2 />{locale === "en" ? "ไทย" : "EN"}</Button>
          </div>
        </header>
        <main key={`${currentUser._id}:${currentUser.role}`} className={mainClass}>{children}</main>
      </div>
      <MobileBottomNavigation role={activeVilla?.role ?? currentUser.role} pathname={pathname} activeVilla={activeVilla} />
    </div>
  );
}
