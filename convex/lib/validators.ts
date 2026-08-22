import { v } from "convex/values";

export const localeValidator = v.union(v.literal("en"), v.literal("th"));
export const userRoleValidator = v.union(v.literal("admin"), v.literal("superadmin"));
export const villaStatusValidator = v.union(v.literal("draft"), v.literal("published"), v.literal("archived"));
export const requestStatusValidator = v.union(v.literal("new"), v.literal("viewed"));
export const notificationChannelValidator = v.union(v.literal("email"), v.literal("line"));
export const notificationLanguageValidator = v.union(v.literal("en"), v.literal("th"));
export const notificationStatusValidator = v.union(v.literal("pending"), v.literal("sent"), v.literal("failed"), v.literal("not_configured"));
export const auditActionValidator = v.union(
  v.literal("create"), v.literal("update"), v.literal("publish"),
  v.literal("archive"), v.literal("view"), v.literal("sync"),
);

export const bedTypeValidator = v.union(
  v.literal("single"),
  v.literal("double"),
  v.literal("queen"),
  v.literal("king"),
  v.literal("bunk"),
  v.literal("sofa_bed"),
  v.literal("floor_mattress"),
);

export const localizedTextValidator = v.object({ en: v.string(), th: v.string() });
