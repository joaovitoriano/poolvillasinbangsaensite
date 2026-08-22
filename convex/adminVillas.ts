import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { villaStatusValidator } from "./lib/validators";
import { requireAdmin } from "./lib/access";
import { writeAudit } from "./lib/audit";
import {
  amenityDocumentValidator,
  houseRuleDocumentValidator,
  villaDocumentValidator,
} from "./lib/documentValidators";

export const list = query({
  args: {},
  returns: v.array(villaDocumentValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("villas").withIndex("by_sortOrder").take(200);
  },
});

export const listAmenities = query({
  args: {},
  returns: v.array(amenityDocumentValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("amenities").take(200);
  },
});

export const listHouseRules = query({
  args: {},
  returns: v.array(houseRuleDocumentValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("houseRules").take(200);
  },
});

export const reorderVillas = mutation({
  args: { villaIds: v.array(v.id("villas")) },
  returns: v.object({
    villaIds: v.array(v.id("villas")),
    updatedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    if (args.villaIds.length > 200)
      throw new Error("At most 200 villas can be reordered at once / จัดลำดับวิลล่าได้ไม่เกิน 200 รายการต่อครั้ง");
    if (new Set(args.villaIds).size !== args.villaIds.length)
      throw new Error("Villa order contains duplicate IDs / ลำดับวิลล่ามีรหัสซ้ำ");
    const existing = await ctx.db
      .query("villas")
      .withIndex("by_sortOrder")
      .take(201);
    if (existing.length > 200)
      throw new Error("Villa reordering exceeds the supported limit");
    if (existing.length !== args.villaIds.length)
      throw new Error("Villa order must include every villa exactly once");
    const existingIds = new Set(existing.map((villa) => villa._id));
    if (args.villaIds.some((villaId) => !existingIds.has(villaId)))
      throw new Error("Villa order contains an unknown villa");
    const updatedAt = Date.now();
    for (let sortOrder = 0; sortOrder < args.villaIds.length; sortOrder += 1)
      await ctx.db.patch("villas", args.villaIds[sortOrder], {
        sortOrder,
        updatedAt,
      });
    await writeAudit(
      ctx,
      actor,
      "update",
      "villa_order",
      "global",
    );
    return { villaIds: args.villaIds, updatedAt };
  },
});

export const setStatus = mutation({
  args: { villaId: v.id("villas"), status: villaStatusValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const now = Date.now();
    await ctx.db.patch("villas", args.villaId, {
      status: args.status,
      updatedAt: now,
    });
    await writeAudit(
      ctx,
      actor,
      args.status === "published"
        ? "publish"
        : args.status === "archived" ? "archive" : "update",
      "villa",
      args.villaId,
    );
    if (args.status === "archived")
      await ctx.runMutation(internal.calendarSyncData.stopChannel, { villaId: args.villaId, removeBlocks: true });
    await ctx.scheduler.runAfter(0, internal.googleCalendar.reconcileSubscriptions, {});
    return null;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
