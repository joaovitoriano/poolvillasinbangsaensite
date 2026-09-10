import { activityContext } from "./lib/activity";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { canEditBooking, permissions, requirePermission, requireUser, requireVillaAccess } from "./lib/auth";
import { cancelBookingRecord } from "./lib/bookingRecords";
import { canManageClosedDate, cancelClosedDate } from "./lib/closedDates";

export const get = query({
  args: { closedDateId: v.id("closedDates") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const closed = await ctx.db.get(args.closedDateId);
    if (!closed) return null;
    await requireVillaAccess(ctx, user, closed.villaId);
    return { ...closed, canManage: user.role === "admin" ? user.permissions.includes(permissions.bookingsManage) : closed.createdByUserId === user._id && user.permissions.includes(permissions.bookingsUpdateOwn) };
  },
});

export const save = mutation({
  args: { villaId: v.id("villas"), closedDateId: v.optional(v.id("closedDates")), bookingId: v.optional(v.id("bookings")), confirmCancellation: v.boolean(), deleteCommission: v.boolean(), from: v.string(), to: v.string(), notes: v.optional(v.string()) },
  returns: v.id("closedDates"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    ctx = activityContext(ctx, user, args.villaId, args.bookingId ? "bookingToClosedDate" : undefined);
    await requireVillaAccess(ctx, user, args.villaId);
    requirePermission(user, permissions.bookingsCreate);
    const parse = (value: string) => {
      const time = Date.parse(`${value}T00:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) throw new Error("Invalid date / วันที่ไม่ถูกต้อง");
      return time;
    };
    const start = parse(args.from), end = parse(args.to);
    const count = (end - start) / 86400000 + 1;
    if (count < 1 || count > 500) throw new Error("Choose a range of 1–500 days / เลือกช่วงวันที่ระหว่าง 1–500 วัน");
    if (args.bookingId && args.closedDateId) throw new Error("Invalid conversion / การเปลี่ยนประเภทไม่ถูกต้อง");
    const existing = args.closedDateId ? await ctx.db.get(args.closedDateId) : null;
    if (args.closedDateId) {
      if (!existing || existing.villaId !== args.villaId || existing.status !== "active") throw new Error("Closed date not found / ไม่พบวันที่ปิด");
      await canManageClosedDate(ctx, user, existing);
    }
    if (args.bookingId) {
      const booking = await ctx.db.get(args.bookingId);
      if (!booking || booking.villaId !== args.villaId || booking.status !== "confirmed") throw new Error("Active booking not found / ไม่พบการจองที่ใช้งานอยู่");
      await canEditBooking(ctx, user, booking);
      if (!args.confirmCancellation) throw new Error("Confirm booking cancellation first / กรุณายืนยันการยกเลิกการจองก่อน");
      await cancelBookingRecord(ctx, booking, args.deleteCommission);
    }
    const dates = Array.from({ length: count }, (_, index) => new Date(start + index * 86400000).toISOString().slice(0, 10));
    for (const date of dates) {
      const booking = await ctx.db.query("bookingNights").withIndex("by_villaId_and_date", (q) => q.eq("villaId", args.villaId).eq("date", date)).first();
      const closed = await ctx.db.query("closedDateNights").withIndex("by_villa_and_date", (q) => q.eq("villaId", args.villaId).eq("date", date)).first();
      if (booking || (closed && closed.closedDateId !== args.closedDateId)) throw new Error(`Date unavailable: ${date} / วันที่ไม่ว่าง: ${date}`);
    }
    if (existing) await cancelClosedDate(ctx, existing);
    const values = { villaId: args.villaId, from: args.from, to: args.to, notes: args.notes?.trim() || undefined, status: "active" as const, updatedAt: Date.now() };
    const id = existing ? existing._id : await ctx.db.insert("closedDates", { ...values, createdByUserId: user._id, createdAt: Date.now() });
    if (existing) await ctx.db.patch(id, values);
    for (const date of dates) await ctx.db.insert("closedDateNights", { villaId: args.villaId, closedDateId: id, date });
    return id;
  },
});

export const cancel = mutation({
  args: { closedDateId: v.id("closedDates") }, returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    ctx = activityContext(ctx, user, "villaId" in args ? args.villaId as Parameters<typeof activityContext>[2] : undefined);
    const closed = await ctx.db.get(args.closedDateId);
    if (!closed) throw new Error("Closed date not found / ไม่พบวันที่ปิด");
    await canManageClosedDate(ctx, user, closed);
    await cancelClosedDate(ctx, closed);
    return null;
  },
});
