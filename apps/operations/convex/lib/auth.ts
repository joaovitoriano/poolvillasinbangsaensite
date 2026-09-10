import { env, type MutationCtx, type QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export type OperationsRole = "admin" | "owner" | "agent";
type Ctx = QueryCtx | MutationCtx;

export const permissions = {
  villasReadAssigned: "ops:villas:read-assigned",
  villasManage: "ops:villas:manage",
  bookingsReadAssigned: "ops:bookings:read-assigned",
  bookingsReadOwn: "ops:bookings:read-own",
  bookingsCreate: "ops:bookings:create",
  bookingsUpdateOwn: "ops:bookings:update-own",
  bookingsManage: "ops:bookings:manage",
  financialsReadVilla: "ops:financials:read-villa",
  financialsReadOwnForVilla: "ops:financials:read-own-for-villa",
  financialsReadPortfolio: "ops:financials:read-portfolio",
  settingsManage: "ops:settings:manage",
  teamManage: "ops:team:manage",
} as const;

function claimString(identity: Record<string, unknown>, key: string) {
  const value = identity[key];
  return typeof value === "string" ? value : undefined;
}

function claimStrings(identity: Record<string, unknown>, key: string) {
  const value = identity[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function roleFromPermissions(items: string[]): OperationsRole {
  if (items.includes(permissions.villasManage)) return "admin";
  if (items.includes(permissions.bookingsReadAssigned)) return "owner";
  return "agent";
}

export async function identityClaims(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated / ยังไม่ได้เข้าสู่ระบบ");
  const claims = identity as unknown as Record<string, unknown>;
  const organizationId = claimString(claims, "org_id") ?? claimString(claims, "organization_id");
  if (organizationId !== env.WORKOS_OPERATIONS_ORGANIZATION_ID) {
    throw new Error("This account is not a member of the operations organization / บัญชีนี้ไม่ได้เป็นสมาชิกขององค์กรระบบจัดการ");
  }
  const email = claimString(claims, "email") ?? "";
  const firstName = claimString(claims, "first_name") ?? "";
  const lastName = claimString(claims, "last_name") ?? "";
  const name = [firstName, lastName].filter(Boolean).join(" ") || email;
  const workosUserId = identity.tokenIdentifier;
  const userPermissions = claimStrings(claims, "permissions");
  return {
    workosUserId,
    email: email.toLowerCase(),
    name,
    avatarUrl: claimString(claims, "profile_picture_url"),
    permissions: userPermissions,
    role: roleFromPermissions(userPermissions),
  };
}

export async function requireUser(ctx: Ctx): Promise<Doc<"operationsUsers">> {
  const claims = await identityClaims(ctx);
  const user = await ctx.db
    .query("operationsUsers")
    .withIndex("by_workosUserId", (q) => q.eq("workosUserId", claims.workosUserId))
    .unique();
  if (!user || !user.active) throw new Error("Operations profile is not active / โปรไฟล์ระบบจัดการยังไม่เปิดใช้งาน");
  return user;
}

export function requirePermission(user: Doc<"operationsUsers">, permission: string) {
  if (!user.permissions.includes(permission)) throw new Error("Permission denied / ไม่มีสิทธิ์ดำเนินการ");
}

export async function requireVillaAccess(ctx: Ctx, user: Doc<"operationsUsers">, villaId: Id<"villas">) {
  if (user.role === "admin") return;
  const assignment = await ctx.db
    .query("villaAssignments")
    .withIndex("by_userId_and_villaId", (q) => q.eq("userId", user._id).eq("villaId", villaId))
    .unique();
  if (!assignment) throw new Error("Villa access denied / ไม่มีสิทธิ์เข้าถึงวิลล่านี้");
}

export async function canEditBooking(ctx: Ctx, user: Doc<"operationsUsers">, booking: Doc<"bookings">) {
  await requireVillaAccess(ctx, user, booking.villaId);
  if (user.role === "admin") {
    requirePermission(user, permissions.bookingsManage);
    return;
  }
  if (booking.createdByUserId !== user._id) throw new Error("You can only change your own bookings / คุณแก้ไขได้เฉพาะการจองของตนเอง");
  requirePermission(user, permissions.bookingsUpdateOwn);
}
