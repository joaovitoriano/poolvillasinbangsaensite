import { activityContext } from "./lib/activity";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { permissions, requirePermission, requireUser, requireVillaAccess } from "./lib/auth";

export const listForVilla = query({
  args: { villaId: v.id("villas"), includeInactive: v.optional(v.boolean()) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireVillaAccess(ctx, user, args.villaId);
    const presets = args.includeInactive
      ? await ctx.db.query("pricingPresets").withIndex("by_villaId_and_active", (q) => q.eq("villaId", args.villaId)).take(100)
      : await ctx.db.query("pricingPresets").withIndex("by_villaId_and_active", (q) => q.eq("villaId", args.villaId).eq("active", true)).take(100);
    return presets.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const save = mutation({
  args: {
    presetId: v.optional(v.id("pricingPresets")),
    villaId: v.id("villas"),
    name: v.string(),
    nightlyPriceThb: v.number(),
    daysOfWeek: v.array(v.number()),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    isDefault: v.boolean(),
  },
  returns: v.object({ presetId: v.id("pricingPresets") }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    ctx = activityContext(ctx, user, "villaId" in args ? args.villaId as Parameters<typeof activityContext>[2] : undefined);
    requirePermission(user, permissions.settingsManage);
    if (user.role !== "admin") throw new Error("Admin access required / เฉพาะผู้ดูแลเท่านั้น");
    if (!Number.isFinite(args.nightlyPriceThb) || args.nightlyPriceThb < 0) throw new Error("Enter a valid non-negative price / กรอกราคาที่ถูกต้องและไม่ติดลบ");
    const hasDates = args.dateFrom !== undefined || args.dateTo !== undefined;
    if (hasDates) {
      const validDate = (value: string | undefined) => {
        if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const date = new Date(`${value}T00:00:00.000Z`);
        return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
      };
      if (!validDate(args.dateFrom) || !validDate(args.dateTo) || args.dateTo! < args.dateFrom!) throw new Error("Choose a valid From and To date / เลือกวันที่เริ่มต้นและสิ้นสุดให้ถูกต้อง");
      if (args.daysOfWeek.length) throw new Error("Choose recurring days or a date range, not both / เลือกวันประจำสัปดาห์หรือช่วงวันที่อย่างใดอย่างหนึ่ง");
    } else if (!args.daysOfWeek.length) throw new Error("Choose at least one day / เลือกอย่างน้อยหนึ่งวัน");
    if (args.daysOfWeek.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) throw new Error("Invalid day of week / วันในสัปดาห์ไม่ถูกต้อง");
    if (args.isDefault && (args.dateFrom || args.dateTo || new Set(args.daysOfWeek).size !== 7)) {
      throw new Error("The default preset must cover every day without a date range / ชุดราคาเริ่มต้นต้องครอบคลุมทุกวันและไม่มีช่วงวันที่");
    }
    const now = Date.now();
    if (args.isDefault) {
      const defaults = await ctx.db
        .query("pricingPresets")
        .withIndex("by_villaId_and_active", (q) => q.eq("villaId", args.villaId).eq("active", true))
        .take(100);
      for (const preset of defaults) {
        if (preset.isDefault && preset._id !== args.presetId) await ctx.db.patch(preset._id, { isDefault: false, updatedAt: now });
      }
    }
    const values = {
      villaId: args.villaId,
      name: args.name.trim(),
      nightlyPriceThb: args.nightlyPriceThb,
      daysOfWeek: [...new Set(args.daysOfWeek)].sort(),
      dateFrom: args.dateFrom,
      dateTo: args.dateTo,
      isDefault: args.isDefault,
      active: true,
      updatedAt: now,
    };
    if (args.presetId) {
      const preset = await ctx.db.get(args.presetId);
      if (!preset || preset.villaId !== args.villaId) throw new Error("Pricing preset not found / ไม่พบชุดราคา");
      await ctx.db.patch(args.presetId, values);
      if (args.isDefault) {
        const presets = await ctx.db
          .query("pricingPresets")
          .withIndex("by_villaId_and_active", (q) => q.eq("villaId", args.villaId))
          .take(100);
        const ordered = presets.filter((item) => item._id !== args.presetId);
        for (const [index, item] of ordered.entries()) {
          if (item.sortOrder !== index) await ctx.db.patch(item._id, { sortOrder: index, updatedAt: now });
        }
        await ctx.db.patch(args.presetId, { sortOrder: ordered.length, updatedAt: now });
      }
      return { presetId: args.presetId };
    }
    const existing = await ctx.db
      .query("pricingPresets")
      .withIndex("by_villaId_and_active", (q) => q.eq("villaId", args.villaId))
      .take(100);
    const nonDefaultCount = existing.filter((preset) => !preset.isDefault).length;
    const defaultPreset = existing.find((preset) => preset.isDefault);
    if (defaultPreset) await ctx.db.patch(defaultPreset._id, { sortOrder: nonDefaultCount + 1, updatedAt: now });
    const presetId = await ctx.db.insert("pricingPresets", { ...values, sortOrder: nonDefaultCount, createdAt: now });
    return { presetId };
  },
});

export const reorder = mutation({
  args: { villaId: v.id("villas"), presetIds: v.array(v.id("pricingPresets")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    ctx = activityContext(ctx, user, "villaId" in args ? args.villaId as Parameters<typeof activityContext>[2] : undefined);
    requirePermission(user, permissions.settingsManage);
    if (user.role !== "admin") throw new Error("Admin access required / เฉพาะผู้ดูแลเท่านั้น");
    const presets = await ctx.db
      .query("pricingPresets")
      .withIndex("by_villaId_and_active", (q) => q.eq("villaId", args.villaId))
      .take(100);
    const knownIds = new Set(presets.map((preset) => preset._id));
    if (args.presetIds.length !== presets.length || new Set(args.presetIds).size !== presets.length || args.presetIds.some((id) => !knownIds.has(id))) {
      throw new Error("Preset order is out of date / ลำดับชุดราคาไม่เป็นปัจจุบัน");
    }
    const defaultPreset = presets.find((preset) => preset.isDefault);
    const requested = args.presetIds.filter((id) => id !== defaultPreset?._id);
    const orderedIds = defaultPreset ? [...requested, defaultPreset._id] : requested;
    const now = Date.now();
    for (const [sortOrder, presetId] of orderedIds.entries()) {
      const preset = presets.find((item) => item._id === presetId);
      if (preset && preset.sortOrder !== sortOrder) await ctx.db.patch(presetId, { sortOrder, updatedAt: now });
    }
    return null;
  },
});

export const remove = mutation({
  args: { presetId: v.id("pricingPresets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    ctx = activityContext(ctx, user, "villaId" in args ? args.villaId as Parameters<typeof activityContext>[2] : undefined);
    requirePermission(user, permissions.settingsManage);
    if (user.role !== "admin") throw new Error("Admin access required / เฉพาะผู้ดูแลเท่านั้น");
    const preset = await ctx.db.get(args.presetId);
    if (!preset) throw new Error("Pricing preset not found / ไม่พบชุดราคา");
    if (preset.isDefault) throw new Error("The default preset cannot be deleted / ไม่สามารถลบชุดราคาเริ่มต้นได้");

    await ctx.db.delete(args.presetId);

    const remaining = await ctx.db
      .query("pricingPresets")
      .withIndex("by_villaId_and_active", (q) => q.eq("villaId", preset.villaId))
      .take(100);
    const defaultPreset = remaining.find((item) => item.isDefault);
    const ordered = [
      ...remaining.filter((item) => !item.isDefault).sort((a, b) => a.sortOrder - b.sortOrder),
      ...(defaultPreset ? [defaultPreset] : []),
    ];
    const now = Date.now();
    for (const [sortOrder, item] of ordered.entries()) {
      if (item.sortOrder !== sortOrder) await ctx.db.patch(item._id, { sortOrder, updatedAt: now });
    }
    return null;
  },
});

export const setActive = mutation({
  args: { presetId: v.id("pricingPresets"), active: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    ctx = activityContext(ctx, user, "villaId" in args ? args.villaId as Parameters<typeof activityContext>[2] : undefined);
    requirePermission(user, permissions.settingsManage);
    if (user.role !== "admin") throw new Error("Admin access required / เฉพาะผู้ดูแลเท่านั้น");
    const preset = await ctx.db.get(args.presetId);
    if (!preset) throw new Error("Pricing preset not found / ไม่พบชุดราคา");
    if (preset.isDefault && !args.active) throw new Error("The default preset must stay active / ต้องเปิดใช้ชุดราคาเริ่มต้นไว้เสมอ");
    await ctx.db.patch(args.presetId, { active: args.active, updatedAt: Date.now() });
    return null;
  },
});
