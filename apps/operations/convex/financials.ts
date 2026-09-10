import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { permissions, requirePermission, requireUser, requireVillaAccess } from "./lib/auth";

function accountingDay(asOf?: string) {
  const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  if (asOf !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || new Date(`${asOf}T00:00:00Z`).toISOString().slice(0, 10) !== asOf)) throw new Error("Invalid date / วันที่ไม่ถูกต้อง");
  return asOf && asOf < today ? asOf : today;
}

function totals(bookings: Doc<"bookings">[]) {
  return bookings.reduce(
    (sum, booking) => ({
      bookingCount: sum.bookingCount + 1,
      grossThb: sum.grossThb + booking.subtotalThb,
      discountsThb: sum.discountsThb + booking.discountThb,
      chargedThb: sum.chargedThb + booking.totalChargedThb,
      commissionsThb: sum.commissionsThb + booking.creatorCommissionThb,
      villaNetThb: sum.villaNetThb + booking.villaNetThb,
    }),
    { bookingCount: 0, grossThb: 0, discountsThb: 0, chargedThb: 0, commissionsThb: 0, villaNetThb: 0 },
  );
}

function dailySeries(bookings: Doc<"bookings">[]) {
  const groups = new Map<string, Doc<"bookings">[]>();
  for (const booking of bookings) {
    const group = groups.get(booking.checkIn) ?? [];
    group.push(booking);
    groups.set(booking.checkIn, group);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([date, rows]) => ({ date, ...totals(rows) }));
}

async function villaBookings(ctx: Parameters<typeof requireUser>[0], villaId: Doc<"villas">["_id"], from: string, to: string, asOf?: string) {
  const rows = await ctx.db
    .query("bookings")
    .withIndex("by_villaId_and_checkIn", (q) => q.eq("villaId", villaId).gte("checkIn", from).lt("checkIn", to))
    .take(2001);
  if (rows.length > 2000) {
    throw new Error("Too many bookings. Choose a shorter date range / มีการจองมากเกินไป กรุณาเลือกช่วงวันที่ให้สั้นลง");
  }
  return rows.filter((booking) => booking.status === "confirmed" && booking.checkIn <= accountingDay(asOf));
}

export const villa = query({
  args: { villaId: v.id("villas"), from: v.string(), to: v.string(), asOf: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role === "agent") throw new Error("Villa financials are unavailable for agents / เอเจนต์ไม่สามารถเข้าถึงการเงินของวิลล่าได้");
    await requireVillaAccess(ctx, user, args.villaId);
    const bookings = await villaBookings(ctx, args.villaId, args.from, args.to, args.asOf);
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
        .sort((a, b) => b.checkIn.localeCompare(a.checkIn))
        .map(async (booking) => {
          const guest = await ctx.db.get(booking.guestId);
          return {
            ...booking,
            guestName: guest?.name ?? "Unknown / ไม่ทราบ",
            creatorName: personMap.get(booking.createdByUserId)?.name ?? "Unknown / ไม่ทราบ",
          };
        }),
    );
    const filterUsers = filterUserIds.map((userId) => ({
      userId,
      name: personMap.get(userId)?.name ?? personMap.get(userId)?.email ?? "Unknown / ไม่ทราบ",
      bookingCount: bookings.filter((booking) => booking.createdByUserId === userId).length,
    })).sort((a, b) => a.name.localeCompare(b.name));
    return { totals: totals(bookings), byUser, filterUsers, series, bookings: bookingRows };
  },
});

export const portfolio = query({
  args: { from: v.string(), to: v.string(), asOf: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role === "admin") requirePermission(user, permissions.financialsReadPortfolio);
    const start = Date.parse(`${args.from}T00:00:00Z`), end = Date.parse(`${args.to}T00:00:00Z`);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 3660 * 86400000) throw new Error("Choose a valid date range of up to 10 years / เลือกช่วงวันที่ที่ถูกต้องไม่เกิน 10 ปี");
    let villas: Doc<"villas">[];
    if (user.role === "admin") villas = await ctx.db.query("villas").withIndex("by_archived_and_name").take(201);
    else {
      const assignments = await ctx.db.query("villaAssignments").withIndex("by_userId_and_villaId", q => q.eq("userId", user._id)).take(201);
      if (assignments.length > 200) throw new Error("Too many villas / มีวิลล่ามากเกินไป");
      villas = (await Promise.all(assignments.map(row => ctx.db.get(row.villaId)))).filter((villa): villa is Doc<"villas"> => villa !== null);
    }
    if (villas.length > 200) throw new Error("Too many villas / มีวิลล่ามากเกินไป");
    const allBookings = await Promise.all(villas.map(async villa => {
      if (user.role !== "agent") return villaBookings(ctx, villa._id, args.from, args.to, args.asOf);
      const rows = await ctx.db.query("bookings").withIndex("by_villa_creator_checkIn", q => q.eq("villaId", villa._id).eq("createdByUserId", user._id).gte("checkIn", args.from).lt("checkIn", args.to)).take(2001);
      if (rows.length > 2000) throw new Error("Too many bookings. Choose a shorter date range / มีการจองมากเกินไป กรุณาเลือกช่วงวันที่ให้สั้นลง");
      return rows.filter(row => row.status === "confirmed" && row.checkIn <= accountingDay(args.asOf));
    }));
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
