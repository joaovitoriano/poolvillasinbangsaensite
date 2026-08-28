import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { amenitySlug } from "./lib/amenities";
import { writeAudit } from "./lib/audit";
import { bedTypeValidator, imageVariantFormatValidator, villaStatusValidator } from "./lib/validators";

const nullableString = v.union(v.string(), v.null());
const nullableNumber = v.union(v.number(), v.null());
const nullableStorageId = v.union(v.id("_storage"), v.null());
const photoVariantInputValidator = v.object({
  storageId: v.id("_storage"), width: v.number(), height: v.number(), byteSize: v.number(), format: imageVariantFormatValidator,
});
const savedPhotoVariantValidator = photoVariantInputValidator.extend({ url: v.string() });

export const villaEditorDetailsValidator = v.object({
  slug: v.string(),
  nameEn: v.string(), nameTh: v.string(),
  descriptionEn: v.string(), descriptionTh: v.string(),
  latitude: v.number(), longitude: v.number(), formattedAddress: v.string(),
  weekdayPriceThb: v.number(), weekendPriceThb: nullableNumber,
  bedrooms: v.number(), bathrooms: v.number(), maxGuests: v.number(), parkingSpaces: v.number(),
  checkInTime: v.string(), checkOutTime: v.string(), securityDepositThb: nullableNumber,
  sortOrder: v.number(), googleCalendarId: nullableString,
});
const rateInputValidator = v.object({
  rateId: v.optional(v.id("specialRates")), clientKey: v.string(),
  labelEn: v.string(), labelTh: v.string(),
  startDate: v.string(), endDate: v.string(), recurringDay: v.optional(v.literal("sunday")),
  nightlyPriceThb: v.number(),
});
const photoInputValidator = v.object({
  photoId: v.optional(v.id("villaPhotos")), clientKey: v.string(),
  storageId: nullableStorageId, thumbnailStorageId: nullableStorageId, externalUrl: nullableString,
  variants: v.optional(v.array(photoVariantInputValidator)),
});
const customAmenityValidator = v.object({
  clientKey: v.string(), slug: v.string(), labelEn: v.string(), labelTh: v.string(), icon: nullableString,
});
const ruleInputValidator = v.object({
  ruleId: v.optional(v.id("houseRules")), clientKey: v.string(),
  textEn: v.string(), textTh: v.string(), icon: nullableString,
});
const sleepingInputValidator = v.object({
  sleepingId: v.optional(v.id("sleepingArrangements")), clientKey: v.string(),
  bedroomNumber: v.number(), beds: v.array(bedTypeValidator),
});

export const villaEditorPayloadValidator = v.object({
  villaId: v.optional(v.id("villas")),
  expectedUpdatedAt: v.optional(v.number()),
  villa: villaEditorDetailsValidator,
  rates: v.array(rateInputValidator),
  photos: v.array(photoInputValidator),
  amenityIds: v.array(v.id("amenities")),
  customAmenities: v.array(customAmenityValidator),
  rules: v.array(ruleInputValidator),
  sleeping: v.array(sleepingInputValidator),
});
const savedRateValidator = rateInputValidator.extend({ rateId: v.id("specialRates") });
const savedPhotoValidator = photoInputValidator.extend({
  photoId: v.id("villaPhotos"), url: nullableString, thumbnailUrl: nullableString,
  variants: v.array(savedPhotoVariantValidator),
});
const savedRuleValidator = ruleInputValidator.extend({ ruleId: v.id("houseRules") });
const savedSleepingValidator = sleepingInputValidator.extend({ sleepingId: v.id("sleepingArrangements") });
const savedAmenityValidator = v.object({
  amenityId: v.id("amenities"), slug: v.string(), labelEn: v.string(), labelTh: v.string(),
  icon: nullableString,
});

export const villaEditorSnapshotValidator = v.object({
  villaId: v.id("villas"), status: villaStatusValidator, createdAt: v.number(), updatedAt: v.number(),
  details: villaEditorDetailsValidator,
  rates: v.array(savedRateValidator), photos: v.array(savedPhotoValidator),
  amenities: v.array(savedAmenityValidator), rules: v.array(savedRuleValidator),
  sleeping: v.array(savedSleepingValidator),
});

function optionalString(value: string | null) {
  return value?.trim() || undefined;
}

