"use client";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { RoleFinancials } from "@/components/role-financials";
import { PageFrame } from "@/components/page-frame";
import { useLocale } from "@/components/locale-provider";
import { DateRangeFilter, financialQuickRange } from "@/components/date-range-filter";
export default function PortfolioFinancialsPage() {
  const { t } = useLocale();
  const user = useQuery(api.users.current);
  const [range, setRange] = useState(() => financialQuickRange("month"));
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(range.from) && /^\d{4}-\d{2}-\d{2}$/.test(range.to) && range.to >= range.from && Date.parse(range.to) - Date.parse(range.from) < 3660 * 86400000;
  // UI end date is inclusive; queries use an exclusive upper bound.
  const toExclusive = valid ? new Date(Date.parse(`${range.to}T00:00:00Z`) + 86400000).toISOString().slice(0, 10) : "";
  const data = useQuery(api.financials.portfolio, user && valid ? { from: range.from, to: toExclusive } : "skip");
  return <PageFrame><DateRangeFilter {...range} onChange={setRange} />{valid ? <RoleFinancials key={user?.role} role={user?.role ?? "agent"} data={data} from={range.from} to={range.to} /> : <p role="alert" className="text-sm text-destructive">{t({ en: "Choose a valid date range of up to 10 years.", th: "เลือกช่วงวันที่ที่ถูกต้องไม่เกิน 10 ปี" })}</p>}</PageFrame>;
}
