import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  auditActionValidator,
  bedTypeValidator,
  notificationChannelValidator,
  notificationLanguageValidator,
  notificationStatusValidator,
  requestStatusValidator,
  villaStatusValidator,
} from "./lib/validators";

export default defineSchema({
  villas: defineTable({
    slug: v.string(), status: villaStatusValidator, nameEn: v.string(), nameTh: v.string(),
    nameSource: v.optional(v.string()),
    descriptionEn: v.string(), descriptionTh: v.string(), descriptionSource: v.optional(v.string()),
    latitude: v.number(), longitude: v.number(), formattedAddress: v.string(),
    weekdayPriceThb: v.number(), weekendPriceThb: v.optional(v.number()),
    bedrooms: v.number(), bathrooms: v.number(), maxGuests: v.number(), parkingSpaces: v.number(),
    checkInTime: v.string(), checkOutTime: v.string(), securityDepositThb: v.optional(v.number()),
    sortOrder: v.number(),
    googleCalendarId: v.optional(v.string()), updatedAt: v.number(),
  }).index("by_slug", ["slug"]).index("by_sortOrder", ["sortOrder"]).index("by_status_and_sortOrder", ["status", "sortOrder"]),

  villaPhotos: defineTable({
    villaId: v.id("villas"), storageId: v.optional(v.id("_storage")), thumbnailStorageId: v.optional(v.id("_storage")), externalUrl: v.optional(v.string()),
    sortOrder: v.number(),
  })
    .index("by_villaId_and_sortOrder", ["villaId", "sortOrder"])
    .index("by_storageId", ["storageId"])
    .index("by_thumbnailStorageId", ["thumbnailStorageId"]),

  amenities: defineTable({ slug: v.string(), labelEn: v.string(), labelTh: v.string(), labelSource: v.optional(v.string()), icon: v.optional(v.string()) })
    .index("by_slug", ["slug"]),
  villaAmenities: defineTable({ villaId: v.id("villas"), amenityId: v.id("amenities") })
    .index("by_villaId", ["villaId"]).index("by_amenityId", ["amenityId"]).index("by_villaId_and_amenityId", ["villaId", "amenityId"]),
  sleepingArrangements: defineTable({ villaId: v.id("villas"), bedroomNumber: v.number(), beds: v.array(bedTypeValidator) })
    .index("by_villaId_and_bedroomNumber", ["villaId", "bedroomNumber"]),
  houseRules: defineTable({ textEn: v.string(), textTh: v.string(), textSource: v.optional(v.string()), icon: v.optional(v.string()) })
    .index("by_textEn", ["textEn"]),
  villaHouseRules: defineTable({ villaId: v.id("villas"), houseRuleId: v.id("houseRules") })
    .index("by_villaId", ["villaId"]).index("by_houseRuleId", ["houseRuleId"]).index("by_villaId_and_houseRuleId", ["villaId", "houseRuleId"]),

  specialRates: defineTable({
    villaId: v.id("villas"), labelEn: v.string(), labelTh: v.string(), labelSource: v.optional(v.string()),
    startDate: v.string(), endDate: v.string(), nightlyPriceThb: v.number(), sortOrder: v.number(),
  }).index("by_villaId_and_sortOrder", ["villaId", "sortOrder"]),

  availabilityBlocks: defineTable({
    villaId: v.id("villas"), startDate: v.string(), endDate: v.string(),
    name: v.string(), description: v.optional(v.string()), externalEventId: v.string(), kind: v.optional(v.union(v.literal("booking"), v.literal("closed"))), fullSyncGeneration: v.optional(v.number()),
  }).index("by_villaId_and_startDate", ["villaId", "startDate"]).index("by_villaId_and_endDate", ["villaId", "endDate"]).index("by_villaId_and_externalEventId", ["villaId", "externalEventId"]).index("by_villaId_and_fullSyncGeneration", ["villaId", "fullSyncGeneration"]),

  calendarReminders: defineTable({
    villaId: v.id("villas"), startDate: v.string(), endDate: v.string(), name: v.string(), description: v.optional(v.string()), externalEventId: v.string(), labelName: v.string(), fullSyncGeneration: v.optional(v.number()),
  }).index("by_villaId_and_startDate", ["villaId", "startDate"]).index("by_villaId_and_externalEventId", ["villaId", "externalEventId"]).index("by_villaId_and_fullSyncGeneration", ["villaId", "fullSyncGeneration"]),

  bookingRequests: defineTable({
    idempotencyKey: v.string(), villaId: v.id("villas"), checkIn: v.string(), checkOut: v.string(), guestCount: v.optional(v.number()),
    phone: v.optional(v.string()), lineId: v.optional(v.string()), estimatedTotalThb: v.number(), status: requestStatusValidator,
  }).index("by_idempotencyKey", ["idempotencyKey"]).index("by_status", ["status"]),
  notificationDeliveries: defineTable({
    requestId: v.id("bookingRequests"), channel: notificationChannelValidator, status: notificationStatusValidator,
    lastAttemptAt: v.number(), error: v.optional(v.string()),
  }).index("by_requestId_and_channel", ["requestId", "channel"]).index("by_channel_and_lastAttemptAt", ["channel", "lastAttemptAt"]),
  siteSettings: defineTable({
    businessName: v.string(), phone: v.string(), lineId: v.string(), notificationEmails: v.array(v.string()),
    lineNotificationUserId: v.optional(v.string()),
    notificationLanguage: notificationLanguageValidator,
    defaultSeoTitleEn: v.string(), defaultSeoTitleTh: v.string(), defaultSeoTitleSource: v.optional(v.string()), defaultSeoDescriptionEn: v.string(), defaultSeoDescriptionTh: v.string(), defaultSeoDescriptionSource: v.optional(v.string()),
  }),
  auditLogs: defineTable({ actorWorkosUserId: v.string(), action: auditActionValidator, entityType: v.string(), entityId: v.string() }),
  villaEditSessions: defineTable({ villaId: v.id("villas"), workosUserId: v.string(), sessionId: v.string(), expiresAt: v.number() })
    .index("by_villaId", ["villaId"]).index("by_workosUserId", ["workosUserId"]),
  googleCalendarChannels: defineTable({
    villaId: v.id("villas"), calendarId: v.string(), channelId: v.string(), resourceId: v.optional(v.string()), channelToken: v.string(),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("error"), v.literal("stopped")),
    channelExpiration: v.optional(v.number()), syncToken: v.optional(v.string()), fullSyncGeneration: v.optional(v.number()),
    lastSyncedAt: v.optional(v.number()), lastSyncError: v.optional(v.string()), lastFetchedEvents: v.optional(v.number()), lastImportedEvents: v.optional(v.number()), lastAvailabilityBlockCount: v.optional(v.number()),
    syncInProgress: v.boolean(), pendingNotification: v.boolean(), retryAttempt: v.number(), lastMessageNumber: v.optional(v.number()),
  }).index("by_villaId", ["villaId"]).index("by_channelId", ["channelId"]).index("by_status_and_channelExpiration", ["status", "channelExpiration"]),
  dailyInquiryStats: defineTable({ date: v.string(), villaId: v.id("villas"), count: v.number() })
    .index("by_date", ["date"]).index("by_date_and_villaId", ["date", "villaId"]).index("by_villaId_and_date", ["villaId", "date"]),
});
