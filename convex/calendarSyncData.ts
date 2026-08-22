import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { requireSuperadmin, sessionUserValidator } from "./lib/access";
import { googleCalendarChannelDocumentValidator, villaDocumentValidator } from "./lib/documentValidators";

const importedEventValidator = v.object({ externalEventId: v.string(), startDate: v.string(), endDate: v.string(), name: v.string(), description: v.optional(v.string()), kind: v.union(v.literal("booking"), v.literal("closed"), v.literal("ignored")) });

export const requireSyncAccess = internalQuery({ args: {}, returns: sessionUserValidator, handler: async (ctx) => await requireSuperadmin(ctx) });

export const getSyncState = internalQuery({
  args: {}, returns: v.object({ calendars: v.array(v.object({ villa: villaDocumentValidator })) }),
  handler: async (ctx) => {
    const villas = await ctx.db.query("villas").withIndex("by_sortOrder").take(200);
    return { calendars: villas.filter((villa) => villa.googleCalendarId && villa.status !== "archived").map((villa) => ({ villa })) };
  },
});

export const listChannels = internalQuery({ args: {}, returns: v.array(googleCalendarChannelDocumentValidator), handler: async (ctx) => await ctx.db.query("googleCalendarChannels").take(200) });
export const getChannel = internalQuery({ args: { villaId: v.id("villas") }, returns: v.union(v.null(), googleCalendarChannelDocumentValidator), handler: async (ctx, args) => await ctx.db.query("googleCalendarChannels").withIndex("by_villaId", (q) => q.eq("villaId", args.villaId)).unique() });

export const initializeChannel = internalMutation({
  args: { villaId: v.id("villas"), calendarId: v.string(), channelId: v.string(), channelToken: v.string() }, returns: v.id("googleCalendarChannels"),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("googleCalendarChannels").withIndex("by_villaId", (q) => q.eq("villaId", args.villaId)).unique();
    const value = { calendarId: args.calendarId, channelId: args.channelId, channelToken: args.channelToken, resourceId: undefined, status: "pending" as const, channelExpiration: undefined, syncToken: undefined, syncInProgress: true, pendingNotification: false, retryAttempt: 0, lastMessageNumber: undefined, lastSyncedAt: undefined, lastSyncError: undefined, lastFetchedEvents: undefined, lastImportedEvents: undefined, lastAvailabilityBlockCount: undefined };
    if (existing) { await ctx.db.patch("googleCalendarChannels", existing._id, value); return existing._id; }
    return await ctx.db.insert("googleCalendarChannels", { villaId: args.villaId, ...value });
  },
});

export const activateChannel = internalMutation({
  args: { villaId: v.id("villas"), channelId: v.string(), resourceId: v.string(), channelExpiration: v.optional(v.number()) }, returns: v.boolean(),
  handler: async (ctx, args) => {
    const channel = await ctx.db.query("googleCalendarChannels").withIndex("by_villaId", (q) => q.eq("villaId", args.villaId)).unique();
    if (!channel || channel.channelId !== args.channelId) return false;
    await ctx.db.patch("googleCalendarChannels", channel._id, { resourceId: args.resourceId, channelExpiration: args.channelExpiration, status: "active" });
    return true;
  },
});

export const renewChannel = internalMutation({
  args: { villaId: v.id("villas"), expectedChannelId: v.string(), channelId: v.string(), channelToken: v.string(), resourceId: v.string(), channelExpiration: v.optional(v.number()) }, returns: v.boolean(),
  handler: async (ctx, args) => {
    const channel = await ctx.db.query("googleCalendarChannels").withIndex("by_villaId", (q) => q.eq("villaId", args.villaId)).unique();
    if (!channel || channel.channelId !== args.expectedChannelId || channel.status !== "active") return false;
    await ctx.db.patch("googleCalendarChannels", channel._id, { channelId: args.channelId, channelToken: args.channelToken, resourceId: args.resourceId, channelExpiration: args.channelExpiration, lastMessageNumber: undefined });
    return true;
  },
});

