import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireAdmin, requireSuperadmin } from "./lib/access";
import { writeAudit } from "./lib/audit";
import { siteSettingsDocumentValidator } from "./lib/documentValidators";
import { notificationLanguageValidator } from "./lib/validators";

const publicSettingsValidator = v.object({
  businessName: v.string(), phone: v.string(), lineId: v.string(),
  defaultSeoTitleEn: v.string(), defaultSeoTitleTh: v.string(),
  defaultSeoDescriptionEn: v.string(), defaultSeoDescriptionTh: v.string(),
});

const businessSettingsValidator = v.object({
  businessName: v.string(),
  phone: v.string(),
  lineId: v.string(),
});

const settingsFields = {
  businessName: v.string(),
  phone: v.string(),
  lineId: v.string(),
  notificationEmails: v.array(v.string()),
  lineNotificationUserId: v.optional(v.string()),
  notificationLanguage: notificationLanguageValidator,
  defaultSeoTitleEn: v.string(),
  defaultSeoTitleTh: v.string(),
  defaultSeoDescriptionEn: v.string(),
  defaultSeoDescriptionTh: v.string(),
};

async function getSoleSettings(ctx: QueryCtx | MutationCtx) {
  const rows = await ctx.db.query("siteSettings").take(2);
  if (rows.length > 1) throw new Error("Site settings must contain exactly one record / การตั้งค่าเว็บไซต์ต้องมีเพียงหนึ่งรายการ");
  return rows[0] ?? null;
}

function normalizedSettings(args: {
  businessName: string; phone: string; lineId: string; notificationEmails: string[];
  lineNotificationUserId?: string; notificationLanguage: "en" | "th";
  defaultSeoTitleEn: string; defaultSeoTitleTh: string;
  defaultSeoDescriptionEn: string; defaultSeoDescriptionTh: string;
}) {
  return {
    ...args,
    businessName: args.businessName.trim(),
    phone: args.phone.trim(),
    lineId: args.lineId.trim(),
    notificationEmails: args.notificationEmails.map((email) => email.trim().toLowerCase()).filter(Boolean),
    lineNotificationUserId: args.lineNotificationUserId?.trim() || undefined,
    defaultSeoTitleEn: args.defaultSeoTitleEn.trim(),
    defaultSeoTitleTh: args.defaultSeoTitleTh.trim(),
    defaultSeoDescriptionEn: args.defaultSeoDescriptionEn.trim(),
    defaultSeoDescriptionTh: args.defaultSeoDescriptionTh.trim(),
  };
}

export const getPublic = query({
  args: {},
  returns: v.union(v.null(), publicSettingsValidator),
  handler: async (ctx) => {
    const settings = await getSoleSettings(ctx);
    if (!settings) return null;
    return {
      businessName: settings.businessName, phone: settings.phone, lineId: settings.lineId,
      defaultSeoTitleEn: settings.defaultSeoTitleEn, defaultSeoTitleTh: settings.defaultSeoTitleTh,
      defaultSeoDescriptionEn: settings.defaultSeoDescriptionEn, defaultSeoDescriptionTh: settings.defaultSeoDescriptionTh,
    };
  },
});

export const getAdmin = query({
  args: {},
  returns: v.union(v.null(), siteSettingsDocumentValidator),
  handler: async (ctx) => {
    await requireSuperadmin(ctx);
    return await getSoleSettings(ctx);
  },
});

export const getBusinessAdmin = query({
  args: {},
  returns: v.union(v.null(), businessSettingsValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const settings = await getSoleSettings(ctx);
    if (!settings) return null;
    return {
      businessName: settings.businessName,
      phone: settings.phone,
      lineId: settings.lineId,
    };
  },
});

export const getNotificationPreviewSettings = internalQuery({
  args: {},
  returns: v.object({
    notificationEmails: v.array(v.string()),
    lineNotificationUserId: v.union(v.null(), v.string()),
    notificationLanguage: notificationLanguageValidator,
  }),
  handler: async (ctx) => {
    await requireSuperadmin(ctx);
    const settings = await getSoleSettings(ctx);
    if (!settings) throw new Error("Settings are not initialized / ยังไม่ได้เริ่มต้นการตั้งค่า");
    return {
      notificationEmails: settings.notificationEmails,
      lineNotificationUserId: settings.lineNotificationUserId?.trim() || null,
      notificationLanguage: settings.notificationLanguage,
    };
  },
});

export const update = mutation({
  args: settingsFields,
  returns: v.id("siteSettings"),
  handler: async (ctx, args) => {
    const user = await requireSuperadmin(ctx);
    const current = await getSoleSettings(ctx);
    const value = normalizedSettings(args);
    if (current) {
      await ctx.db.replace("siteSettings", current._id, value);
      await writeAudit(ctx, user, "update", "settings", current._id);
      return current._id;
    }
    const id = await ctx.db.insert("siteSettings", value);
    await writeAudit(ctx, user, "create", "settings", id);
    return id;
  },
});

export const updateChanges = mutation({
  args: {
    businessName: v.optional(v.string()), phone: v.optional(v.string()), lineId: v.optional(v.string()),
    notificationEmails: v.optional(v.array(v.string())),
    lineNotificationUserId: v.optional(v.union(v.string(), v.null())),
    notificationLanguage: v.optional(notificationLanguageValidator),
    defaultSeoTitleEn: v.optional(v.string()), defaultSeoTitleTh: v.optional(v.string()),
    defaultSeoDescriptionEn: v.optional(v.string()), defaultSeoDescriptionTh: v.optional(v.string()),
  },
  returns: v.object({ settingsId: v.id("siteSettings"), changedFields: v.array(v.string()) }),
  handler: async (ctx, args) => {
    const user = await requireSuperadmin(ctx);
    const current = await getSoleSettings(ctx);
    if (!current) throw new Error("Settings are not initialized / ยังไม่ได้เริ่มต้นการตั้งค่า");
    const changedFields = Object.keys(args);
    if (!changedFields.length) throw new Error("No changed settings were sent / ไม่มีการตั้งค่าที่เปลี่ยนแปลงถูกส่งมา");
    const patch = Object.fromEntries(Object.entries(args).map(([key, value]) => [
      key,
      key === "lineNotificationUserId" ? (typeof value === "string" ? value.trim() || undefined : undefined) : value,
    ])) as Partial<Doc<"siteSettings">>;
    await ctx.db.patch("siteSettings", current._id, patch);
    await writeAudit(ctx, user, "update", "settings", current._id);
    return { settingsId: current._id, changedFields };
  },
});

export const updateBusinessSettings = mutation({
  args: businessSettingsValidator.fields,
  returns: v.object({ settingsId: v.id("siteSettings"), changedFields: v.array(v.string()) }),
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const current = await getSoleSettings(ctx);
    if (!current) throw new Error("Settings are not initialized / ยังไม่ได้เริ่มต้นการตั้งค่า");
    const next = {
      businessName: args.businessName.trim(),
      phone: args.phone.trim(),
      lineId: args.lineId.trim(),
    };
    const changedFields = (Object.keys(next) as Array<keyof typeof next>).filter(
      (field) => next[field] !== current[field],
    );
    if (changedFields.length) {
      await ctx.db.patch("siteSettings", current._id, next);
      await writeAudit(ctx, user, "update", "settings", current._id);
    }
    return { settingsId: current._id, changedFields };
  },
});