export const get = query({
  args: { villaId: v.id("villas") },
  returns: v.union(v.null(), villaEditorSnapshotValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const villa = await ctx.db.get("villas", args.villaId);
    if (!villa) return null;
    const [rates, photos, amenityLinks, ruleLinks, sleeping] = await Promise.all([
      ctx.db.query("specialRates").withIndex("by_villaId_and_sortOrder", (q) => q.eq("villaId", villa._id)).take(100),
      ctx.db.query("villaPhotos").withIndex("by_villaId_and_sortOrder", (q) => q.eq("villaId", villa._id)).take(100),
      ctx.db.query("villaAmenities").withIndex("by_villaId", (q) => q.eq("villaId", villa._id)).take(100),
      ctx.db.query("villaHouseRules").withIndex("by_villaId", (q) => q.eq("villaId", villa._id)).take(100),
      ctx.db.query("sleepingArrangements").withIndex("by_villaId_and_bedroomNumber", (q) => q.eq("villaId", villa._id)).take(50),
    ]);
    const amenities = (await Promise.all(amenityLinks.map((link) => ctx.db.get("amenities", link.amenityId))))
      .filter((item) => item !== null).map((item) => ({
        amenityId: item._id, slug: item.slug, labelEn: item.labelEn, labelTh: item.labelTh,
        icon: item.icon ?? null,
      }));
    const rules = (await Promise.all(ruleLinks.map((link) => ctx.db.get("houseRules", link.houseRuleId))))
      .filter((item) => item !== null).map((item) => ({
        ruleId: item._id, clientKey: item._id, textEn: item.textEn, textTh: item.textTh,
        icon: item.icon ?? null,
      }));
    const photoRows = await Promise.all(photos.map(async (photo) => {
      const variants = await ctx.db.query("villaPhotoVariants")
        .withIndex("by_villaPhotoId_and_width", (q) => q.eq("villaPhotoId", photo._id)).take(10);
      const variantsWithUrls = (await Promise.all(variants.map(async (variant) => {
        const url = await ctx.storage.getUrl(variant.storageId);
        return url ? { storageId: variant.storageId, width: variant.width, height: variant.height, byteSize: variant.byteSize, format: variant.format, url } : null;
      }))).filter((variant) => variant !== null);
      return {
        photoId: photo._id, clientKey: photo._id,
        storageId: photo.storageId ?? null, thumbnailStorageId: photo.thumbnailStorageId ?? null,
        externalUrl: photo.externalUrl ?? null,
        url: photo.storageId ? await ctx.storage.getUrl(photo.storageId) : photo.externalUrl ?? null,
        thumbnailUrl: photo.thumbnailStorageId ? await ctx.storage.getUrl(photo.thumbnailStorageId) :
          photo.storageId ? await ctx.storage.getUrl(photo.storageId) : photo.externalUrl ?? null,
        variants: variantsWithUrls,
      };
    }));
    return {
      villaId: villa._id, status: villa.status, createdAt: villa._creationTime, updatedAt: villa.updatedAt,
      details: {
        slug: villa.slug, nameEn: villa.nameEn, nameTh: villa.nameTh,
        descriptionEn: villa.descriptionEn, descriptionTh: villa.descriptionTh,
        latitude: villa.latitude, longitude: villa.longitude, formattedAddress: villa.formattedAddress,
        weekdayPriceThb: villa.weekdayPriceThb, weekendPriceThb: villa.weekendPriceThb ?? null,
        bedrooms: villa.bedrooms, bathrooms: villa.bathrooms, maxGuests: villa.maxGuests, parkingSpaces: villa.parkingSpaces,
        checkInTime: villa.checkInTime, checkOutTime: villa.checkOutTime,
        securityDepositThb: villa.securityDepositThb ?? null, sortOrder: villa.sortOrder,
        googleCalendarId: villa.googleCalendarId ?? null,
      },
      rates: rates.map((rate) => ({
        rateId: rate._id, clientKey: rate._id,
        labelEn: rate.labelEn, labelTh: rate.labelTh,
        startDate: rate.startDate, endDate: rate.endDate, recurringDay: rate.recurringDay,
        nightlyPriceThb: rate.nightlyPriceThb,
      })),
      photos: photoRows,
      amenities,
      rules,
      sleeping: sleeping.map((room) => ({
        sleepingId: room._id, clientKey: room._id, bedroomNumber: room.bedroomNumber, beds: room.beds,
      })),
    };
  },
});

