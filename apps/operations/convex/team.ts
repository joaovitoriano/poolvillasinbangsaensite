import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { permissions, requirePermission, requireUser } from "./lib/auth";
import { activityContext } from "./lib/activity";

export const listForVilla = query({
  args: { villaId: v.id("villas") },
  returns: v.object({ members: v.array(v.any()), invitations: v.array(v.any()) }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requirePermission(user, permissions.teamManage);
    if (user.role !== "admin") throw new Error("Admin access required / เฉพาะผู้ดูแลเท่านั้น");
    const assignments = await ctx.db
      .query("villaAssignments")
      .withIndex("by_villaId_and_userId", (q) => q.eq("villaId", args.villaId))
      .take(200);
    const members = await Promise.all(
      assignments.map(async (assignment) => ({ ...assignment, user: await ctx.db.get(assignment.userId) })),
    );
    const invitations = await ctx.db
      .query("villaInvitations")
      .withIndex("by_villaId_and_status", (q) => q.eq("villaId", args.villaId).eq("status", "pending"))
      .take(100);
    return { members, invitations };
  },
});

export const inviteContext = internalQuery({
  args: { villaId: v.id("villas") },
  returns: v.object({ inviterUserId: v.id("operationsUsers") }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requirePermission(user, permissions.teamManage);
    if (user.role !== "admin") throw new Error("Admin access required / เฉพาะผู้ดูแลเท่านั้น");
    const villa = await ctx.db.get(args.villaId);
    if (!villa || villa.archived) throw new Error("Villa not found / ไม่พบวิลล่า");
    return { inviterUserId: user._id };
  },
});

export const saveInvitation = internalMutation({
  args: {
    villaId: v.id("villas"),
    email: v.string(),
    role: v.union(v.literal("owner"), v.literal("agent")),
    workosInvitationId: v.string(),
    inviterUserId: v.id("operationsUsers"),
  },
  returns: v.object({ invitationId: v.id("villaInvitations") }),
  handler: async (ctx, args) => {
    if ("inviterUserId" in args) {
      const actor = await ctx.db.get(args.inviterUserId);
      if (!actor) throw new Error("Inviter not found / ไม่พบผู้เชิญ");
      ctx = activityContext(ctx, actor, args.villaId);
    }
    const invitationId = await ctx.db.insert("villaInvitations", {
      villaId: args.villaId,
      email: args.email.toLowerCase(),
      role: args.role,
      workosInvitationId: args.workosInvitationId,
      status: "pending",
      invitedByUserId: args.inviterUserId,
      createdAt: Date.now(),
    });
    return { invitationId };
  },
});
