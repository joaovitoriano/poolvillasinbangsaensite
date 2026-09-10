import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, requireVillaAccess } from "./lib/auth";
import { pricingPresetMatches } from "./lib/pricing";

const DAY_MS = 86_400_000;

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("Invalid calendar date / วันที่ในปฏิทินไม่ถูกต้อง");
  }
  return date.getTime();
}

export const range = query({
  args: { villaId: v.id("villas"), from: v.string(), to: v.string() },
  returns: v.object({
    days: v.array(v.object({
      date: v.string(),
      booked: v.boolean(),
      closedDateId: v.union(v.id("closedDates"), v.null()),
      nightlyPriceThb: v.union(v.number(), v.null()),
      presetName: v.union(v.string(), v.null()),
      isDefault: v.boolean(),
    })),
    bookings: v.array(v.object({
      _id: v.id("bookings"),
      checkIn: v.string(),
      checkOut: v.string(),
      guestName: v.string(),
    })),
  }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireVillaAccess(ctx, user, args.villaId);
    const start = parseDate(args.from);
    const end = parseDate(args.to);
    const dayCount = (end - start) / DAY_MS;
    if (dayCount <= 0 || dayCount > 500) {
      throw new Error("Calendar range must be between 1 and 500 days / ช่วงปฏิทินต้องอยู่ระหว่าง 1 ถึง 500 วัน");
    }
    const [nights, presets, closedNights] = await Promise.all([
      ctx.db.query("bookingNights")
        .withIndex("by_villaId_and_date", (q) => q.eq("villaId", args.villaId).gte("date", args.from).lt("date", args.to))
        .take(dayCount + 1),
      ctx.db.query("pricingPresets")
        .withIndex("by_villaId_and_active", (q) => q.eq("villaId", args.villaId).eq("active", true))
        .take(101),
      ctx.db.query("closedDateNights").withIndex("by_villa_and_date", (q) => q.eq("villaId", args.villaId).gte("date", args.from).lt("date", args.to)).take(dayCount + 1),
    ]);
    // One villa can have only one occupied night per date. Fail rather than
    // silently mark dates available if stored data ever violates that bound.
    if (nights.length > dayCount || closedNights.length > dayCount || presets.length > 100) {
      throw new Error("Calendar data exceeds the supported limit / ข้อมูลปฏิทินเกินขีดจำกัดที่รองรับ");
    }
    const ids = [...new Set(nights.map((night) => night.bookingId))];
    const bookings = (await Promise.all(ids.map((id) => ctx.db.get(id)))).filter((booking) => booking !== null);
    const hydratedBookings = await Promise.all(bookings.map(async (booking) => {
      const guest = await ctx.db.get(booking.guestId);
      return { _id: booking._id, checkIn: booking.checkIn, checkOut: booking.checkOut, guestName: guest?.name ?? "Unknown / ไม่ทราบ" };
    }));
    const bookedDates = new Set(nights.map((night) => night.date));
    const closedByDate = new Map(closedNights.map((night) => [night.date, night.closedDateId]));
    const orderedPresets = presets.sort((a, b) => a.sortOrder - b.sortOrder);
    const defaultPreset = orderedPresets.find((preset) => preset.isDefault);
    const overrides = orderedPresets.filter((preset) => !preset.isDefault);
    const days = Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(start + index * DAY_MS).toISOString().slice(0, 10);
      const preset = overrides.find((item) => pricingPresetMatches(item, date)) ?? defaultPreset;
      return {
        date,
        booked: bookedDates.has(date),
        closedDateId: closedByDate.get(date) ?? null,
        nightlyPriceThb: preset?.nightlyPriceThb ?? null,
        presetName: preset?.name ?? null,
        isDefault: preset?.isDefault ?? false,
      };
    });
    return { days, bookings: hydratedBookings };
  },
});