export const markChannelError = internalMutation({
  args: { villaId: v.id("villas"), channelId: v.optional(v.string()), error: v.optional(v.string()) }, returns: v.null(),
  handler: async (ctx, args) => {
    const channel = await ctx.db.query("googleCalendarChannels").withIndex("by_villaId", (q) => q.eq("villaId", args.villaId)).unique();
    if (channel && (!args.channelId || channel.channelId === args.channelId)) await ctx.db.patch("googleCalendarChannels", channel._id, { status: "error", syncInProgress: false, lastSyncError: args.error?.slice(0, 1000) });
    return null;
  },
});

export const stopChannel = internalMutation({
  args: { villaId: v.id("villas"), removeBlocks: v.boolean() }, returns: v.null(),
  handler: async (ctx, args) => {
    const channel = await ctx.db.query("googleCalendarChannels").withIndex("by_villaId", (q) => q.eq("villaId", args.villaId)).unique();
    if (channel) await ctx.db.patch("googleCalendarChannels", channel._id, { status: "stopped", syncInProgress: false, pendingNotification: false, syncToken: undefined });
    if (args.removeBlocks) {
      const blocks = await ctx.db.query("availabilityBlocks").withIndex("by_villaId_and_startDate", (q) => q.eq("villaId", args.villaId)).take(201);
      if (blocks.length > 200) { blocks.pop(); await ctx.scheduler.runAfter(0, internal.calendarSyncData.stopChannel, args); }
      for (const block of blocks) await ctx.db.delete("availabilityBlocks", block._id);
    }
    return null;
  },
});

export const receiveNotification = internalMutation({
  args: { channelId: v.string(), resourceId: v.string(), channelToken: v.string(), resourceState: v.string(), messageNumber: v.optional(v.number()) }, returns: v.union(v.literal("accepted"), v.literal("ignored"), v.literal("rejected")),
  handler: async (ctx, args) => {
    const channel = await ctx.db.query("googleCalendarChannels").withIndex("by_channelId", (q) => q.eq("channelId", args.channelId)).unique();
    if (!channel || channel.resourceId !== args.resourceId || channel.channelToken !== args.channelToken || channel.status !== "active") return "rejected";
    if (args.resourceState !== "sync" && args.resourceState !== "exists" && args.resourceState !== "not_exists") return "rejected";
    if (args.messageNumber !== undefined && channel.lastMessageNumber !== undefined && args.messageNumber <= channel.lastMessageNumber) return "ignored";
    const common = { lastMessageNumber: args.messageNumber ?? channel.lastMessageNumber };
    if (channel.syncInProgress) { await ctx.db.patch("googleCalendarChannels", channel._id, { ...common, pendingNotification: true }); return "accepted"; }
    await ctx.db.patch("googleCalendarChannels", channel._id, { ...common, syncInProgress: true, pendingNotification: false });
    await ctx.scheduler.runAfter(0, internal.googleCalendar.syncChannel, { villaId: channel.villaId, alreadyClaimed: true });
    return "accepted";
  },
});

export const claimSync = internalMutation({
  args: { villaId: v.id("villas") }, returns: v.union(v.null(), googleCalendarChannelDocumentValidator),
  handler: async (ctx, args) => {
    const channel = await ctx.db.query("googleCalendarChannels").withIndex("by_villaId", (q) => q.eq("villaId", args.villaId)).unique();
    if (!channel || channel.status !== "active") return null;
    if (channel.syncInProgress) { await ctx.db.patch("googleCalendarChannels", channel._id, { pendingNotification: true }); return null; }
    await ctx.db.patch("googleCalendarChannels", channel._id, { syncInProgress: true, pendingNotification: false });
    return { ...channel, syncInProgress: true, pendingNotification: false };
  },
});

export const beginFullSync = internalMutation({
  args: { villaId: v.id("villas"), channelId: v.string() }, returns: v.union(v.null(), v.number()),
  handler: async (ctx, args) => {
    const channel = await ctx.db.query("googleCalendarChannels").withIndex("by_villaId", (q) => q.eq("villaId", args.villaId)).unique();
    if (!channel || channel.channelId !== args.channelId) return null;
    const generation = Math.max(Date.now(), (channel.fullSyncGeneration ?? 0) + 1);
    await ctx.db.patch("googleCalendarChannels", channel._id, { fullSyncGeneration: generation }); return generation;
  },
});

