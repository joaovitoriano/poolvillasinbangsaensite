import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation, query, type QueryCtx } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { writeAudit } from "./lib/audit";
import { relevantAvailabilityBlocks, relevantSpecialRates } from "./lib/boundedData";
import { assertDateRange, dateInBangkok, rangesOverlap } from "./lib/dates";
import {
  bookingRequestDocumentValidator,
  notificationDeliveryDocumentValidator,
  siteSettingsDocumentValidator,
  villaDocumentValidator,
} from "./lib/documentValidators";
import { calculateQuote } from "./lib/pricing";
import { notificationChannelValidator, notificationStatusValidator } from "./lib/validators";

const bookingRateLimiter = new RateLimiter(components.rateLimiter, {
  bookingGlobal: { kind: "fixed window", rate: 60, period: MINUTE },
  bookingContact: { kind: "token bucket", rate: 3, period: HOUR, capacity: 3 },
});

const bookingSubmissionResultValidator = v.object({
  requestId: v.id("bookingRequests"),
  estimatedTotalThb: v.number(),
  nights: v.number(),
});

async function soleSettings(ctx: QueryCtx) {
  const rows = await ctx.db.query("siteSettings").take(2);
  if (rows.length > 1) throw new Error("Site settings must contain exactly one record");
  return rows[0] ?? null;
}

export const submit = mutation({
  args: {
    villaId: v.id("villas"),
    checkIn: v.string(),
    checkOut: v.string(),
    guestCount: v.optional(v.number()),
    phone: v.optional(v.string()),
    lineId: v.optional(v.string()),
    idempotencyKey: v.string(),
  },
  returns: bookingSubmissionResultValidator,
  handler: async (ctx, args) => {
    const nightCount = assertDateRange(args.checkIn, args.checkOut);
    if (args.guestCount !== undefined && (!Number.isInteger(args.guestCount) || args.guestCount < 1))
      throw new Error("Invalid guest count / จำนวนผู้เข้าพักไม่ถูกต้อง");
    const phone = args.phone?.trim().slice(0, 40) || undefined;
    const lineId = args.lineId?.trim().slice(0, 80) || undefined;
    if (!phone && !lineId) throw new Error("Enter a phone number or LINE ID / กรุณากรอกเบอร์โทรหรือ LINE ID");
    if (phone) {
      if (!/^\+?[0-9 ()-]+$/.test(phone)) throw new Error("Enter a valid phone number / กรุณากรอกเบอร์โทรที่ถูกต้อง");
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 8 || digits.length > 15) throw new Error("Enter a valid phone number / กรุณากรอกเบอร์โทรที่ถูกต้อง");
    }
    const idempotencyKey = args.idempotencyKey.trim();
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey))
      throw new Error("Invalid inquiry submission key / รหัสการส่งคำขอไม่ถูกต้อง");
    const existing = await ctx.db.query("bookingRequests").withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", idempotencyKey)).unique();
    if (existing) {
      const same = existing.villaId === args.villaId && existing.checkIn === args.checkIn &&
        existing.checkOut === args.checkOut && existing.guestCount === args.guestCount &&
        existing.phone === phone && existing.lineId === lineId;
      if (!same) throw new Error("This inquiry submission key has already been used. / รหัสการส่งคำขอนี้ถูกใช้แล้ว");
      return { requestId: existing._id, estimatedTotalThb: existing.estimatedTotalThb, nights: nightCount };
    }

    await bookingRateLimiter.limit(ctx, "bookingGlobal", { throws: true });
    await bookingRateLimiter.limit(ctx, "bookingContact", { key: `${phone ?? ""}|${lineId ?? ""}`, throws: true });
    const villa = await ctx.db.get("villas", args.villaId);
    if (!villa || villa.status !== "published") throw new Error("Villa not found / ไม่พบวิลล่า");
    if (args.guestCount !== undefined && args.guestCount > villa.maxGuests)
      throw new Error("Guest count exceeds villa capacity / จำนวนผู้เข้าพักเกินความจุของวิลล่า");
    const blocks = await relevantAvailabilityBlocks(ctx, villa._id, args.checkOut);
    if (blocks.some((block) => rangesOverlap(args.checkIn, args.checkOut, block.startDate, block.endDate)))
      throw new Error("These dates are no longer available / วันที่เลือกไม่ว่างแล้ว");
    const rates = await relevantSpecialRates(ctx, villa._id, args.checkOut);
    const quote = calculateQuote(villa, rates, args.checkIn, args.checkOut);
    const now = Date.now();
    const requestId = await ctx.db.insert("bookingRequests", {
      idempotencyKey, villaId: villa._id, checkIn: args.checkIn, checkOut: args.checkOut,
      guestCount: args.guestCount, phone, lineId, estimatedTotalThb: quote.totalThb, status: "new",
    });
    for (const channel of ["email", "line"] as const)
      await ctx.db.insert("notificationDeliveries", { requestId, channel, status: "pending", lastAttemptAt: now });
    const date = dateInBangkok(now);
    const stat = await ctx.db.query("dailyInquiryStats")
      .withIndex("by_date_and_villaId", (q) => q.eq("date", date).eq("villaId", villa._id)).unique();
    if (stat) await ctx.db.patch("dailyInquiryStats", stat._id, { count: stat.count + 1 });
    else await ctx.db.insert("dailyInquiryStats", { date, villaId: villa._id, count: 1 });
    for (const channel of ["email", "line"] as const)
      await ctx.scheduler.runAfter(0, internal.notifications.deliver, { requestId, channel });
    return { requestId, estimatedTotalThb: quote.totalThb, nights: quote.nights.length };
  },
});

