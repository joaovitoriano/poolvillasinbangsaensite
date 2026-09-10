"use client";

import { useQuery } from "convex/react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { PageFrame } from "@/components/page-frame";
import { useLocale } from "@/components/locale-provider";
import { ActivityTable } from "@/components/activity-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { currentYearRange, formatDate, formatThb } from "@/lib/format";

type WeekEntry = { id: string; villaId: string; villaName: string; kind: "booking" | "closed"; name: string; from: string; to: string };
function thisWeek() {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  now.setUTCDate(now.getUTCDate() - (now.getUTCDay() + 6) % 7);
  const weekFrom = now.toISOString().slice(0, 10);
  now.setUTCDate(now.getUTCDate() + 7);
  return { weekFrom, weekTo: now.toISOString().slice(0, 10) };
}
export default function OverviewPage() {
  const { locale, t } = useLocale();
  const user = useQuery(api.users.current);
  const villas = useQuery(api.villas.listAccessible, {});
  const overview = useQuery(api.overview.get, user ? { ...currentYearRange(), ...thisWeek() } : "skip");
  const agent = user?.role === "agent";
  const metrics = agent ? [
    { label: { en: "Your booking total", th: "ยอดรวมการจองของคุณ" }, value: formatThb(overview?.totals.chargedThb ?? 0, locale) },
    { label: { en: "Your commissions", th: "ค่าคอมมิชชันของคุณ" }, value: formatThb(overview?.totals.commissionsThb ?? 0, locale) },
    { label: { en: "Your bookings", th: "การจองของคุณ" }, value: overview?.totals.bookingCount ?? 0 },
  ] : [
    { label: { en: "Active villas", th: "วิลล่าที่ใช้งาน" }, value: overview?.activeVillas ?? 0 },
    { label: { en: "Bookings", th: "การจอง" }, value: overview?.totals.bookingCount ?? 0 },
    { label: { en: "Booking total", th: "ยอดรวมการจอง" }, value: formatThb(overview?.totals.chargedThb ?? 0, locale) },
    { label: { en: "Net revenue", th: "รายได้สุทธิ" }, value: formatThb((overview && "villaNetThb" in overview.totals ? overview.totals.villaNetThb : 0), locale) },
  ];
  return <PageFrame title={{ en: "Overview", th: "ภาพรวม" }}>
    <div className={`grid gap-3 ${agent ? "grid-cols-3" : "grid-cols-2 "}`}>
      {metrics.map(item => <Card key={item.label.en} size="sm" className="min-w-0"><CardHeader><CardTitle className="text-[11px] font-medium text-muted-foreground">{t(item.label)}</CardTitle></CardHeader><CardContent>{overview ? <p className="break-words text-lg font-semibold tracking-tight tabular-nums">{item.value}</p> : <Skeleton className="h-7" />}</CardContent></Card>)}
    </div>
    <Card><CardHeader className="flex items-center justify-between"><CardTitle>{t({ en: "Villas", th: "วิลล่า" })}</CardTitle><Link href="/ops/villas" className="text-sm underline-offset-4 hover:underline">{t({ en: "View all", th: "ดูทั้งหมด" })}</Link></CardHeader><CardContent className="grid gap-1">
      {!villas && <><Skeleton className="h-12" /><Skeleton className="h-12" /></>}
      {villas?.slice(0, 8).map(villa => <Link key={villa._id} href={`/ops/villas/${villa._id}/calendar`} className="flex min-h-14 items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 hover:bg-muted"><div className="min-w-0"><p className="truncate font-medium">{villa.name}</p><p className="truncate text-xs text-muted-foreground">{villa.contactName}</p></div><ArrowUpRight className="size-4 text-muted-foreground" /></Link>)}
      {villas?.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t({ en: "No villas yet.", th: "ยังไม่มีวิลล่า" })}</p>}
    </CardContent></Card>
    {user?.role === "admin" && <ActivityTable />}
    {user?.role === "owner" && <Card><CardHeader><CardTitle>{t({ en: "Happening This Week", th: "รายการในสัปดาห์นี้" })}</CardTitle></CardHeader><CardContent className="grid gap-1">
      {!overview && <Skeleton className="h-24" />}
      {overview?.week.length === 0 && <p className="py-6 text-sm text-muted-foreground">{t({ en: "No bookings or closed dates this week.", th: "ไม่มีการจองหรือวันที่ปิดในสัปดาห์นี้" })}</p>}
      {overview?.week.map((entry: WeekEntry) => <Link key={`${entry.kind}:${entry.id}`} href={`/ops/villas/${entry.villaId}/${entry.kind === "booking" ? `bookings?bookingId=${entry.id}` : `calendar?closedDateId=${entry.id}`}`} className="flex items-center justify-between gap-3 border-b py-3 last:border-0"><div className="min-w-0"><p className="text-sm font-medium">{entry.kind === "closed" ? t({ en: "Closed date", th: "วันที่ปิด" }) : entry.name} · {entry.villaName}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(entry.from, locale)} – {formatDate(entry.to, locale)}</p></div><ArrowUpRight className="size-4 shrink-0 text-muted-foreground" /></Link>)}
    </CardContent></Card>}
  </PageFrame>;
}
