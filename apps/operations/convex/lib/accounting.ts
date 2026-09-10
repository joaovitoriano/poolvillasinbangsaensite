import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export function creationDay(booking: Pick<Doc<"bookings">, "createdAt">) {
  return new Date(booking.createdAt + 7 * 3600000).toISOString().slice(0, 10);
}

export function bookingAmounts(booking: Doc<"bookings">) {
  const confirmed = booking.status === "confirmed";
  const commissionsThb = confirmed ? booking.creatorCommissionThb : (booking.retainedCommissionThb ?? 0);
  const chargedThb = confirmed ? booking.totalChargedThb : 0;
  return { bookingCount: confirmed ? 1 : 0, grossThb: confirmed ? booking.subtotalThb : 0,
    discountsThb: confirmed ? booking.discountThb : 0, chargedThb, commissionsThb, villaNetThb: chargedThb - commissionsThb };
}

export function accountingRange(from: string, to: string) {
  const parse = (day: string) => {
    const utc = Date.parse(`${day}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(utc) || new Date(utc).toISOString().slice(0, 10) !== day) throw new Error("Invalid date / วันที่ไม่ถูกต้อง");
    return utc - 7 * 3600000;
  };
  const start = parse(from), end = parse(to);
  if (end <= start || end - start > 3660 * 86400000) throw new Error("Choose a valid date range of up to 10 years / เลือกช่วงวันที่ที่ถูกต้องไม่เกิน 10 ปี");
  return { start, end };
}

export async function accountingBookings(ctx: QueryCtx, villaId: Doc<"villas">["_id"], from: string, to: string, creatorId?: Doc<"operationsUsers">["_id"]) {
  const { start, end } = accountingRange(from, to);
  const rows = await (creatorId
    ? ctx.db.query("bookings").withIndex("by_villa_creator_and_createdAt", q => q.eq("villaId", villaId).eq("createdByUserId", creatorId).gte("createdAt", start).lt("createdAt", end))
    : ctx.db.query("bookings").withIndex("by_villa_and_createdAt", q => q.eq("villaId", villaId).gte("createdAt", start).lt("createdAt", end))).take(2001);
  if (rows.length > 2000) throw new Error("Too many bookings. Choose a shorter date range / มีการจองมากเกินไป กรุณาเลือกช่วงวันที่ให้สั้นลง");
  return rows.filter(row => row.status === "confirmed" || (row.retainedCommissionThb ?? 0) > 0);
}
