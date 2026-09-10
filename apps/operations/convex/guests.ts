import { query } from "./_generated/server";
import { v } from "convex/values";
import { permissions, requirePermission, requireUser } from "./lib/auth";
import { normalizeGuestName } from "./lib/guests";

const guestSuggestion = v.object({
  _id: v.id("guests"),
  name: v.string(),
  phone: v.string(),
  lineId: v.optional(v.string()),
});

export const search = query({
  args: { name: v.string() },
  returns: v.array(guestSuggestion),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requirePermission(user, permissions.bookingsCreate);
    const prefix = normalizeGuestName(args.name);
    if (!prefix) return [];
    const guests = await ctx.db
      .query("guests")
      .withIndex("by_normalizedName", (q) => q.gte("normalizedName", prefix).lt("normalizedName", `${prefix}\uffff`))
      .take(8);
    const assignments = user.role === "owner" ? await ctx.db.query("villaAssignments").withIndex("by_userId_and_villaId", q => q.eq("userId", user._id)).take(201) : [];
    if (assignments.length > 200) throw new Error("Too many villas / มีวิลล่ามากเกินไป");
    const visible = user.role === "admin" ? guests : (await Promise.all(guests.map(async guest => {
      if (user.role === "agent") {
        const own = await ctx.db.query("bookings").withIndex("by_guest_and_creator", q => q.eq("guestId", guest._id).eq("createdByUserId", user._id)).first();
        return own ? guest : null;
      }
      for (const assignment of assignments) {
        const booking = await ctx.db.query("bookings").withIndex("by_guest_and_villa", q => q.eq("guestId", guest._id).eq("villaId", assignment.villaId)).first();
        if (booking) return guest;
      }
      return null;
    }))).filter(guest => guest !== null);
    return visible.map((guest) => ({
      _id: guest._id,
      name: guest.name,
      phone: guest.phone,
      lineId: guest.lineId,
    }));
  },
});
