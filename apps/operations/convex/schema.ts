import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  operationsUsers: defineTable({
    workosUserId: v.string(),
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    lineId: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("owner"), v.literal("agent")),
    permissions: v.array(v.string()),
    active: v.boolean(),
    accountMode: v.optional(v.union(v.literal("owner"), v.literal("agent"))),
    lastSeenAt: v.number(),
  })
    .index("by_workosUserId", ["workosUserId"])
    .index("by_email", ["email"]),

  activity: defineTable({
    actorId: v.id("operationsUsers"), actorName: v.string(),
    entity: v.string(), entityId: v.string(), action: v.string(),
    villaId: v.optional(v.id("villas")), villaName: v.optional(v.string()),
    changes: v.array(v.object({ field: v.string(), before: v.string(), after: v.string() })),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),

  villas: defineTable({
    name: v.string(),
    contactName: v.string(),
    contactLineId: v.string(),
    contactPhone: v.string(),
    archived: v.boolean(),
    createdByUserId: v.id("operationsUsers"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_archived_and_name", ["archived", "name"]),

  villaAssignments: defineTable({
    villaId: v.id("villas"),
    userId: v.id("operationsUsers"),
    role: v.union(v.literal("owner"), v.literal("agent")),
    createdAt: v.number(),
  })
    .index("by_userId_and_villaId", ["userId", "villaId"])
    .index("by_villaId_and_userId", ["villaId", "userId"]),

  villaInvitations: defineTable({
    villaId: v.id("villas"),
    email: v.string(),
    role: v.union(v.literal("owner"), v.literal("agent")),
    workosInvitationId: v.optional(v.string()),
    verifiedWorkosUserId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("revoked"),
      v.literal("expired"),
    ),
    invitedByUserId: v.id("operationsUsers"),
    createdAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_villaId_and_status", ["villaId", "status"])
    .index("by_email_and_status", ["email", "status"]),

  pricingPresets: defineTable({
    villaId: v.id("villas"),
    name: v.string(),
    nightlyPriceThb: v.number(),
    daysOfWeek: v.array(v.number()),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    sortOrder: v.number(),
    isDefault: v.boolean(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_villaId_and_active", ["villaId", "active"]),

  guests: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    phone: v.string(),
    normalizedPhone: v.string(),
    lineId: v.optional(v.string()),
    normalizedLineId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_normalizedName", ["normalizedName"])
    .index("by_normalizedPhone", ["normalizedPhone"])
    .index("by_normalizedLineId", ["normalizedLineId"]),

  closedDates: defineTable({
    villaId: v.id("villas"),
    from: v.string(),
    to: v.string(),
    notes: v.optional(v.string()),
    createdByUserId: v.id("operationsUsers"),
    status: v.union(v.literal("active"), v.literal("cancelled")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  closedDateNights: defineTable({
    villaId: v.id("villas"),
    closedDateId: v.id("closedDates"),
    date: v.string(),
  }).index("by_villa_and_date", ["villaId", "date"])
    .index("by_closed_date", ["closedDateId"]),

  commissionPreferences: defineTable({
    userId: v.id("operationsUsers"),
    villaId: v.id("villas"),
    mode: v.union(v.literal("amount"), v.literal("percentage")),
    value: v.number(),
  }).index("by_user_and_villa", ["userId", "villaId"]),

  bookings: defineTable({
    villaId: v.id("villas"),
    guestId: v.id("guests"),
    checkIn: v.string(),
    checkOut: v.string(),
    status: v.union(v.literal("confirmed"), v.literal("cancelled")),
    subtotalThb: v.number(),
    discountThb: v.number(),
    discountMode: v.union(v.literal("amount"), v.literal("percentage")),
    discountValue: v.number(),
    totalChargedThb: v.number(),
    creatorCommissionThb: v.number(),
    commissionMode: v.union(v.literal("amount"), v.literal("percentage")),
    commissionValue: v.number(),
    villaNetThb: v.number(),
    notes: v.optional(v.string()),
    createdByUserId: v.id("operationsUsers"),
    createdByRole: v.union(v.literal("admin"), v.literal("owner"), v.literal("agent")),
    createdAt: v.number(),
    updatedAt: v.number(),
    cancelledAt: v.optional(v.number()),
    retainedCommissionThb: v.optional(v.number()),
  })
    .index("by_villaId_and_checkIn", ["villaId", "checkIn"])
    .index("by_villa_and_createdAt", ["villaId", "createdAt"])
    .index("by_villa_creator_and_createdAt", ["villaId", "createdByUserId", "createdAt"])
    .index("by_villaId_and_status", ["villaId", "status"])
    .index("by_creator_and_checkIn", ["createdByUserId", "checkIn"])
    .index("by_villa_creator_checkIn", ["villaId", "createdByUserId", "checkIn"])
    .index("by_guest_and_creator", ["guestId", "createdByUserId"])
    .index("by_guest_and_villa", ["guestId", "villaId"]),

  bookingNights: defineTable({
    bookingId: v.id("bookings"),
    villaId: v.id("villas"),
    date: v.string(),
    nightlyPriceThb: v.number(),
    presetId: v.optional(v.id("pricingPresets")),
    presetName: v.string(),
  })
    .index("by_bookingId_and_date", ["bookingId", "date"])
    .index("by_villaId_and_date", ["villaId", "date"]),

});
