import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { permissions, requirePermission, requireUser, requireVillaAccess } from "./lib/auth";

import { accountingBookings, accountingRange, bookingAmounts, creationDay } from "./lib/accounting";

function totals(bookings: Doc<"bookings">[]) {
  return bookings.map(bookingAmounts).reduce((sum, row) => ({
    bookingCount: sum.bookingCount + row.bookingCount, grossThb: sum.grossThb + row.grossThb,
    discountsThb: sum.discountsThb + row.discountsThb, chargedThb: sum.chargedThb + row.chargedThb,
    commissionsThb: sum.commissionsThb + row.commissionsThb, villaNetThb: sum.villaNetThb + row.villaNetThb,
  }), { bookingCount: 0, grossThb: 0, discountsThb: 0, chargedThb: 0, commissionsThb: 0, villaNetThb: 0 });
}

function dailySeries(bookings: Doc<"bookings">[]) {
  const groups = new Map<string, Doc<"bookings">[]>();
  for (const booking of bookings) {
    const group = groups.get(creationDay(booking)) ?? [];
    group.push(booking);
    groups.set(creationDay(booking), group);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([date, rows]) => ({ date, ...totals(rows) }));
}

export const villa = query({
  args: { villaId: v.id("villas"), from: v.string(), to: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const villaRole = await requireVillaAccess(ctx, user, args.villaId);
    if (villaRole === "agent") throw new Error("Villa financials are unavailable for agents / เอเจนต์ไม่สามารถเข้าถึงการเงินของวิลล่าได้");
    const bookings = await accountingBookings(ctx, args.villaId, args.from, args.to);
    const userIds = [...new Set(bookings.map((booking) => booking.createdByUserId))];
    const assignments = await ctx.db.query("villaAssignments")
      .withIndex("by_villaId_and_userId", (q) => q.eq("villaId", args.villaId)).take(1001);
    if (assignments.length > 1000) throw new Error("Too many villa users / มีผู้ใช้ของวิลล่ามากเกินไป");
    const filterUserIds = [...new Set([...assignments.map((assignment) => assignment.userId), ...userIds])];
    const people = await Promise.all(filterUserIds.map((id) => ctx.db.get(id)));
    const personMap = new Map(people.filter(Boolean).map((person) => [person!._id, person!]));
    const byUser = userIds.map((userId) => {
      const rows = bookings.filter((booking) => booking.createdByUserId === userId);
      const person = personMap.get(userId);
      return {
        userId,
        name: person?.name ?? person?.email ?? "Unknown / ไม่ทราบ",
        role: person?.role ?? "agent",
        ...totals(rows),
      };
    });
    const series = dailySeries(bookings);
    const bookingRows = await Promise.all(
      bookings
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (booking) => {
          const guest = await ctx.db.get(booking.guestId);
          return {
            ...booking,
            accounting: bookingAmounts(booking), accountingDate: creationDay(booking),
            guestName: guest?.name ?? "Unknown / ไม่ทราบ",
            creatorName: personMap.get(booking.createdByUserId)?.name ?? "Unknown / ไม่ทราบ",
          };
        }),
    );
    const filterUsers = filterUserIds.map((userId) => ({
      userId,
      name: personMap.get(userId)?.name ?? personMap.get(userId)?.email ?? "Unknown / ไม่ทราบ",
      bookingCount: bookings.filter((booking) => booking.createdByUserId === userId && booking.status === "confirmed").length,
    })).sort((a, b) => a.name.localeCompare(b.name));
    return { totals: totals(bookings), byUser, filterUsers, series, bookings: bookingRows };
  },
});

export const portfolio = query({
  args: { from: v.string(), to: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role === "admin") requirePermission(user, permissions.financialsReadPortfolio);
    accountingRange(args.from, args.to);
    let villas: Doc<"villas">[];
    if (user.role === "admin") villas = await ctx.db.query("villas").withIndex("by_archived_and_name").take(201);
    else {
      const assignments = await ctx.db.query("villaAssignments").withIndex("by_userId_and_villaId", q => q.eq("userId", user._id)).take(201);
      if (assignments.length > 200) throw new Error("Too many villas / มีวิลล่ามากเกินไป");
      villas = (await Promise.all(assignments.filter(row => row.role === user.role).map(row => ctx.db.get(row.villaId)))).filter((villa): villa is Doc<"villas"> => villa !== null);
    }
    if (villas.length > 200) throw new Error("Too many villas / มีวิลล่ามากเกินไป");
    const allBookings = await Promise.all(villas.map(villa => accountingBookings(ctx, villa._id, args.from, args.to, user.role === "agent" ? user._id : undefined)));
    const flattened = allBookings.flat();
    if (user.role === "agent") {
      const own = (value: ReturnType<typeof totals>) => ({ chargedThb: value.chargedThb, commissionsThb: value.commissionsThb, bookingCount: value.bookingCount });
      return {
        totals: own(totals(flattened)),
        byVilla: villas.map((villa, index) => ({ villaId: villa._id, villaName: villa.name, ...own(totals(allBookings[index])) })),
        series: dailySeries(flattened).map(row => ({ date: row.date, ...own(row) })),
        byUser: [], byVillaUser: [],
      };
    }
    const names = new Map(await Promise.all([...new Set(flattened.map(row => row.createdByUserId))].map(async id => [id, (await ctx.db.get(id))?.name ?? "Unknown / ไม่ทราบ"] as const)));
    function people(rows: Doc<"bookings">[]) {
      const groups = new Map<Doc<"bookings">["createdByUserId"], Doc<"bookings">[]>();
      for (const row of rows) {
        const group = groups.get(row.createdByUserId) ?? [];
        group.push(row); groups.set(row.createdByUserId, group);
      }
      return [...groups].map(([userId, bookings]) => ({ userId, name: names.get(userId)!, ...totals(bookings) }));
    }
    return {
      totals: totals(flattened),
      byVilla: villas.map((villa, index) => ({ villaId: villa._id, villaName: villa.name, ...totals(allBookings[index]) })),
      byUser: people(flattened),
      byVillaUser: villas.flatMap((villa, index) => people(allBookings[index]).map(person => ({ ...person, villaId: villa._id }))),
      series: dailySeries(flattened),
    };
  },
});
