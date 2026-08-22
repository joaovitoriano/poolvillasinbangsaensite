import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { sessionUserValidator } from "./lib/access";
import {
  auditLogDocumentValidator,
  bookingRequestDocumentValidator,
  villaDocumentValidator,
} from "./lib/documentValidators";

export const overview = query({
  args: {},
  returns: v.object({
    user: sessionUserValidator,
    villas: v.array(villaDocumentValidator),
    requests: v.array(bookingRequestDocumentValidator),
    notificationHealth: v.array(v.object({
      channel: v.union(v.literal("email"), v.literal("line")),
      status: v.union(v.literal("healthy"), v.literal("unhealthy"), v.literal("checking"), v.literal("not_tested")),
      checkedAt: v.optional(v.number()),
      error: v.optional(v.string()),
    })),
    calendarConnections: v.array(v.object({
      villaId: v.id("villas"),
      calendarId: v.string(),
      status: v.union(v.literal("pending"), v.literal("active"), v.literal("error"), v.literal("stopped")),
      channelExpiration: v.optional(v.number()),
      lastSyncedAt: v.optional(v.number()),
      lastSyncError: v.optional(v.string()),
      lastFetchedEvents: v.optional(v.number()),
      lastImportedEvents: v.optional(v.number()),
      lastAvailabilityBlockCount: v.optional(v.number()),
    })),
    audit: v.array(auditLogDocumentValidator),
  }),
  handler: async (ctx) => {
    const user = await requireAdmin(ctx);
    const [
      villas,
      requests,
      latestEmailDelivery,
      latestLineDelivery,
      calendarChannels,
      audit,
    ] = await Promise.all([
      ctx.db.query("villas").take(200),
      ctx.db
        .query("bookingRequests")
        .withIndex("by_status", (q) => q.eq("status", "new"))
        .order("desc")
        .take(50),
      ctx.db.query("notificationDeliveries").withIndex("by_channel_and_lastAttemptAt", (q) => q.eq("channel", "email")).order("desc").first(),
      ctx.db.query("notificationDeliveries").withIndex("by_channel_and_lastAttemptAt", (q) => q.eq("channel", "line")).order("desc").first(),
      ctx.db.query("googleCalendarChannels").take(200),
      ctx.db.query("auditLogs").order("desc").take(30),
    ]);
    const currentHealth = (channel: "email" | "line", delivery: typeof latestEmailDelivery) => {
      const deliveryAt = delivery?.lastAttemptAt ?? 0;
      if (!deliveryAt) return { channel, status: "not_tested" as const };
      return {
        channel,
        status: delivery!.status === "sent" ? "healthy" as const : delivery!.status === "pending" ? "checking" as const : "unhealthy" as const,
        checkedAt: deliveryAt,
        error: delivery!.error,
      };
    };
    return {
      user,
      villas,
      requests,
      notificationHealth: [
        currentHealth("email", latestEmailDelivery),
        currentHealth("line", latestLineDelivery),
      ],
      calendarConnections: calendarChannels.map((channel) => ({
        villaId: channel.villaId,
        calendarId: channel.calendarId,
        status: channel.status,
        channelExpiration: channel.channelExpiration,
        lastSyncedAt: channel.lastSyncedAt,
        lastSyncError: channel.lastSyncError,
        lastFetchedEvents: channel.lastFetchedEvents,
        lastImportedEvents: channel.lastImportedEvents,
        lastAvailabilityBlockCount: channel.lastAvailabilityBlockCount,
      })),
      audit,
    };
  },
});

export const audit = query({
  args: {},
  returns: v.array(auditLogDocumentValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("auditLogs").order("desc")
      .take(100);
  },
});

export const inquiryReport = query({
  args: { from: v.optional(v.string()), to: v.optional(v.string()) },
  returns: v.array(v.object({
    villaId: v.id("villas"),
    count: v.number(),
    villa: v.union(v.null(), villaDocumentValidator),
  })),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const queryByDate = ctx.db.query("dailyInquiryStats").withIndex(
      "by_date",
      (q) =>
        args.from && args.to
          ? q.gte("date", args.from).lte("date", args.to)
          : args.from
            ? q.gte("date", args.from)
            : args.to
              ? q.lte("date", args.to)
              : q,
    );
    const rows = await queryByDate.take(2001);
    if (rows.length > 2000)
      throw new Error(
        "This report range is too large. Choose a shorter date range. / ช่วงเวลาของรายงานกว้างเกินไป โปรดเลือกช่วงวันที่สั้นลง",
      );
    const grouped = new Map<
      string,
      {
        villaId: (typeof rows)[number]["villaId"];
        count: number;
      }
    >();
    for (const row of rows) {
      const key = row.villaId;
      const value = grouped.get(key) ?? {
        villaId: row.villaId,
        count: 0,
      };
      value.count += row.count;
      grouped.set(key, value);
    }
    return await Promise.all(
      [...grouped.values()].sort((a, b) => b.count - a.count).map(async (value) => ({
        ...value,
        villa: await ctx.db.get("villas", value.villaId),
      })),
    );
  },
});
