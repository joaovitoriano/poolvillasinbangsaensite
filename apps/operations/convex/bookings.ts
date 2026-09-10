import { activityContext } from "./lib/activity";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import {
  canEditBooking,
  permissions,
  requirePermission,
  requireUser,
  requireVillaAccess,
} from "./lib/auth";
import { saveCommissionPreference } from "./commissionPreferences";
import { canManageClosedDate, cancelClosedDate } from "./lib/closedDates";
import { cancelBookingRecord, createBookingRecord, updateBookingRecord } from "./lib/bookingRecords";

const MAX_BOOKING_NIGHTS = 90;

function todayInBangkok() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function hydrateGuest(ctx: QueryCtx, booking: Doc<"bookings">) {
  const guest = await ctx.db.get(booking.guestId);
  return {
    ...booking,
    guestName: guest?.name ?? "Unknown / ไม่ทราบ",
    guestPhone: guest?.phone ?? "",
    guestLineId: guest?.lineId,
  };
}

export const listForVilla = query({
  args: { villaId: v.id("villas"), from: v.string(), to: v.string(), limit: v.optional(v.number()) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const villaRole = await requireVillaAccess(ctx, user, args.villaId);
    const limit = Math.max(1, Math.min(args.limit ?? 200, 500));
    const orderedBookings = ctx.db.query("bookings").withIndex("by_villa_and_createdAt", (q) => q.eq("villaId", args.villaId));
    const bookings = await orderedBookings
      .filter((q) => q.and(q.gte(q.field("checkIn"), args.from), q.lt(q.field("checkIn"), args.to)))
      .order("desc")
      .take(limit);
    return Promise.all(bookings.map(async (booking) => {
      const [creator, hydrated] = await Promise.all([
        ctx.db.get(booking.createdByUserId),
        hydrateGuest(ctx, booking),
      ]);
      const restricted = villaRole === "agent" && booking.createdByUserId !== user._id;
      return { ...hydrated, guestId: restricted ? undefined : hydrated.guestId, guestPhone: restricted ? "••••••••" : hydrated.guestPhone, guestLineId: restricted ? "••••••••" : hydrated.guestLineId, contactsHidden: restricted, creatorName: creator?.name ?? creator?.email ?? "Unknown / ไม่ทราบ" };
    }));
  },
});

export const get = query({
  args: { bookingId: v.id("bookings") },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) return null;
    const villaRole = await requireVillaAccess(ctx, user, booking.villaId);
    const restricted = villaRole === "agent" && booking.createdByUserId !== user._id;
    const nights = await ctx.db
      .query("bookingNights")
      .withIndex("by_bookingId_and_date", (q) => q.eq("bookingId", booking._id))
      .take(MAX_BOOKING_NIGHTS);
    const hydrated = await hydrateGuest(ctx, booking);
    return { ...hydrated, guestId: restricted ? undefined : hydrated.guestId, guestPhone: restricted ? "••••••••" : hydrated.guestPhone, guestLineId: restricted ? "••••••••" : hydrated.guestLineId, contactsHidden: restricted, canEdit: booking.status === "confirmed" && (user.role === "admin" || booking.createdByUserId === user._id), nights };
  },
});

export const create = mutation({
  args: {
    closedDateId: v.optional(v.id("closedDates")),
    villaId: v.id("villas"),
    guestId: v.optional(v.id("guests")),
    guestName: v.string(),
    guestPhone: v.string(),
    guestLineId: v.optional(v.string()),
    checkIn: v.string(),
    checkOut: v.string(),
    discountMode: v.union(v.literal("amount"), v.literal("percentage")),
    discountValue: v.number(),
    commissionMode: v.union(v.literal("amount"), v.literal("percentage")),
    commissionValue: v.number(),
    notes: v.optional(v.string()),
  },
  returns: v.object({ bookingId: v.id("bookings") }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    ctx = activityContext(ctx, user, args.villaId, args.closedDateId ? "closedDateToBooking" : undefined);
    requirePermission(user, permissions.bookingsCreate);
    await requireVillaAccess(ctx, user, args.villaId);
    if (args.checkIn < todayInBangkok()) throw new Error("New bookings cannot start before today / การจองใหม่ต้องเริ่มตั้งแต่วันนี้เป็นต้นไป");
    if (args.closedDateId) {
      const closed = await ctx.db.get(args.closedDateId);
      if (!closed || closed.villaId !== args.villaId || closed.status !== "active") throw new Error("Closed date not found / ไม่พบวันที่ปิด");
      await canManageClosedDate(ctx, user, closed);
      await cancelClosedDate(ctx, closed);
    }
    const bookingId = await createBookingRecord(ctx, args.villaId, args, user);
    await saveCommissionPreference(ctx, user._id, args.villaId, args.commissionMode, args.commissionValue);
    return { bookingId };
  },
});

export const update = mutation({
  args: {
    bookingId: v.id("bookings"),
    guestId: v.optional(v.id("guests")),
    guestName: v.string(),
    guestPhone: v.string(),
    guestLineId: v.optional(v.string()),
    checkIn: v.string(),
    checkOut: v.string(),
    discountMode: v.union(v.literal("amount"), v.literal("percentage")),
    discountValue: v.number(),
    commissionMode: v.union(v.literal("amount"), v.literal("percentage")),
    commissionValue: v.number(),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    ctx = activityContext(ctx, user, "villaId" in args ? args.villaId as Parameters<typeof activityContext>[2] : undefined);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.status === "cancelled") throw new Error("Booking not found / ไม่พบการจอง");
    await canEditBooking(ctx, user, booking);
    await updateBookingRecord(ctx, booking, args);
    if (booking.createdByUserId === user._id) await saveCommissionPreference(ctx, user._id, booking.villaId, args.commissionMode, args.commissionValue);
    return null;
  },
});

export const cancel = mutation({
  args: { bookingId: v.id("bookings"), deleteCommission: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    ctx = activityContext(ctx, user, "villaId" in args ? args.villaId as Parameters<typeof activityContext>[2] : undefined);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.status === "cancelled") return null;
    await canEditBooking(ctx, user, booking);
    await cancelBookingRecord(ctx, booking, args.deleteCommission);
    return null;
  },
});
