"use node";
import { WorkOS } from "@workos-inc/node";
import { action, env } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";

export const send = action({
  args: { villaId: v.id("villas"), email: v.string(), role: v.union(v.literal("owner"), v.literal("agent")) },
  returns: v.object({ status: v.union(v.literal("added"), v.literal("invited")) }),
  handler: async (ctx, args): Promise<{ status: "added" | "invited" }> => {
    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ConvexError("Enter a valid email address / กรุณากรอกอีเมลให้ถูกต้อง");
    const { inviterUserId } = await ctx.runQuery(internal.team.inviteContext, { villaId: args.villaId, email });
    if (!env.WORKOS_API_KEY || !env.WORKOS_OPERATIONS_ORGANIZATION_ID) throw new ConvexError("Invitation service is unavailable. Please try again later / ระบบเชิญไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง");
    const workos = new WorkOS(env.WORKOS_API_KEY, { clientId: env.WORKOS_CLIENT_ID });
    const organizationId = env.WORKOS_OPERATIONS_ORGANIZATION_ID;
    const details = { villaId: args.villaId, email, role: args.role, inviterUserId };
    try {
      const users = await workos.userManagement.listUsers({ email });
      const person = users.data.find(user => user.email.toLowerCase() === email);
      if (person) {
        const memberships = await workos.userManagement.listOrganizationMemberships({ userId: person.id, organizationId });
        const membership = memberships.data.find(row => row.organizationId === organizationId);
        if (membership?.status === "inactive") throw new ConvexError("This organization membership is inactive / สมาชิกภาพในองค์กรนี้ถูกระงับอยู่");
        if (membership?.status === "active") {
          if (membership.role.slug !== `org-${args.role}`) throw new ConvexError("The selected role does not match this person's organization role / บทบาทที่เลือกไม่ตรงกับบทบาทในองค์กรของบุคคลนี้");
          return await ctx.runMutation(internal.team.saveInvitation, { ...details, verifiedWorkosUserId: person.id });
        }
      }
      const invitations = await workos.userManagement.listInvitations({ organizationId, email });
      const pending = invitations.data.find(row => row.state === "pending" && Date.parse(row.expiresAt) > Date.now());
      if (pending) throw new ConvexError("This person already has a pending organization invitation. Add them after they accept it / บุคคลนี้มีคำเชิญเข้าองค์กรที่รอตอบรับอยู่ กรุณาเพิ่มหลังจากตอบรับแล้ว");
      const invitation = await workos.userManagement.sendInvitation({ email, organizationId, roleSlug: `org-${args.role}`, expiresInDays: 14 });
      return await ctx.runMutation(internal.team.saveInvitation, { ...details, workosInvitationId: invitation.id });
    } catch (error) {
      if (error instanceof ConvexError) throw error;
      throw new ConvexError("Could not add this person. Please try again / ไม่สามารถเพิ่มบุคคลนี้ได้ กรุณาลองอีกครั้ง");
    }
  },
});
