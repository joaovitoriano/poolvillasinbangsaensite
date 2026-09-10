"use client";
import { useBangkokDay } from "@/hooks/use-bangkok-day";

import { useParams, redirect } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { FinancialDashboard } from "@/components/financial-dashboard";
import { PageFrame } from "@/components/page-frame";
import { currentYearRange } from "@/lib/format";
import { useState } from "react";
import { DateRangeFilter } from "@/components/date-range-filter";

export default function VillaFinancialsPage() {
  const params = useParams<{ villaId: string }>();
  const villaId = params.villaId as Id<"villas">;
  const villa = useQuery(api.villas.get, { villaId });
  const asOf = useBangkokDay();
  const user = useQuery(api.users.current);
  const [range, setRange] = useState(() => { const range = currentYearRange(); return { ...range, to: `${range.from.slice(0, 4)}-12-31` }; });
  const valid = Boolean(range.from && range.to && range.to >= range.from);
  const toExclusive = valid ? new Date(Date.parse(`${range.to}T00:00:00Z`) + 86400000).toISOString().slice(0, 10) : "";
  const data = useQuery(api.financials.villa, user && user.role !== "agent" && valid ? { villaId, from: range.from, to: toExclusive, asOf } : "skip");
  if (user?.role === "agent") redirect(`/ops/villas/${villaId}/calendar`);
  const ownOnly = false;
  return <PageFrame title={{ en: `${villa?.name ?? "Villa"} financials`, th: `การเงิน ${villa?.name ?? "วิลล่า"}` }} mobileTitle={{ en: "Financials", th: "การเงิน" }} description={ownOnly ? { en: "Your commissions and the bookings that produced them.", th: "ค่าคอมมิชชั่นของคุณและรายการจองที่เกี่ยวข้อง" } : { en: "Villa totals and a booking list broken down by person.", th: "ยอดรวมของวิลล่าและรายการจองแยกตามบุคคล" }} action={<DateRangeFilter {...range} onChange={setRange} />}><FinancialDashboard data={data} ownOnly={ownOnly} /></PageFrame>;
}
