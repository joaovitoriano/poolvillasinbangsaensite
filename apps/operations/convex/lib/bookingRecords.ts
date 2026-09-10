import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { resolvePricingPreset } from "./pricing";
import { saveGuest, type GuestDetails } from "./guests";

import { calculateCommission, type CommissionMode } from "./commission";

const MAX_BOOKING_NIGHTS = 90;

export type BookingDetails = GuestDetails & {
  checkIn: string;
  checkOut: string;
  discountThb: number;
  commissionMode: CommissionMode;
  commissionValue: number;
  notes?: string;
};

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Invalid date / วันที่ไม่ถูกต้อง");
  return date;
}

function datesBetween(checkIn: string, checkOut: string) {
  const start = parseDate(checkIn);
  const end = parseDate(checkOut);
  if (end <= start) throw new Error("Check-out must be after check-in / วันเช็กเอาต์ต้องอยู่หลังวันเช็กอิน");
  const result: string[] = [];
  for (let date = start; date < end; date = new Date(date.getTime() + 86_400_000)) {
    result.push(date.toISOString().slice(0, 10));
    if (result.length > MAX_BOOKING_NIGHTS) throw new Error("A booking cannot exceed 90 nights / การจองต้องไม่เกิน 90 คืน");
  }
  return result;
}

async function priceNights(ctx: MutationCtx, villaId: Id<"villas">, dates: string[]) {
  const presets = await ctx.db
    .query("pricingPresets")
    .withIndex("by_villaId_and_active", (q) => q.eq("villaId", villaId).eq("active", true))
    .take(100);
  const fallback = presets.find((preset) => preset.isDefault);
  if (!fallback) throw new Error("This villa needs a default pricing preset / วิลล่านี้ต้องมีชุดราคาเริ่มต้น");
  return dates.map((date) => {
    const preset = resolvePricingPreset(presets, date).preset ?? fallback;
    return {
      date,
      nightlyPriceThb: preset.nightlyPriceThb,
      presetId: preset._id,
      presetName: preset.name,
    };
  });
}

async function assertAvailable(ctx: MutationCtx, villaId: Id<"villas">, dates: string[], excludedBookingId?: Id<"bookings">) {
  for (const date of dates) {
    const closed = await ctx.db.query("closedDateNights").withIndex("by_villa_and_date", (q) => q.eq("villaId", villaId).eq("date", date)).first();
    if (closed) throw new Error(`Villa is closed on ${date} / วิลล่าปิดในวันที่ ${date}`);
    const nights = await ctx.db
      .query("bookingNights")
      .withIndex("by_villaId_and_date", (q) => q.eq("villaId", villaId).eq("date", date))
      .take(5);
    if (nights.some((night) => night.bookingId !== excludedBookingId)) throw new Error(`Villa is already booked on ${date} / วิลล่าถูกจองแล้วในวันที่ ${date}`);
  }
}

function financials(subtotalThb: number, discountThb: number, creatorCommissionThb: number) {
  if (![subtotalThb, discountThb, creatorCommissionThb].every(Number.isFinite)) throw new Error("Enter valid financial amounts / กรอกจำนวนเงินให้ถูกต้อง");
  if (discountThb < 0 || creatorCommissionThb < 0) throw new Error("Discount and commission cannot be negative / ส่วนลดและค่าคอมมิชชั่นต้องไม่ติดลบ");
  const totalChargedThb = subtotalThb - discountThb;
  if (totalChargedThb < 0) throw new Error("Discount cannot exceed the booking subtotal / ส่วนลดต้องไม่เกินยอดรวมการจอง");
  if (creatorCommissionThb > totalChargedThb) throw new Error("Commission cannot exceed the booking total / ค่าคอมมิชชั่นต้องไม่เกินยอดรวมการจอง");
  return { totalChargedThb, villaNetThb: totalChargedThb - creatorCommissionThb };
}

export async function createBookingRecord(
  ctx: MutationCtx,
  villaId: Id<"villas">,
  details: BookingDetails,
  creator: Doc<"operationsUsers">,
  now = Date.now(),
) {
  const dates = datesBetween(details.checkIn, details.checkOut);
  await assertAvailable(ctx, villaId, dates);
  const nights = await priceNights(ctx, villaId, dates);
  const subtotalThb = nights.reduce((sum, night) => sum + night.nightlyPriceThb, 0);
  const creatorCommissionThb = calculateCommission(subtotalThb - details.discountThb, details.commissionMode, details.commissionValue);
  const totals = financials(subtotalThb, details.discountThb, creatorCommissionThb);
  const guestId = await saveGuest(ctx, details, now);
  const bookingId = await ctx.db.insert("bookings", {
    villaId,
    guestId,
    checkIn: details.checkIn,
    checkOut: details.checkOut,
    status: "confirmed",
    subtotalThb,
    discountThb: details.discountThb,
    totalChargedThb: totals.totalChargedThb,
    creatorCommissionThb,
    commissionMode: details.commissionMode,
    commissionValue: details.commissionValue,
    villaNetThb: totals.villaNetThb,
    notes: details.notes?.trim() || undefined,
    createdByUserId: creator._id,
    createdByRole: creator.role,
    createdAt: now,
    updatedAt: now,
  });
  for (const night of nights) await ctx.db.insert("bookingNights", { bookingId, villaId, ...night });
  return bookingId;
}

export async function updateBookingRecord(ctx: MutationCtx, booking: Doc<"bookings">, details: BookingDetails, now = Date.now()) {
  const dates = datesBetween(details.checkIn, details.checkOut);
  await assertAvailable(ctx, booking.villaId, dates, booking._id);
  const nights = await priceNights(ctx, booking.villaId, dates);
  const subtotalThb = nights.reduce((sum, night) => sum + night.nightlyPriceThb, 0);
  const creatorCommissionThb = calculateCommission(subtotalThb - details.discountThb, details.commissionMode, details.commissionValue);
  const totals = financials(subtotalThb, details.discountThb, creatorCommissionThb);
  const guestId = await saveGuest(ctx, { ...details, guestId: details.guestId ?? booking.guestId }, now);
  const oldNights = await ctx.db
    .query("bookingNights")
    .withIndex("by_bookingId_and_date", (q) => q.eq("bookingId", booking._id))
    .take(MAX_BOOKING_NIGHTS);
  for (const night of oldNights) await ctx.db.delete(night._id);
  for (const night of nights) await ctx.db.insert("bookingNights", { bookingId: booking._id, villaId: booking.villaId, ...night });
  await ctx.db.patch(booking._id, {
    guestId,
    checkIn: details.checkIn,
    checkOut: details.checkOut,
    subtotalThb,
    discountThb: details.discountThb,
    totalChargedThb: totals.totalChargedThb,
    creatorCommissionThb,
    commissionMode: details.commissionMode,
    commissionValue: details.commissionValue,
    villaNetThb: totals.villaNetThb,
    notes: details.notes?.trim() || undefined,
    updatedAt: now,
  });
}

export async function cancelBookingRecord(ctx: MutationCtx, booking: Doc<"bookings">, now = Date.now()) {
  const nights = await ctx.db
    .query("bookingNights")
    .withIndex("by_bookingId_and_date", (q) => q.eq("bookingId", booking._id))
    .take(MAX_BOOKING_NIGHTS);
  for (const night of nights) await ctx.db.delete(night._id);
  await ctx.db.patch(booking._id, { status: "cancelled", cancelledAt: now, updatedAt: now });
}
