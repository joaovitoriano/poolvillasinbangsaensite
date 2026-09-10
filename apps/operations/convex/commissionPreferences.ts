import { query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { requireUser, requireVillaAccess } from "./lib/auth";
import type { CommissionMode } from "./lib/commission";

export async function saveCommissionPreference(ctx: MutationCtx, userId: Id<"operationsUsers">, villaId: Id<"villas">, mode: CommissionMode, value: number) {
  const existing = await ctx.db.query("commissionPreferences")
    .withIndex("by_user_and_villa", (q) => q.eq("userId", userId).eq("villaId", villaId)).unique();
  if (existing) await ctx.db.patch(existing._id, { mode, value });
  else await ctx.db.insert("commissionPreferences", { userId, villaId, mode, value });
}

export const get = query({
  args: { villaId: v.id("villas") },
  returns: v.union(v.null(), v.object({ mode: v.union(v.literal("amount"), v.literal("percentage")), value: v.number() })),
  handler: async (ctx, { villaId }) => {
    const user = await requireUser(ctx);
    await requireVillaAccess(ctx, user, villaId);
    const preference = await ctx.db.query("commissionPreferences")
      .withIndex("by_user_and_villa", (q) => q.eq("userId", user._id).eq("villaId", villaId)).unique();
    return preference ? { mode: preference.mode, value: preference.value } : null;
  },
});