export const applyEventChanges = internalMutation({
  args: { villaId: v.id("villas"), events: v.array(importedEventValidator), cancelledEventIds: v.array(v.string()), fullSyncGeneration: v.optional(v.number()) }, returns: v.object({ imported: v.number() }),
  handler: async (ctx, args) => {
    let imported = 0;
    for (const externalEventId of args.cancelledEventIds) {
      const rows = await ctx.db.query("availabilityBlocks").withIndex("by_villaId_and_externalEventId", (q) => q.eq("villaId", args.villaId).eq("externalEventId", externalEventId)).take(10);
      for (const row of rows) await ctx.db.delete("availabilityBlocks", row._id);
    }
    for (const event of args.events) {
      const rows = await ctx.db.query("availabilityBlocks").withIndex("by_villaId_and_externalEventId", (q) => q.eq("villaId", args.villaId).eq("externalEventId", event.externalEventId)).take(10);
      if (event.kind === "ignored") {
        for (const row of rows) await ctx.db.delete("availabilityBlocks", row._id);
        continue;
      }
      const value = { startDate: event.startDate, endDate: event.endDate, name: event.name, description: event.description, kind: event.kind, fullSyncGeneration: args.fullSyncGeneration };
      if (rows[0]) await ctx.db.patch("availabilityBlocks", rows[0]._id, value); else { await ctx.db.insert("availabilityBlocks", { villaId: args.villaId, externalEventId: event.externalEventId, ...value }); imported += 1; }
      for (const duplicate of rows.slice(1)) await ctx.db.delete("availabilityBlocks", duplicate._id);
    }
    return { imported };
  },
});

export const cleanupFullSync = internalMutation({
  args: { villaId: v.id("villas"), generation: v.number() }, returns: v.number(),
  handler: async (ctx, args) => {
    const staleBlocks = await ctx.db.query("availabilityBlocks").withIndex("by_villaId_and_fullSyncGeneration", (q) => q.eq("villaId", args.villaId).lt("fullSyncGeneration", args.generation)).take(100);
    for (const row of staleBlocks) await ctx.db.delete("availabilityBlocks", row._id);
    return staleBlocks.length;
  },
});

export const completeSync = internalMutation({
  args: { villaId: v.id("villas"), channelId: v.string(), syncToken: v.string(), fetchedEvents: v.number(), importedEvents: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    const channel = await ctx.db.query("googleCalendarChannels").withIndex("by_villaId", (q) => q.eq("villaId", args.villaId)).unique();
    if (!channel || channel.channelId !== args.channelId) return null;
    const blocks = await ctx.db.query("availabilityBlocks").withIndex("by_villaId_and_startDate", (q) => q.eq("villaId", args.villaId)).take(1001);
    const rerun = channel.pendingNotification;
    await ctx.db.patch("googleCalendarChannels", channel._id, { syncToken: args.syncToken, syncInProgress: rerun, pendingNotification: false, retryAttempt: 0, lastSyncedAt: Date.now(), lastSyncError: undefined, lastFetchedEvents: args.fetchedEvents, lastImportedEvents: args.importedEvents, lastAvailabilityBlockCount: blocks.length });
    if (rerun) await ctx.scheduler.runAfter(0, internal.googleCalendar.syncChannel, { villaId: args.villaId, alreadyClaimed: true }); return null;
  },
});

export const failSync = internalMutation({
  args: { villaId: v.id("villas"), channelId: v.string(), error: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const channel = await ctx.db.query("googleCalendarChannels").withIndex("by_villaId", (q) => q.eq("villaId", args.villaId)).unique();
    if (!channel || channel.channelId !== args.channelId) return null;
    const retryAttempt = channel.retryAttempt + 1; const retry = channel.status === "active" && retryAttempt <= 5;
    await ctx.db.patch("googleCalendarChannels", channel._id, { syncInProgress: retry, pendingNotification: false, retryAttempt, lastSyncError: args.error.slice(0, 1000) });
    if (retry) await ctx.scheduler.runAfter(Math.min(15 * 60_000, 2 ** retryAttempt * 5_000), internal.googleCalendar.syncChannel, { villaId: args.villaId, alreadyClaimed: true }); return null;
  },
});
