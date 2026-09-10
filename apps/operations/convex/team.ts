import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
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
  args: { villaId: v.id("villas"), email: v.string() },
  returns: v.object({ inviterUserId: v.id("operationsUsers") }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    requirePermission(user, permissions.teamManage);
    if (user.role !== "admin") throw new Error("Admin access required / เฉพาะผู้ดูแลเท่านั้น");
    const villa = await ctx.db.get(args.villaId);
    if (!villa || villa.archived) throw new Error("Villa not found / ไม่พบวิลล่า");
    await assertNotAssigned(ctx, args.villaId, args.email);
    return { inviterUserId: user._id };
  },
});

export const saveInvitation = internalMutation({
  args: {
    villaId: v.id("villas"),
    email: v.string(),
    role: v.union(v.literal("owner"), v.literal("agent")),
    workosInvitationId: v.optional(v.string()),
    verifiedWorkosUserId: v.optional(v.string()),
    inviterUserId: v.id("operationsUsers"),
  },
  returns: v.object({ status: v.union(v.literal("added"), v.literal("invited")) }),
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx);
    requirePermission(actor, permissions.teamManage);
    if (actor.role !== "admin" || actor._id !== args.inviterUserId) throw new ConvexError("Admin access required / เฉพาะผู้ดูแลเท่านั้น");
    const villa = await ctx.db.get(args.villaId);
    if (!villa || villa.archived) throw new ConvexError("Villa not found / ไม่พบวิลล่า");
    await assertNotAssigned(ctx, args.villaId, args.email);
    ctx = activityContext(ctx, actor, args.villaId);
    if (args.verifiedWorkosUserId) {
      const person = await ctx.db.query("operationsUsers").withIndex("by_email", q => q.eq("email", args.email)).unique();
      if (person && (person.workosUserId === args.verifiedWorkosUserId || person.workosUserId.endsWith(`|${args.verifiedWorkosUserId}`))) {
        await ctx.db.insert("villaAssignments", { villaId: args.villaId, userId: person._id, role: args.role, createdAt: Date.now() });
        return { status: "added" as const };
      }
    }
    if (!args.verifiedWorkosUserId && !args.workosInvitationId) throw new ConvexError("Invitation is missing / ไม่พบคำเชิญ");
    await ctx.db.insert("villaInvitations", {
      villaId: args.villaId,
      email: args.email.toLowerCase(),
      role: args.role,
      workosInvitationId: args.workosInvitationId,
      verifiedWorkosUserId: args.verifiedWorkosUserId,
      status: "pending",
      invitedByUserId: args.inviterUserId,
      createdAt: Date.now(),
    });
    return { status: args.verifiedWorkosUserId ? "added" as const : "invited" as const };
  },
});

async function assertNotAssigned(ctx: import("./_generated/server").QueryCtx, villaId: import("./_generated/dataModel").Id<"villas">, email: string) {
  const person = await ctx.db.query("operationsUsers").withIndex("by_email", q => q.eq("email", email)).unique();
  if (person && await ctx.db.query("villaAssignments").withIndex("by_userId_and_villaId", q => q.eq("userId", person._id).eq("villaId", villaId)).unique()) throw new ConvexError("This person already has access to this villa / บุคคลนี้มีสิทธิ์เข้าถึงวิลล่านี้แล้ว");
  const pending = await ctx.db.query("villaInvitations").withIndex("by_email_and_status", q => q.eq("email", email).eq("status", "pending")).collect();
  if (pending.some(row => row.villaId === villaId && (row.verifiedWorkosUserId || row.createdAt + 14 * 86400000 > Date.now()))) throw new ConvexError("Access or an invitation is already pending for this villa / มีสิทธิ์หรือคำเชิญที่รอดำเนินการสำหรับวิลล่านี้แล้ว");
}

async function requireTeamAdmin(ctx: import("./_generated/server").QueryCtx) {
  const user = await requireUser(ctx);
  requirePermission(user, permissions.teamManage);
  if (user.role !== "admin") throw new ConvexError("Admin access required / เฉพาะผู้ดูแลเท่านั้น");
  return user;
}

export const removeMember = mutation({
  args: { assignmentId: v.id("villaAssignments") },
  returns: v.null(),
  handler: async (ctx, { assignmentId }) => {
    const actor = await requireTeamAdmin(ctx);
    const assignment = await ctx.db.get(assignmentId);
    if (!assignment) return null;
    ctx = activityContext(ctx, actor, assignment.villaId);
    await ctx.db.delete(assignmentId);
    return null;
  },
});

export const cancellationContext = internalQuery({
  args: { invitationId: v.id("villaInvitations") },
  returns: v.object({ workosInvitationId: v.optional(v.string()), pending: v.boolean() }),
  handler: async (ctx, { invitationId }) => {
    await requireTeamAdmin(ctx);
    const invitation = await ctx.db.get(invitationId);
    if (!invitation) throw new ConvexError("Invitation not found / ไม่พบคำเชิญ");
    if (invitation.status === "accepted") throw new ConvexError("This invitation has been accepted. Remove the member from the villa instead / คำเชิญนี้ได้รับการตอบรับแล้ว กรุณาลบสมาชิกออกจากวิลล่าแทน");
    return { workosInvitationId: invitation.workosInvitationId, pending: invitation.status === "pending" };
  },
});

export const markInvitationCancelled = internalMutation({
  args: { invitationId: v.id("villaInvitations") },
  returns: v.null(),
  handler: async (ctx, { invitationId }) => {
    const actor = await requireTeamAdmin(ctx);
    const invitation = await ctx.db.get(invitationId);
    if (!invitation) throw new ConvexError("Invitation not found / ไม่พบคำเชิญ");
    if (invitation.status === "accepted") throw new ConvexError("This invitation has been accepted. Remove the member from the villa instead / คำเชิญนี้ได้รับการตอบรับแล้ว กรุณาลบสมาชิกออกจากวิลล่าแทน");
    if (invitation.status !== "pending") return null;
    ctx = activityContext(ctx, actor, invitation.villaId);
    await ctx.db.patch(invitationId, { status: "revoked" });
    return null;
  },
});
