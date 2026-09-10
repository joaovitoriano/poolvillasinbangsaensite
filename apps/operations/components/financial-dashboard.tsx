"use client";

import { Line, ComposedChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useId, useMemo, useState } from "react";
import { CalendarCheck2, CircleDollarSign, ReceiptText, WalletCards } from "lucide-react";
import { useLocale, type Localized } from "@/components/locale-provider";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { financialColours } from "@/lib/financial-colours";
import { formatDate, formatThb } from "@/lib/format";
import { userColorClasses } from "@/lib/user-colors";

type Totals = { bookingCount: number; grossThb: number; discountsThb: number; chargedThb: number; commissionsThb: number; villaNetThb: number };
type Series = Totals & { date: string };
type VillaRow = Totals & { villaId: string; villaName: string };
type UserRow = Totals & { userId: string; name: string; role: string };
type BookingRow = { _id: string; guestName: string; checkIn: string; subtotalThb: number; discountThb: number; totalChargedThb: number; creatorCommissionThb: number; villaNetThb: number; creatorName: string; createdByUserId: string };
type DashboardData = { totals: Totals; series: Series[]; byVilla?: VillaRow[]; byUser?: UserRow[]; filterUsers?: Array<{ userId: string; name: string; bookingCount: number }>; bookings?: BookingRow[] };

const emptyTotals: Totals = { bookingCount: 0, grossThb: 0, discountsThb: 0, chargedThb: 0, commissionsThb: 0, villaNetThb: 0 };
const trendKeys = ["commissionsThb", "discountsThb", "chargedThb", "villaNetThb"] as const;
type TrendKey = typeof trendKeys[number];
const granularities = {
  day: { en: "Day", th: "วัน" },
  week: { en: "Week", th: "สัปดาห์" },
  month: { en: "Month", th: "เดือน" },
  year: { en: "Year", th: "ปี" },
};
type Granularity = keyof typeof granularities;

