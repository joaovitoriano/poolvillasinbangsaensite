import { activityContext } from "./lib/activity";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { permissions, requirePermission, requireUser, requireVillaAccess } from "./lib/auth";

const villaSummary = v.object({
  _id: v.id("villas"),
  name: v.string(),
  contactName: v.string(),
  contactLineId: v.string(),
  contactPhone: v.string(),
  archived: v.boolean(),
  role: v.union(v.literal("admin"), v.literal("owner"), v.literal("agent")),
});

export const listAccessible = query({
  args: { includeArchived: v.optional(v.boolean()) },
  returns: v.array(villaSummary),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    let villas;
    const assignedRoles = new Map<string, "owner" | "agent">();
    if (user.role === "admin") {
      villas = args.includeArchived
        ? await ctx.db.query("villas").order("desc").take(200)
        : await ctx.db.query("villas").withIndex("by_archived_and_name", (q) => q.eq("archived", false)).take(200);
    } else {
      const assignments = await ctx.db
        .query("villaAssignments")
        .withIndex("by_userId_and_villaId", (q) => q.eq("userId", user._id))
        .take(200);
      for (const assignment of assignments.filter(row => row.role === user.role)) assignedRoles.set(assignment.villaId, assignment.role);
      villas = (await Promise.all(assignments.filter(row => row.role === user.role).map((assignment) => ctx.db.get(assignment.villaId)))).filter(
        (villa): villa is Doc<"villas"> => villa !== null && (args.includeArchived || !villa.archived),
      );
    }
    return villas
      .map((villa) => ({
        _id: villa._id,
        name: villa.name,
        contactName: villa.contactName,
        contactLineId: villa.contactLineId,
        contactPhone: villa.contactPhone,
        archived: villa.archived,
        role: user.role === "admin" ? "admin" as const : assignedRoles.get(villa._id)!,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const get = query({
  args: { villaId: v.id("villas") },
  returns: v.union(v.null(), villaSummary),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const role = await requireVillaAccess(ctx, user, args.villaId);
    const villa = await ctx.db.get(args.villaId);
    if (!villa) return null;
    return {
      _id: villa._id,
      name: villa.name,
      contactName: villa.contactName,
      contactLineId: villa.contactLineId,
      contactPhone: villa.contactPhone,
      archived: villa.archived,
      role,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    contactName: v.string(),
    contactLineId: v.string(),
    contactPhone: v.string(),
    defaultNightlyPriceThb: v.number(),
  },
  returns: v.object({ villaId: v.id("villas") }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    ctx = activityContext(ctx, user, "villaId" in args ? args.villaId as Parameters<typeof activityContext>[2] : undefined);
    requirePermission(user, permissions.villasManage);
    if (user.role !== "admin") throw new Error("Admin access required / เฉพาะผู้ดูแลเท่านั้น");
    if (!args.name.trim()) throw new Error("Villa name is required / กรุณาระบุชื่อวิลล่า");
    if (!Number.isFinite(args.defaultNightlyPriceThb) || args.defaultNightlyPriceThb < 0) throw new Error("Enter a valid non-negative price / กรอกราคาที่ถูกต้องและไม่ติดลบ");
    const now = Date.now();
    const villaId = await ctx.db.insert("villas", {
      name: args.name.trim(),
      contactName: args.contactName.trim(),
      contactLineId: args.contactLineId.trim(),
      contactPhone: args.contactPhone.trim(),
      archived: false,
      createdByUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("pricingPresets", {
      villaId,
      name: "Default",
      nightlyPriceThb: args.defaultNightlyPriceThb,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      sortOrder: 0,
      isDefault: true,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    return { villaId };
  },
});

export const update = mutation({
  args: {
    villaId: v.id("villas"),
    name: v.string(),
    contactName: v.string(),
    contactLineId: v.string(),
    contactPhone: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    ctx = activityContext(ctx, user, "villaId" in args ? args.villaId as Parameters<typeof activityContext>[2] : undefined);
    requirePermission(user, permissions.villasManage);
    if (user.role !== "admin") throw new Error("Admin access required / เฉพาะผู้ดูแลเท่านั้น");
    await ctx.db.patch(args.villaId, {
      name: args.name.trim(),
      contactName: args.contactName.trim(),
      contactLineId: args.contactLineId.trim(),
      contactPhone: args.contactPhone.trim(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const setArchived = mutation({
  args: { villaId: v.id("villas"), archived: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    ctx = activityContext(ctx, user, "villaId" in args ? args.villaId as Parameters<typeof activityContext>[2] : undefined);
    requirePermission(user, permissions.villasManage);
    if (user.role !== "admin") throw new Error("Admin access required / เฉพาะผู้ดูแลเท่านั้น");
    await ctx.db.patch(args.villaId, { archived: args.archived, updatedAt: Date.now() });
    return null;
  },
});
