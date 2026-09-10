"use node";

import { WorkOS } from "@workos-inc/node";
import { action, env } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

export const send = action({
  args: {
    villaId: v.id("villas"),
    email: v.string(),
    role: v.union(v.literal("owner"), v.literal("agent")),
  },
  returns: v.object({ invitationId: v.id("villaInvitations") }),
  handler: async (ctx, args): Promise<{ invitationId: Id<"villaInvitations"> }> => {
    const invitationContext: { inviterUserId: Id<"operationsUsers"> } = await ctx.runQuery(
      internal.team.inviteContext,
      { villaId: args.villaId },
    );
    const { inviterUserId } = invitationContext;
    const apiKey = env.WORKOS_API_KEY;
    const organizationId = env.WORKOS_OPERATIONS_ORGANIZATION_ID;
    if (!apiKey) throw new Error("WorkOS invitation configuration is missing / ยังไม่ได้ตั้งค่าการเชิญผ่าน WorkOS");
    const workos = new WorkOS(apiKey, { clientId: env.WORKOS_CLIENT_ID });
    const invitation = await workos.userManagement.sendInvitation({
      email: args.email.trim().toLowerCase(),
      organizationId,
      roleSlug: args.role === "owner" ? "org-owner" : "org-agent",
      expiresInDays: 14,
    });
    return ctx.runMutation(internal.team.saveInvitation, {
      villaId: args.villaId,
      email: args.email.trim().toLowerCase(),
      role: args.role,
      workosInvitationId: invitation.id,
      inviterUserId,
    });
  },
});
