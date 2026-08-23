import { v } from "convex/values";
import {
  auditActionValidator,
  bedTypeValidator,
  notificationChannelValidator,
  notificationStatusValidator,
  requestStatusValidator,
  villaStatusValidator,
} from "./validators";

const system = <TableName extends string>(table: TableName) => ({ _id: v.id(table), _creationTime: v.number() });

export const villaDocumentValidator = v.object({
  ...system("villas"),
  slug: v.string(), status: villaStatusValidator,
  nameEn: v.string(), nameTh: v.string(),
  descriptionEn: v.string(), descriptionTh: v.string(),
  latitude: v.number(), longitude: v.number(), formattedAddress: v.string(),
  weekdayPriceThb: v.number(), weekendPriceThb: v.optional(v.number()),
  bedrooms: v.number(), bathrooms: v.number(), maxGuests: v.number(), parkingSpaces: v.number(),
  checkInTime: v.string(), checkOutTime: v.string(), securityDepositThb: v.optional(v.number()),
  sortOrder: v.number(), googleCalendarId: v.optional(v.string()), updatedAt: v.number(),
});

export const villaPhotoDocumentValidator = v.object({
  ...system("villaPhotos"), villaId: v.id("villas"),
  storageId: v.optional(v.id("_storage")), thumbnailStorageId: v.optional(v.id("_storage")),
  externalUrl: v.optional(v.string()), sortOrder: v.number(),
});

export const amenityDocumentValidator = v.object({
  ...system("amenities"), slug: v.string(), labelEn: v.string(), labelTh: v.string(),
  icon: v.optional(v.string()),
});
export const villaAmenityDocumentValidator = v.object({ ...system("villaAmenities"), villaId: v.id("villas"), amenityId: v.id("amenities") });
export const sleepingDocumentValidator = v.object({ ...system("sleepingArrangements"), villaId: v.id("villas"), bedroomNumber: v.number(), beds: v.array(bedTypeValidator) });
export const houseRuleDocumentValidator = v.object({ ...system("houseRules"), textEn: v.string(), textTh: v.string(), icon: v.optional(v.string()) });
export const villaHouseRuleDocumentValidator = v.object({ ...system("villaHouseRules"), villaId: v.id("villas"), houseRuleId: v.id("houseRules") });

export const specialRateDocumentValidator = v.object({
  ...system("specialRates"), villaId: v.id("villas"),
  labelEn: v.string(), labelTh: v.string(),
  startDate: v.string(), endDate: v.string(), nightlyPriceThb: v.number(), sortOrder: v.number(),
});

export const availabilityBlockDocumentValidator = v.object({
  ...system("availabilityBlocks"), villaId: v.id("villas"), startDate: v.string(), endDate: v.string(),
  name: v.string(), description: v.optional(v.string()), externalEventId: v.string(), kind: v.optional(v.union(v.literal("booking"), v.literal("closed"))), fullSyncGeneration: v.optional(v.number()),
});

export const bookingRequestDocumentValidator = v.object({
  ...system("bookingRequests"), idempotencyKey: v.string(), villaId: v.id("villas"),
  checkIn: v.string(), checkOut: v.string(), guestCount: v.optional(v.number()),
  phone: v.optional(v.string()), lineId: v.optional(v.string()),
  estimatedTotalThb: v.number(), status: requestStatusValidator,
});
export const notificationDeliveryDocumentValidator = v.object({
  ...system("notificationDeliveries"), requestId: v.id("bookingRequests"), channel: notificationChannelValidator,
  status: notificationStatusValidator, lastAttemptAt: v.number(), error: v.optional(v.string()),
});

export const siteSettingsDocumentValidator = v.object({
  ...system("siteSettings"), businessName: v.string(), phone: v.string(), lineId: v.string(),
  notificationEmails: v.array(v.string()), lineNotificationUserId: v.optional(v.string()),
  notificationLanguage: v.union(v.literal("en"), v.literal("th")),
  defaultSeoTitleEn: v.string(), defaultSeoTitleTh: v.string(),
  defaultSeoDescriptionEn: v.string(), defaultSeoDescriptionTh: v.string(),
});

export const auditLogDocumentValidator = v.object({
  ...system("auditLogs"), actorWorkosUserId: v.string(), action: auditActionValidator, entityType: v.string(), entityId: v.string(),
});
export const googleCalendarChannelDocumentValidator = v.object({
  ...system("googleCalendarChannels"), villaId: v.id("villas"), calendarId: v.string(),
  channelId: v.string(), resourceId: v.optional(v.string()), channelToken: v.string(),
  status: v.union(v.literal("pending"), v.literal("active"), v.literal("error"), v.literal("stopped")),
  channelExpiration: v.optional(v.number()), syncToken: v.optional(v.string()), fullSyncGeneration: v.optional(v.number()),
  lastSyncedAt: v.optional(v.number()), lastSyncError: v.optional(v.string()), lastFetchedEvents: v.optional(v.number()), lastImportedEvents: v.optional(v.number()), lastAvailabilityBlockCount: v.optional(v.number()),
  syncInProgress: v.boolean(), pendingNotification: v.boolean(), retryAttempt: v.number(), lastMessageNumber: v.optional(v.number()),
});
export const dailyInquiryStatDocumentValidator = v.object({
  ...system("dailyInquiryStats"), date: v.string(), villaId: v.id("villas"), count: v.number(),
});