function periodStart(value: string, granularity: Granularity) {
  if (granularity === "year") return `${value.slice(0, 4)}-01-01`;
  if (granularity === "month") return `${value.slice(0, 7)}-01`;
  if (granularity === "week") {
    const date = new Date(`${value}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    return date.toISOString().slice(0, 10);
  }
  return value;
}

function MobileMetric({ label, value }: { label: string; value: string | number }) {
  return <div className="min-w-0 rounded-sm border p-1 text-center"><p className="text-[9px] leading-4 text-muted-foreground">{label}</p><p className="whitespace-nowrap text-[10px] font-medium tabular-nums">{value}</p></div>;
}

export function FinancialDashboard({ data, portfolio = false, ownOnly = false }: { data?: DashboardData; portfolio?: boolean; ownOnly?: boolean }) {
  const { locale, t, localize } = useLocale();
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [hiddenTrends, setHiddenTrends] = useState<TrendKey[]>([]);
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [granularity, setGranularity] = useState<Granularity>("month");
  const creatorColors = useMemo(() => {
    const userIds = [...new Set([
      ...(data?.filterUsers ?? []).map((person) => person.userId),
      ...(data?.bookings ?? []).map((booking) => booking.createdByUserId),
    ])].sort();
    return new Map(userIds.map((userId, index) => [userId, userColorClasses[index % userColorClasses.length]]));
  }, [data?.filterUsers, data?.bookings]);
  const creatorColor = (userId: string) => creatorColors.get(userId);
  const visiblePeople = data?.byUser?.filter(row => selectedCreators.length === 0 || selectedCreators.includes(row.userId));
  const filteredTotals = selectedCreators.length ? visiblePeople?.reduce((sum, row) => ({ bookingCount: sum.bookingCount + row.bookingCount, grossThb: sum.grossThb + row.grossThb, discountsThb: sum.discountsThb + row.discountsThb, chargedThb: sum.chargedThb + row.chargedThb, commissionsThb: sum.commissionsThb + row.commissionsThb, villaNetThb: sum.villaNetThb + row.villaNetThb }), { ...emptyTotals }) : data?.totals;
  const trendSeries = useMemo(() => {
    const groups = new Map<string, Series>();
    const source = selectedCreators.length ? (data?.bookings ?? []).filter(row => selectedCreators.includes(row.createdByUserId)).map(row => ({ date: row.checkIn, bookingCount: 1, grossThb: row.subtotalThb, discountsThb: row.discountThb, chargedThb: row.totalChargedThb, commissionsThb: row.creatorCommissionThb, villaNetThb: row.villaNetThb })) : data?.series ?? [];
    for (const row of source) {
      const date = periodStart(row.date, granularity);
      const group = groups.get(date) ?? { date, ...emptyTotals };
      group.bookingCount += row.bookingCount;
      group.grossThb += row.grossThb;
      group.discountsThb += row.discountsThb;
      group.chargedThb += row.chargedThb;
      group.commissionsThb += row.commissionsThb;
      group.villaNetThb += row.villaNetThb;
      groups.set(date, group);
    }
    return [...groups.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [data?.series, data?.bookings, selectedCreators, granularity]);
  const periodFormatter = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    timeZone: "UTC",
    ...(granularity === "year" ? { year: "numeric" } : granularity === "month" ? { month: "short", year: "2-digit" } : { day: "2-digit", month: "2-digit" }),
  });
  const formatPeriod = (value: string) => periodFormatter.format(new Date(`${value}T00:00:00.000Z`));
  const availableTrends = trendKeys.filter((key) => !ownOnly || key !== "villaNetThb");
  const maximumTrendValue = trendSeries.reduce((maximum, row) =>
    availableTrends.reduce((value, key) => hiddenTrends.includes(key) ? value : Math.max(value, row[key]), maximum), 0);
  const roughTickStep = Math.max(maximumTrendValue, 1) / 4;
  const tickMagnitude = 10 ** Math.floor(Math.log10(roughTickStep));
  const tickStep = ([1, 2, 5, 10].find((step) => step * tickMagnitude >= roughTickStep) ?? 10) * tickMagnitude;
  const trendTicks = Array.from({ length: 5 }, (_, index) => index * tickStep);
  const trendMaximum = tickStep * 4;
  const formatTrendTick = (value: number) => value >= 1000 ? `${Number((value / 1000).toFixed(1))}k` : String(value);
  const trendAxisWidth = Math.max(32, ...trendTicks.map((value) => formatTrendTick(value).length * 7 + 8));
  const creatorFilterId = useId();
  const filteredBookings = (data?.bookings ?? []).filter((row) =>
    selectedCreators.length === 0 || selectedCreators.includes(row.createdByUserId),
  );
  const chartConfig = {
    villaNetThb: { label: t({ en: "Net revenue", th: "รายได้สุทธิ" }), color: financialColours.villaNetThb },
    commissionsThb: { label: t({ en: "Commissions", th: "ค่าคอมมิชชั่น" }), color: financialColours.commissionsThb },
    discountsThb: { label: t({ en: "Discounts", th: "ส่วนลด" }), color: financialColours.discountsThb },
    chargedThb: { label: t({ en: "Booking total", th: "ยอดรวมการจอง" }), color: financialColours.chargedThb },
  } satisfies ChartConfig;
  const totals = filteredTotals ?? emptyTotals;
  const cards: Array<{ label: Localized; value: string | number; icon: typeof CalendarCheck2 }> = ownOnly
    ? [
        { label: { en: "Your bookings", th: "การจองของคุณ" }, value: totals.bookingCount, icon: CalendarCheck2 },
        { label: { en: "Booking total", th: "ยอดรวมการจอง" }, value: formatThb(totals.chargedThb, locale), icon: CircleDollarSign },
        { label: { en: "Your earnings", th: "รายได้ของคุณ" }, value: formatThb(totals.commissionsThb, locale), icon: WalletCards },
      ]
    : [
        { label: { en: "Bookings", th: "การจอง" }, value: totals.bookingCount, icon: CalendarCheck2 },
        { label: { en: "Booking total", th: "ยอดรวมการจอง" }, value: formatThb(totals.chargedThb, locale), icon: CircleDollarSign },
        { label: { en: "Discounts", th: "ส่วนลด" }, value: formatThb(totals.discountsThb, locale), icon: ReceiptText },
        { label: { en: "Net revenue", th: "รายได้สุทธิ" }, value: formatThb(totals.villaNetThb, locale), icon: WalletCards },
      ];

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        {cards.map((item) => (
          <Card key={item.label.en} size="sm" className="min-w-0">
            <CardHeader className="gap-0"><CardTitle className="text-[11px] font-medium leading-4 text-muted-foreground">{t(item.label)}</CardTitle><CardAction><item.icon aria-hidden="true" className="hidden size-4 text-muted-foreground" /></CardAction></CardHeader>
            <CardContent>{data ? <p className="break-words text-lg font-semibold tracking-tight tabular-nums">{item.value}</p> : <Skeleton className="h-7 w-3/4" />}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4">
        <Card className="min-w-0">
          <CardHeader className="flex items-center justify-between gap-2 px-4">
            <CardTitle>{ownOnly ? t({ en: "Commission trend", th: "แนวโน้มค่าคอมมิชชั่น" }) : t({ en: "Financial trend", th: "แนวโน้มการเงิน" })}</CardTitle>
            <div className="flex shrink-0 items-center gap-1.5">
            <Select value={chartType} onValueChange={(value) => { if (value === "line" || value === "bar") setChartType(value); }}>
              <SelectTrigger size="sm" className="gap-1 px-1.5 py-0 text-xs data-[size=sm]:h-7" aria-label={t({ en: "Chart type", th: "ประเภทกราฟ" })}>
                <SelectValue>{t(chartType === "line" ? { en: "Line", th: "เส้น" } : { en: "Bar", th: "แท่ง" })}</SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="line">{t({ en: "Line", th: "เส้น" })}</SelectItem>
                <SelectItem value="bar">{t({ en: "Bar", th: "แท่ง" })}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={granularity} onValueChange={(value) => { if (value === "day" || value === "week" || value === "month" || value === "year") setGranularity(value); }}>
              <SelectTrigger size="sm" className="gap-1 px-1.5 py-0 text-xs data-[size=sm]:h-7" aria-label={t({ en: "Chart granularity", th: "ช่วงเวลาของกราฟ" })}>
                <SelectValue>{t(granularities[granularity])}</SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                {(Object.keys(granularities) as Granularity[]).map((value) => <SelectItem key={value} value={value}>{t(granularities[value])}</SelectItem>)}
              </SelectContent>
            </Select>
            </div>
          </CardHeader>
          <CardContent className="min-w-0 px-4">
            {data ? (
              <div className="financial-trend-chart flex min-w-0">
                <div className="relative h-[220px] shrink-0 text-[10px] tabular-nums text-muted-foreground" style={{ width: trendAxisWidth }}>
                  <div className="absolute inset-x-0 top-2 bottom-[30px]">
                    {trendTicks.map((value) => <span key={value} className="absolute right-2 -translate-y-1/2 whitespace-nowrap" style={{ top: `${100 - value / trendMaximum * 100}%` }}>{formatTrendTick(value)}</span>)}
                  </div>
                </div>
              <div className="min-w-0 flex-1 overflow-x-auto" tabIndex={0} role="region" aria-label={t({ en: "Financial trend chart", th: "กราฟแนวโน้มการเงิน" })}>
              <ChartContainer config={chartConfig} className="h-[220px] w-full aspect-auto" style={{ minWidth: trendSeries.length * (chartType === "bar" ? 88 : 72) }}>
                <ComposedChart data={trendSeries} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" height={30} tickLine={false} axisLine={false} tickMargin={8} interval={0} padding={{ left: 0, right: 0 }} tick={({ x, y, index, payload }: { x?: number | string; y?: number | string; index?: number; payload?: { value: string } }) => (
                    <text x={x} y={y} dy="0.71em" fontSize={10} className="fill-muted-foreground" textAnchor={chartType === "bar" ? "middle" : index === 0 ? "start" : index === trendSeries.length - 1 ? "end" : "middle"}>
                      {payload ? formatPeriod(payload.value) : ""}
                    </text>
                  )} />
                  <YAxis hide width={0} domain={[0, trendMaximum]} ticks={trendTicks} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => <div className="flex min-w-36 justify-between gap-3"><span className="text-muted-foreground">{chartConfig[String(name) as keyof typeof chartConfig]?.label}</span><span className="font-mono font-medium">{formatThb(Number(value), locale)}</span></div>} />} />
                  {availableTrends.map((key) => chartType === "line"
                    ? <Line key={key} type="monotone" dataKey={key} hide={hiddenTrends.includes(key)} stroke={chartConfig[key].color} strokeWidth={2} dot={trendSeries.length === 1 ? { r: 3 } : false} isAnimationActive={false} />
                    : <Bar key={key} dataKey={key} hide={hiddenTrends.includes(key)} fill={chartConfig[key].color} radius={[3, 3, 0, 0]} isAnimationActive={false} />)}
                </ComposedChart>
              </ChartContainer>
              </div>
              </div>
            ) : <Skeleton className="h-[220px] w-full" />}
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1" role="group" aria-label={t({ en: "Chart metrics", th: "ตัวชี้วัดในกราฟ" })}>
              {availableTrends.map((key) => {
                const hidden = hiddenTrends.includes(key);
                return <button key={key} type="button" aria-pressed={!hidden} onClick={() => setHiddenTrends((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])} className="flex min-h-6 items-center gap-1.5 rounded-sm text-left text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" style={{ color: chartConfig[key].color }}>
                  <span aria-hidden="true" className="h-0.5 w-4 shrink-0 bg-current" />
                  <span className={hidden ? "line-through opacity-60" : undefined}>{chartConfig[key].label}</span>
                </button>;
              })}
            </div>
          </CardContent>
        </Card>

        {portfolio ? (
          <Card>
            <CardHeader><CardTitle>{t({ en: "Villa performance", th: "ผลการดำเนินงานแต่ละวิลล่า" })}</CardTitle></CardHeader>
            <CardContent className="px-2">
              {data ? <ChartContainer config={chartConfig} className="h-[220px] w-full aspect-auto"><BarChart data={(data.byVilla ?? []).slice(0, 8)} layout="vertical" margin={{ left: 0, right: 8 }}><CartesianGrid horizontal={false} strokeDasharray="3 3" /><XAxis type="number" hide /><YAxis dataKey="villaName" type="category" tickLine={false} axisLine={false} width={80} tick={{ fontSize: 10 }} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="villaNetThb" fill="var(--color-villaNetThb)" radius={[0, 4, 4, 0]} /></BarChart></ChartContainer> : <Skeleton className="h-[220px] w-full" />}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {!portfolio || data?.byUser?.length ? (
        <section className="mt-4 min-w-0 space-y-3">
          <h2 className="text-lg font-semibold">{t({ en: "Bookings by person", th: "การจองแยกตามบุคคล" })}</h2>
      {data?.byUser?.length ? (
          <div>
            <div className="grid gap-4">
              {visiblePeople?.map((row) => <div key={row.userId} className="min-w-0"><p className="truncate text-sm font-medium">{localize(row.name)}</p><div className="mt-2 grid grid-cols-4 gap-1.5"><MobileMetric label={t({ en: "Bookings", th: "การจอง" })} value={row.bookingCount} /><MobileMetric label={t({ en: "Booking total", th: "ยอดรวมการจอง" })} value={formatThb(row.chargedThb, locale)} /><MobileMetric label={t({ en: "Commission", th: "ค่าคอมมิชชั่น" })} value={formatThb(row.commissionsThb, locale)} /><MobileMetric label={t({ en: "Net revenue", th: "รายได้สุทธิ" })} value={formatThb(row.villaNetThb, locale)} /></div></div>)}
            </div>
          </div>
      ) : null}

      {!portfolio ? (
        <div className="min-w-0 space-y-3">
          <fieldset className="min-w-0">
            <legend className="mb-1 w-full text-sm font-medium"><span className="flex items-center justify-between gap-3"><span>{t({ en: "Booked by", th: "จองโดย" })}</span><span>{t({ en: "Bookings", th: "การจอง" })}</span></span></legend>
            <div className="-mx-4 divide-y">
              {data?.filterUsers?.map((person) => (
                <label key={person.userId} htmlFor={`${creatorFilterId}-${person.userId}`} className={`flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2  ${creatorColor(person.userId)}`}>
                  <input id={`${creatorFilterId}-${person.userId}`} type="checkbox" checked={selectedCreators.includes(person.userId)} onChange={(event) => {
                    const checked = event.target.checked;
                    setSelectedCreators((current) => checked ? [...current, person.userId] : current.filter((id) => id !== person.userId));
                  }} className="size-4 shrink-0 accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
                  <span className="min-w-0 flex-1 truncate text-sm" title={localize(person.name)}>{localize(person.name)}</span>
                  <span className="text-sm tabular-nums">{person.bookingCount}<span className="sr-only"> {t({ en: "bookings", th: "การจอง" })}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          {!data && <p className="text-xs text-muted-foreground" role="status">{t({ en: "Loading bookings…", th: "กำลังโหลดการจอง…" })}</p>}
          <div>
            <div className="-mx-4">
              <table className="w-full table-fixed text-[10px] leading-4" aria-label={t({ en: "Booking financials", th: "การเงินของการจอง" })}>
                <colgroup>
                  <col style={{ width: ownOnly ? "28%" : "22%" }} />
                  <col style={{ width: ownOnly ? "25%" : "20%" }} />
                  <col style={{ width: ownOnly ? "25%" : "22%" }} />
                  {!ownOnly && <col style={{ width: "18%" }} />}
                  <col style={{ width: ownOnly ? "22%" : "18%" }} />
                </colgroup>
                <thead className="border-b text-muted-foreground">
                  <tr className="[&>th]:px-1 [&>th]:pb-2 [&>th]:align-bottom [&>th]:font-medium [&>th]:break-words [&>th:first-child]:pl-4 [&>th:last-child]:pr-4">
                    <th scope="col" className="text-left">{t({ en: "Guest name", th: "ชื่อผู้เข้าพัก" })}</th>
                    <th scope="col" className="text-right">{t({ en: "Booking total", th: "ยอดรวมการจอง" })}</th>
                    <th scope="col" className="text-right">{t({ en: "Commission", th: "ค่าคอมมิชชั่น" })}</th>
                    {!ownOnly && <th scope="col" className="text-right">{t({ en: "Net revenue", th: "รายได้สุทธิ" })}</th>}
                    <th scope="col" className="text-right">{t({ en: "Date", th: "วันที่" })}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredBookings.map((row) => (
                    <tr key={row._id} className={`${creatorColor(row.createdByUserId)} [&>td]:px-1 [&>td]:py-3 [&>td]:align-middle [&>td:first-child]:pl-4 [&>td:last-child]:pr-4`}>
                      <td><span className="block truncate font-medium" title={row.guestName}>{row.guestName}</span></td>
                      <td className="text-right tabular-nums break-all">{formatThb(row.totalChargedThb, locale)}</td>
                      <td className="text-right tabular-nums break-all">{formatThb(row.creatorCommissionThb, locale)}</td>
                      {!ownOnly && <td className="text-right tabular-nums break-all">{formatThb(row.villaNetThb, locale)}</td>}
                      <td className="text-right tabular-nums"><time dateTime={row.checkIn} title={formatDate(row.checkIn, locale)}>{new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" }).format(new Date(`${row.checkIn}T00:00:00.000Z`))}</time></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {data && filteredBookings.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t({ en: "No bookings match these filters.", th: "ไม่พบการจองที่ตรงกับตัวกรอง" })}</p>}
        </div>
      ) : null}
        </section>
      ) : null}
    </div>
  );
}
