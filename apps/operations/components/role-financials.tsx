"use client";
import { useMemo, useState } from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useLocale, type Localized } from "@/components/locale-provider";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { financialColours } from "@/lib/financial-colours";
import { formatDate, formatThb } from "@/lib/format";

type Totals = { grossThb?: number; discountsThb?: number; chargedThb: number; commissionsThb: number; villaNetThb?: number; bookingCount: number };
type Person = Totals & { userId: string; name: string };
type Data = { totals: Totals; series: (Totals & { date: string })[]; byVilla: (Totals & { villaId: string; villaName: string })[]; byUser: Person[]; byVillaUser: (Person & { villaId: string })[] };
const metrics = {
  bookingCount: { en: "Your bookings", th: "การจองของคุณ" },
  chargedThb: { en: "Booking total", th: "ยอดรวมการจอง" },
  discountsThb: { en: "Discounts", th: "ส่วนลด" },
  commissionsThb: { en: "Commissions", th: "ค่าคอมมิชชัน" },
  villaNetThb: { en: "Net revenue", th: "รายได้สุทธิ" },
} satisfies Record<string, Localized>;
type Metric = keyof typeof metrics;
const metricOrder: Metric[] = ["chargedThb", "villaNetThb", "discountsThb", "commissionsThb"];
function metricLabel(key: Metric, agent: boolean) {
  if (agent && key === "chargedThb") return { en: "Your booking total", th: "ยอดรวมการจองของคุณ" };
  if (agent && key === "commissionsThb") return { en: "Your commissions", th: "ค่าคอมมิชชันของคุณ" };
  return metrics[key];
}
function MetricSelect({ value, onChange, label, options = metricOrder, agent = false }: { value: Metric; onChange: (value: Metric) => void; label: string; options?: Metric[]; agent?: boolean }) {
  const { t } = useLocale();
  return <Select value={value} onValueChange={value => { if (value && value in metrics) onChange(value as Metric); }}><SelectTrigger aria-label={label} className="h-8 w-auto max-w-full gap-2 px-2 text-xs"><SelectValue>{t(metricLabel(value, agent))}</SelectValue></SelectTrigger><SelectContent>{options.map(key => <SelectItem key={key} value={key}>{t(metricLabel(key, agent))}</SelectItem>)}</SelectContent></Select>;
}
export function RoleFinancials({ data, from, to, role }: { data?: Data; from: string; to: string; role: "admin" | "owner" | "agent" }) {
  const agent = role === "agent";
  const comparisonMetrics: Metric[] = agent ? ["chargedThb", "commissionsThb", "bookingCount"] : metricOrder;
  const { locale, t, localize } = useLocale();
  const [metric, setMetric] = useState<Metric>(agent ? "commissionsThb" : role === "owner" ? "villaNetThb" : "chargedThb");
  const [sort, setSort] = useState<Metric>(agent ? "commissionsThb" : "villaNetThb");
  const [tab, setTab] = useState("villa");
  const [selectedVilla, setSelectedVilla] = useState("");
  const villaId = data?.byVilla.some(villa => villa.villaId === selectedVilla) ? selectedVilla : data?.byVilla[0]?.villaId ?? "";
  const money = (value: number) => formatThb(value, locale);
  const rows = (tab === "villa" ? data?.byVilla.map(row => ({ ...row, id: row.villaId, name: row.villaName })) : tab === "person" ? data?.byUser.map(row => ({ ...row, id: row.userId })) : data?.byVillaUser.filter(row => row.villaId === villaId).map(row => ({ ...row, id: row.userId })))?.sort((a, b) => (b[sort] ?? 0) - (a[sort] ?? 0) || a.name.localeCompare(b.name));
  const monthly = (Date.parse(to) - Date.parse(from)) / 86400000 > 62;
  const series = useMemo(() => {
    if (!data) return [];
    const groups = new Map<string, number>();
    const cursor = new Date(`${from}T00:00:00Z`), end = new Date(`${to}T00:00:00Z`);
    if (monthly) cursor.setUTCDate(1);
    for (let count = 0; cursor <= end && count < 3661; count++) {
      const key = cursor.toISOString().slice(0, monthly ? 7 : 10);
      groups.set(key, 0);
      if (monthly) cursor.setUTCMonth(cursor.getUTCMonth() + 1); else cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    for (const row of data.series) {
      const key = row.date.slice(0, monthly ? 7 : 10);
      groups.set(key, (groups.get(key) ?? 0) + (row[metric] ?? 0));
    }
    return [...groups].map(([date, value]) => ({ date: monthly ? `${date}-01` : date, value }));
  }, [data, from, to, metric, monthly]);
  const tick = (date: string) => new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { timeZone: "UTC", ...(monthly ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" }) }).format(new Date(`${date}T00:00:00Z`));
  return <div className="grid min-w-0 gap-8">
    {agent ? <section aria-labelledby="your-totals-title"><h2 id="your-totals-title" className="mb-4 text-lg font-semibold">{t({ en: "Your totals", th: "ยอดรวมของคุณ" })}</h2>{!data ? <Skeleton className="h-40" /> : <dl className="grid gap-4">{comparisonMetrics.map(key => <div key={key} className="flex items-baseline justify-between gap-3"><dt className="text-sm text-muted-foreground">{t(metricLabel(key, true))}</dt><dd className="text-lg font-semibold tabular-nums">{key === "bookingCount" ? data.totals.bookingCount : money(data.totals[key] ?? 0)}</dd></div>)}</dl>}</section> : <section aria-labelledby="money-title"><h2 id="money-title" className="mb-4 text-lg font-semibold">{t({ en: "Money breakdown", th: "สรุปการเงิน" })}</h2>
      {!data ? <Skeleton className="h-52" /> : <dl className="grid gap-3 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t({ en: "Original booking value", th: "ยอดจองก่อนหักส่วนลด" })}</dt><dd className="tabular-nums">{money(data.totals.grossThb ?? 0)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t(metrics.discountsThb)}</dt><dd className="tabular-nums">−{money(data.totals.discountsThb ?? 0)}</dd></div>
        <div className="flex justify-between gap-3 border-t pt-3 font-semibold"><dt>{t(metrics.chargedThb)}</dt><dd className="tabular-nums">{money(data.totals.chargedThb)}</dd></div>
        <div className="mt-2 flex justify-between gap-3"><dt className="text-muted-foreground">{t(metrics.commissionsThb)}</dt><dd className="tabular-nums">−{money(data.totals.commissionsThb)}</dd></div>
        <div className="flex items-baseline justify-between gap-3 border-t pt-3 font-semibold"><dt>{t(metrics.villaNetThb)}</dt><dd className="text-2xl tracking-tight tabular-nums">{money(data.totals.villaNetThb ?? 0)}</dd></div>
      </dl>}
    </section>}
    <section aria-labelledby="trend-title" className="min-w-0"><div className="mb-4 flex items-center justify-between gap-2"><h2 id="trend-title" className="text-lg font-semibold">{t({ en: "Trend", th: "แนวโน้ม" })}</h2><MetricSelect agent={agent} options={agent ? ["commissionsThb", "chargedThb"] : metricOrder} value={metric} onChange={setMetric} label={t({ en: "Chart metric", th: "ตัวเลขที่แสดงในกราฟ" })} /></div>
      {!data ? <Skeleton className="h-56" /> : <ChartContainer config={{ value: { label: t(metricLabel(metric, agent)), color: financialColours[metric] } }} className="h-56 w-full aspect-auto"><LineChart accessibilityLayer data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={tick} minTickGap={28} tickLine={false} axisLine={false} /><YAxis width={42} tickLine={false} axisLine={false} tickFormatter={value => Math.abs(value) >= 1000000 ? `${+(value / 1000000).toFixed(1)}m` : Math.abs(value) >= 1000 ? `${+(value / 1000).toFixed(1)}k` : String(value)} /><ChartTooltip content={<ChartTooltipContent labelFormatter={value => monthly ? tick(String(value)) : formatDate(String(value), locale)} formatter={value => <span className="font-medium tabular-nums">{money(Number(value))}</span>} />} /><Line dataKey="value" name={t(metricLabel(metric, agent))} stroke="var(--color-value)" strokeWidth={2} dot={series.length === 1} activeDot={{ r: 4 }} isAnimationActive={false} /></LineChart></ChartContainer>}
    </section>
    <section aria-labelledby="comparison-title" className="min-w-0"><h2 id="comparison-title" className="mb-4 text-lg font-semibold">{t(agent ? { en: "By villa", th: "ตามวิลล่า" } : { en: "Comparison", th: "เปรียบเทียบ" })}</h2>
      {!agent && <Tabs value={tab} onValueChange={value => setTab(String(value))}><TabsList className="grid w-full grid-cols-3"><TabsTrigger value="villa">{t({ en: "By villa", th: "ตามวิลล่า" })}</TabsTrigger><TabsTrigger value="person">{t({ en: "By person", th: "ตามบุคคล" })}</TabsTrigger><TabsTrigger value="both">{t({ en: "Villa + person", th: "วิลล่า + บุคคล" })}</TabsTrigger></TabsList></Tabs>}
      {!agent && tab === "both" && (data?.byVilla.length ?? 0) > 1 && <div className="mt-3"><Select value={villaId} onValueChange={value => setSelectedVilla(String(value))}><SelectTrigger className="w-full" aria-label={t({ en: "Villa", th: "วิลล่า" })}><SelectValue>{data?.byVilla.find(villa => villa.villaId === villaId)?.villaName ?? t({ en: "Select villa", th: "เลือกวิลล่า" })}</SelectValue></SelectTrigger><SelectContent>{data?.byVilla.map(villa => <SelectItem key={villa.villaId} value={villa.villaId}>{villa.villaName}</SelectItem>)}</SelectContent></Select></div>}
      <div className="mt-4 flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{t({ en: "Sort by", th: "เรียงตาม" })}</span><MetricSelect agent={agent} options={comparisonMetrics} value={sort} onChange={setSort} label={t({ en: "Sort by", th: "เรียงตาม" })} /></div>
      {!data ? <Skeleton className="mt-4 h-48" /> : !rows?.length ? <p className="py-8 text-center text-sm text-muted-foreground">{t({ en: "No financial activity in this period.", th: "ไม่มีรายการทางการเงินในช่วงนี้" })}</p> : <div className="divide-y">{rows.map(row => <article key={row.id} className="py-5"><h3 className="mb-3 break-words text-sm font-medium">{localize(row.name)}</h3><dl className="grid grid-cols-2 gap-x-4 gap-y-3">{comparisonMetrics.map(key => <div key={key} className="min-w-0"><dt className="text-[11px] text-muted-foreground">{t(metricLabel(key, agent))}</dt><dd className={`mt-0.5 break-words tabular-nums ${key === "chargedThb" || key === "villaNetThb" ? "text-base font-semibold" : "text-sm"}`}>{key === "bookingCount" ? row.bookingCount : money(row[key] ?? 0)}</dd></div>)}</dl></article>)}</div>}
    </section>
  </div>;
}
