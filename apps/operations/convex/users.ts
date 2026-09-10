import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { identityClaims, requireUser } from "./lib/auth";
import { activityContext } from "./lib/activity";

export const syncCurrent = mutation({
  args: {},
  returns: v.object({ userId: v.id("operationsUsers") }),
  handler: async (ctx) => {
    const claims = await identityClaims(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query("operationsUsers")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", claims.workosUserId))
      .unique();
    let userId;
    if (existing) {
      ctx = activityContext(ctx, existing);
      userId = existing._id;
      await ctx.db.patch(userId, {
        email: claims.email,
        avatarUrl: claims.avatarUrl,
        permissions: claims.permissions,
        role: claims.role,
        active: true,
        lastSeenAt: now,
      });
    } else {
      userId = await ctx.db.insert("operationsUsers", {
        workosUserId: claims.workosUserId,
        email: claims.email,
        name: claims.name,
        avatarUrl: claims.avatarUrl,
        permissions: claims.permissions,
        role: claims.role,
        active: true,
        lastSeenAt: now,
      });
    }

    const actor = await ctx.db.get(userId);
    if (actor && !existing) {
      await ctx.db.insert("activity", { actorId: userId, actorName: actor.name, entity: "operationsUsers", entityId: userId, action: "created", changes: [{ field: "name", before: "", after: actor.name }, { field: "email", before: "", after: actor.email }, { field: "role", before: "", after: actor.role }, { field: "active", before: "", after: "true" }], createdAt: now });
      ctx = activityContext(ctx, actor);
    }
    const invitations = await ctx.db
      .query("villaInvitations")
      .withIndex("by_email_and_status", (q) => q.eq("email", claims.email).eq("status", "pending"))
      .take(50);
    for (const invitation of invitations) {
      const assignment = await ctx.db
        .query("villaAssignments")
        .withIndex("by_userId_and_villaId", (q) => q.eq("userId", userId).eq("villaId", invitation.villaId))
        .unique();
      if (!assignment) {
        await ctx.db.insert("villaAssignments", {
          villaId: invitation.villaId,
          userId,
          role: invitation.role,
          createdAt: now,
        });
      }
      await ctx.db.patch(invitation._id, { status: "accepted", acceptedAt: now });
    }
    return { userId };
  },
});

export const current = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("operationsUsers"),
      email: v.string(),
      name: v.string(),
      phone: v.optional(v.string()),
      lineId: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      role: v.union(v.literal("admin"), v.literal("owner"), v.literal("agent")),
      permissions: v.array(v.string()),
    }),
  ),
  handler: async (ctx) => {
    try {
      const user = await requireUser(ctx);
      return {
        _id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        lineId: user.lineId,
        avatarUrl: user.avatarUrl,
        role: user.role,
        permissions: user.permissions,
      };
    } catch {
      return null;
    }
  },
});

export const updateProfile = mutation({
  args: { name: v.string(), phone: v.optional(v.string()), lineId: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    ctx = activityContext(ctx, user);
    if (!args.name.trim()) throw new Error("Name is required / กรุณาระบุชื่อ");
    await ctx.db.patch(user._id, { name: args.name.trim(), phone: args.phone?.trim() || undefined, lineId: args.lineId?.trim() || undefined });
    return null;
  },
});
