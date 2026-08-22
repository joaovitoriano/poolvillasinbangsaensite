import { v } from "convex/values";
import { env, type MutationCtx, type QueryCtx } from "../_generated/server";

export const effectiveRoleValidator = v.union(v.literal("admin"), v.literal("superadmin"));

export const sessionUserValidator = v.object({
  workosUserId: v.string(),
  role: effectiveRoleValidator,
});

export type EffectiveRole = "admin" | "superadmin";
export type SessionUser = {
  workosUserId: string;
  role: EffectiveRole;
};

function rolesFromClaims(claims: Record<string, unknown>) {
  const roles = new Set<string>();
  if (typeof claims.role === "string") roles.add(claims.role);
  if (Array.isArray(claims.roles)) {
    for (const role of claims.roles) if (typeof role === "string") roles.add(role);
  }
  return roles;
}

export async function getSessionUser(ctx: QueryCtx | MutationCtx): Promise<SessionUser | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const claims = identity as unknown as Record<string, unknown>;
  const roles = rolesFromClaims(claims);
  if (
    claims.org_id !== env.WORKOS_ORGANIZATION_ID ||
    (!roles.has("admin") && !roles.has("superadmin"))
  ) return null;

  return {
    workosUserId: identity.subject,
    role: roles.has("superadmin") ? "superadmin" : "admin",
  };
}

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const user = await getSessionUser(ctx);
  if (!user) throw new Error("Administrator access required");
  return user;
}

export const requireAdmin = requireUser;

export async function requireSuperadmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireUser(ctx);
  if (user.role !== "superadmin") throw new Error("Superadmin access required");
  return user;
}
