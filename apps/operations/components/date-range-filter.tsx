"use client";

import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type QuickRangePeriod = "month" | "quarter" | "year";

export function financialQuickRange(period: QuickRangePeriod) {
  const now = new Date(Date.now() + 7 * 3600000), year = now.getUTCFullYear();
  const month = period === "year" ? 0 : period === "quarter" ? Math.floor(now.getUTCMonth() / 3) * 3 : now.getUTCMonth();
  return { from: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10), to: new Date(Date.UTC(year, month + (period === "year" ? 12 : period === "quarter" ? 3 : 1), 0)).toISOString().slice(0, 10) };
}

export function DateRangeFilter({ from, to, onChange }: { from: string; to: string; onChange: (range: { from: string; to: string }) => void }) {
  const { t } = useLocale();
  return (
    <div className="grid w-full gap-3">
      <div className="grid grid-cols-2 items-end gap-0 bg-white">
        <div className="grid min-w-0 gap-1"><Label htmlFor="financial-from" className="text-[11px] text-muted-foreground">{t({ en: "From", th: "ตั้งแต่" })}</Label><Input id="financial-from" type="date" value={from} onChange={(event) => onChange({ from: event.target.value, to })} className="rounded-tr-none rounded-br-none border-r-0 w-full text-sm" /></div>
        <div className="grid min-w-0 gap-1"><Label htmlFor="financial-to" className="text-[11px] text-muted-foreground">{t({ en: "To", th: "ถึง" })}</Label><Input id="financial-to" type="date" value={to} onChange={(event) => onChange({ from, to: event.target.value })} className="rounded-tl-none rounded-bl-none border-l-0 w-full text-sm" /></div>
      </div>
      <div className="grid grid-cols-3 gap-2">{(["month", "quarter", "year"] as const).map(period => {
        const target = financialQuickRange(period), active = target.from === from && target.to === to;
        return <Button key={period} variant={active ? "secondary" : "ghost"} size="sm" className="h-8 text-xs" aria-pressed={active} onClick={() => onChange(target)}>{t(period === "month" ? { en: "Month", th: "เดือน" } : period === "quarter" ? { en: "Quarter", th: "ไตรมาส" } : { en: "Year", th: "ปี" })}</Button>;
      })}</div>
    </div>
  );
}
