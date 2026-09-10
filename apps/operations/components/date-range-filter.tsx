"use client";

import { useLocale } from "@/components/locale-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DateRangeFilter({ from, to, onChange }: { from: string; to: string; onChange: (range: { from: string; to: string }) => void }) {
  const { t } = useLocale();
  return (
    <div className="grid w-full grid-cols-2 items-end gap-0 bg-white">
      <div className="grid min-w-0 gap-1"><Label htmlFor="financial-from" className="text-[11px] text-muted-foreground">{t({ en: "From", th: "ตั้งแต่" })}</Label><Input id="financial-from" type="date" value={from} onChange={(event) => onChange({ from: event.target.value, to })} className="rounded-tr-none rounded-br-none border-r-0 w-full text-sm" /></div>
      <div className="grid min-w-0 gap-1"><Label htmlFor="financial-to" className="text-[11px] text-muted-foreground">{t({ en: "To", th: "ถึง" })}</Label><Input id="financial-to" type="date" value={to} onChange={(event) => onChange({ from, to: event.target.value })} className="rounded-tl-none rounded-bl-none border-l-0 w-full text-sm" /></div>
    </div>
  );
}