export const saveVillaEditor = mutation({
  args: villaEditorPayloadValidator.fields,
  returns: v.object({ villaId: v.id("villas"), updatedAt: v.number() }),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const now = Date.now();
    let villaId = args.villaId;
    let previousGoogleCalendarId: string | undefined;
    const nextGoogleCalendarId = optionalString(args.villa.googleCalendarId);
    if (villaId) {
      const villa = await ctx.db.get("villas", villaId);
      if (!villa) throw new Error("Villa not found / ไม่พบวิลล่า");
      if (args.expectedUpdatedAt === undefined || args.expectedUpdatedAt !== villa.updatedAt)
        throw new Error("This villa was updated by someone else. Load the latest version before saving again. / วิลล่านี้ถูกอัปเดตโดยผู้ดูแลคนอื่น โปรดโหลดเวอร์ชันล่าสุดก่อนบันทึกอีกครั้ง");
      previousGoogleCalendarId = optionalString(villa.googleCalendarId ?? null);
      await ctx.db.replace("villas", villaId, {
        slug: args.villa.slug.trim(), status: villa.status,
        nameEn: args.villa.nameEn.trim(), nameTh: args.villa.nameTh.trim(),
        descriptionEn: args.villa.descriptionEn.trim(), descriptionTh: args.villa.descriptionTh.trim(),
        latitude: args.villa.latitude, longitude: args.villa.longitude, formattedAddress: args.villa.formattedAddress.trim(),
        weekdayPriceThb: args.villa.weekdayPriceThb, weekendPriceThb: args.villa.weekendPriceThb ?? undefined,
        bedrooms: args.villa.bedrooms, bathrooms: args.villa.bathrooms, maxGuests: args.villa.maxGuests, parkingSpaces: args.villa.parkingSpaces,
        checkInTime: args.villa.checkInTime, checkOutTime: args.villa.checkOutTime,
        securityDepositThb: args.villa.securityDepositThb ?? undefined, sortOrder: args.villa.sortOrder,
        googleCalendarId: nextGoogleCalendarId, updatedAt: now,
      });
    } else {
      villaId = await ctx.db.insert("villas", {
        slug: args.villa.slug.trim(), status: "draft",
        nameEn: args.villa.nameEn.trim(), nameTh: args.villa.nameTh.trim(),
        descriptionEn: args.villa.descriptionEn.trim(), descriptionTh: args.villa.descriptionTh.trim(),
        latitude: args.villa.latitude, longitude: args.villa.longitude, formattedAddress: args.villa.formattedAddress.trim(),
        weekdayPriceThb: args.villa.weekdayPriceThb, weekendPriceThb: args.villa.weekendPriceThb ?? undefined,
        bedrooms: args.villa.bedrooms, bathrooms: args.villa.bathrooms, maxGuests: args.villa.maxGuests, parkingSpaces: args.villa.parkingSpaces,
        checkInTime: args.villa.checkInTime, checkOutTime: args.villa.checkOutTime,
        securityDepositThb: args.villa.securityDepositThb ?? undefined, sortOrder: args.villa.sortOrder,
        googleCalendarId: nextGoogleCalendarId, updatedAt: now,
      });
    }

    const [childRows, existingPhotos] = await Promise.all([
      Promise.all([
      ctx.db.query("specialRates").withIndex("by_villaId_and_sortOrder", (q) => q.eq("villaId", villaId)).take(101),
      ctx.db.query("villaAmenities").withIndex("by_villaId", (q) => q.eq("villaId", villaId)).take(101),
      ctx.db.query("villaHouseRules").withIndex("by_villaId", (q) => q.eq("villaId", villaId)).take(101),
      ctx.db.query("sleepingArrangements").withIndex("by_villaId_and_bedroomNumber", (q) => q.eq("villaId", villaId)).take(51),
      ]),
      ctx.db.query("villaPhotos").withIndex("by_villaId_and_sortOrder", (q) => q.eq("villaId", villaId)).take(101),
    ]);
    if (childRows.some((rows) => rows.length > 100) || existingPhotos.length > 100) throw new Error("Villa content exceeds the supported editor limit / เนื้อหาวิลล่าเกินขีดจำกัดของตัวแก้ไข");
    for (const rows of childRows) for (const row of rows) await ctx.db.delete(row._id);
    for (const [sortOrder, rate] of args.rates.entries()) {
      await ctx.db.insert("specialRates", {
        villaId, labelEn: rate.labelEn.trim(), labelTh: rate.labelTh.trim(),
        startDate: rate.recurringDay ? "" : rate.startDate,
        endDate: rate.recurringDay ? "" : rate.endDate,
        recurringDay: rate.recurringDay,
        nightlyPriceThb: rate.nightlyPriceThb, sortOrder,
      });
    }
    const existingPhotoIds = new Set(existingPhotos.map((photo) => photo._id));
    const keptPhotoIds = new Set<string>();
    for (const [sortOrder, photo] of args.photos.entries()) {
      const value = {
        storageId: photo.storageId ?? undefined, thumbnailStorageId: photo.thumbnailStorageId ?? undefined,
        externalUrl: optionalString(photo.externalUrl), sortOrder,
      };
      const photoId = photo.photoId && existingPhotoIds.has(photo.photoId)
        ? (await ctx.db.patch("villaPhotos", photo.photoId, value), photo.photoId)
        : await ctx.db.insert("villaPhotos", { villaId, ...value });
      keptPhotoIds.add(photoId);
      for (const variant of photo.variants ?? []) {
        const existingVariant = await ctx.db.query("villaPhotoVariants")
          .withIndex("by_villaPhotoId_and_width", (q) => q.eq("villaPhotoId", photoId).eq("width", variant.width)).unique();
        const variantValue = { storageId: variant.storageId, height: variant.height, byteSize: variant.byteSize, format: variant.format };
        if (existingVariant) await ctx.db.patch("villaPhotoVariants", existingVariant._id, variantValue);
        else await ctx.db.insert("villaPhotoVariants", { villaPhotoId: photoId, width: variant.width, ...variantValue });
      }
    }
    for (const photo of existingPhotos) {
      if (keptPhotoIds.has(photo._id)) continue;
      const variants = await ctx.db.query("villaPhotoVariants")
        .withIndex("by_villaPhotoId_and_width", (q) => q.eq("villaPhotoId", photo._id)).take(10);
      for (const variant of variants) await ctx.db.delete("villaPhotoVariants", variant._id);
      await ctx.db.delete("villaPhotos", photo._id);
    }
    const amenityIds = new Set(args.amenityIds);
    for (const custom of args.customAmenities) {
      const slug = custom.slug.trim() || amenitySlug(custom.labelEn) || amenitySlug(custom.labelTh) || `custom-${custom.clientKey.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const existing = await ctx.db.query("amenities").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
      const amenityId = existing?._id ?? await ctx.db.insert("amenities", {
        slug, labelEn: custom.labelEn.trim(), labelTh: custom.labelTh.trim(),
        icon: optionalString(custom.icon),
      });
      amenityIds.add(amenityId);
    }
    for (const amenityId of amenityIds) {
      if (!await ctx.db.get("amenities", amenityId)) throw new Error("Amenity not found / ไม่พบสิ่งอำนวยความสะดวก");
      await ctx.db.insert("villaAmenities", { villaId, amenityId });
    }
    for (const rule of args.rules) {
      let houseRuleId = rule.ruleId;
      if (houseRuleId && !await ctx.db.get("houseRules", houseRuleId)) houseRuleId = undefined;
      if (!houseRuleId) {
        const textEn = rule.textEn.trim();
        const existing = await ctx.db.query("houseRules").withIndex("by_textEn", (q) => q.eq("textEn", textEn)).unique();
        houseRuleId = existing?._id ?? await ctx.db.insert("houseRules", {
          textEn, textTh: rule.textTh.trim(), icon: optionalString(rule.icon),
        });
      }
      await ctx.db.insert("villaHouseRules", { villaId, houseRuleId });
    }
    for (const room of args.sleeping)
      await ctx.db.insert("sleepingArrangements", { villaId, bedroomNumber: room.bedroomNumber, beds: room.beds });
    await writeAudit(ctx, actor, args.villaId ? "update" : "create", "villa", villaId);
    if (previousGoogleCalendarId !== nextGoogleCalendarId) {
      await ctx.scheduler.runAfter(0, internal.googleCalendar.reconcileVilla, { villaId });
    }
    return { villaId, updatedAt: now };
  },
});

export const cleanupUncommittedPhotoUploads = mutation({
  args: { storageIds: v.array(v.id("_storage")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    for (const storageId of args.storageIds) {
      const referenced = await ctx.db.query("villaPhotos").withIndex("by_storageId", (q) => q.eq("storageId", storageId)).first()
        ?? await ctx.db.query("villaPhotos").withIndex("by_thumbnailStorageId", (q) => q.eq("thumbnailStorageId", storageId)).first()
        ?? await ctx.db.query("villaPhotoVariants").withIndex("by_storageId", (q) => q.eq("storageId", storageId)).first();
      if (!referenced) await ctx.storage.delete(storageId);
    }
    return null;
  },
});
