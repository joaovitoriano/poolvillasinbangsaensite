import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";

export const get = query({
  args: { from: v.string(), to: v.string(), weekFrom: v.string(), weekTo: v.string() }, returns: v.any(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const weekLength = (Date.parse(args.weekTo) - Date.parse(args.weekFrom)) / 86400000;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.weekFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(args.weekTo) || weekLength !== 7 || args.from >= args.to) throw new Error("Invalid date range / ช่วงวันที่ไม่ถูกต้อง");
    let villas: Doc<"villas">[];
    if (user.role === "admin") villas = await ctx.db.query("villas").take(201);
    else {
      const assigned = await ctx.db.query("villaAssignments").withIndex("by_userId_and_villaId", q => q.eq("userId", user._id)).take(201);
      if (assigned.length > 200) throw new Error("Too many villas / มีวิลล่ามากเกินไป");
      villas = (await Promise.all(assigned.filter(a => a.role === user.role).map(a => ctx.db.get(a.villaId)))).filter((villa): villa is Doc<"villas"> => villa !== null);
    }
    if (villas.length > 200) throw new Error("Too many villas / มีวิลล่ามากเกินไป");
    const totals = { bookingCount: 0, chargedThb: 0, commissionsThb: 0, villaNetThb: 0 };
    const week: Array<{ id: string; villaId: string; villaName: string; kind: "booking" | "closed"; name: string; from: string; to: string }> = [];
    for (const villa of villas) {
      const rows = await (user.role === "agent"
        ? ctx.db.query("bookings").withIndex("by_villa_creator_and_createdAt", q => q.eq("villaId", villa._id).eq("createdByUserId", user._id)).filter(q => q.and(q.gte(q.field("checkIn"), args.from), q.lt(q.field("checkIn"), args.to)))
        : ctx.db.query("bookings").withIndex("by_villaId_and_checkIn", q => q.eq("villaId", villa._id).gte("checkIn", args.from).lt("checkIn", args.to))).take(2001);
      if (rows.length > 2000) throw new Error("Too many bookings / มีการจองมากเกินไป");
      for (const row of rows) if (row.status === "confirmed") {
        totals.bookingCount++; totals.chargedThb += row.totalChargedThb; totals.commissionsThb += row.creatorCommissionThb;
        if (user.role !== "agent") totals.villaNetThb += row.villaNetThb;
      }
      if (user.role === "owner") {
        const [nights, closures] = await Promise.all([
          ctx.db.query("bookingNights").withIndex("by_villaId_and_date", q => q.eq("villaId", villa._id).gte("date", args.weekFrom).lt("date", args.weekTo)).take(8),
          ctx.db.query("closedDateNights").withIndex("by_villa_and_date", q => q.eq("villaId", villa._id).gte("date", args.weekFrom).lt("date", args.weekTo)).take(8),
        ]);
        for (const id of new Set(nights.map(n => n.bookingId))) {
          const booking = await ctx.db.get(id);
          if (booking) week.push({ id, villaId: villa._id, villaName: villa.name, kind: "booking", name: (await ctx.db.get(booking.guestId))?.name ?? "", from: booking.checkIn, to: booking.checkOut });
        }
        for (const id of new Set(closures.map(n => n.closedDateId))) {
          const closed = await ctx.db.get(id);
          if (closed) week.push({ id, villaId: villa._id, villaName: villa.name, kind: "closed", name: "", from: closed.from, to: closed.to });
        }
      }
    }
    const { villaNetThb, ...ownTotals } = totals;
    return { totals: user.role === "agent" ? ownTotals : { ...ownTotals, villaNetThb }, activeVillas: villas.filter(villa => !villa.archived).length, week: week.sort((a, b) => a.from.localeCompare(b.from)) };
  },
});