export const notificationPayload = internalQuery({
  args: { requestId: v.id("bookingRequests"), channel: notificationChannelValidator },
  returns: v.object({
    request: bookingRequestDocumentValidator,
    villa: villaDocumentValidator,
    settings: v.union(v.null(), siteSettingsDocumentValidator),
    delivery: notificationDeliveryDocumentValidator,
  }),
  handler: async (ctx, args) => {
    const request = await ctx.db.get("bookingRequests", args.requestId);
    if (!request) throw new Error("Request not found");
    const [villa, settings, delivery] = await Promise.all([
      ctx.db.get("villas", request.villaId),
      soleSettings(ctx),
      ctx.db.query("notificationDeliveries").withIndex("by_requestId_and_channel", (q) => q.eq("requestId", args.requestId).eq("channel", args.channel)).unique(),
    ]);
    if (!villa || !delivery) throw new Error("Notification data missing");
    return { request, villa, settings, delivery };
  },
});

export const recordDelivery = internalMutation({
  args: { deliveryId: v.id("notificationDeliveries"), status: notificationStatusValidator, error: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get("notificationDeliveries", args.deliveryId);
    if (!delivery) return null;
    await ctx.db.patch("notificationDeliveries", delivery._id, {
      status: args.status, error: args.error?.slice(0, 1000), lastAttemptAt: Date.now(),
    });
    return null;
  },
});

export const listAdmin = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({
    request: bookingRequestDocumentValidator,
    villa: v.union(v.null(), villaDocumentValidator),
    notifications: v.array(notificationDeliveryDocumentValidator),
  })),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
    const rows = await ctx.db.query("bookingRequests").withIndex("by_status", (q) => q.eq("status", "new")).order("desc").take(limit);
    return await Promise.all(rows.map(async (request) => ({
      request,
      villa: await ctx.db.get("villas", request.villaId),
      notifications: await ctx.db.query("notificationDeliveries")
        .withIndex("by_requestId_and_channel", (q) => q.eq("requestId", request._id)).take(2),
    })));
  },
});

export const markViewed = mutation({
  args: { requestId: v.id("bookingRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const request = await ctx.db.get("bookingRequests", args.requestId);
    if (!request) throw new Error("Inquiry not found / ไม่พบคำขอ");
    if (request.status === "new") {
      await ctx.db.patch("bookingRequests", request._id, { status: "viewed" });
      await writeAudit(ctx, actor, "view", "bookingRequest", request._id);
    }
    return null;
  },
});
