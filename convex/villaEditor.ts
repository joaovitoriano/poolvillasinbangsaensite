import { type Infer, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { amenitySlug } from "./lib/amenities";
import { writeAudit } from "./lib/audit";
import { assertDatePeriod } from "./lib/dates";
import { bedTypeValidator, villaStatusValidator } from "./lib/validators";

const nullableString = v.union(v.string(), v.null());
const nullableNumber = v.union(v.number(), v.null());
const nullableStorageId = v.union(v.id("_storage"), v.null());
const LOCK_TTL_MS = 30_000;

export const villaEditorDetailsValidator = v.object({
  slug: v.string(),
  nameEn: v.string(), nameTh: v.string(), nameSource: v.string(),
  descriptionEn: v.string(), descriptionTh: v.string(), descriptionSource: v.string(),
  latitude: v.number(), longitude: v.number(), formattedAddress: v.string(),
  weekdayPriceThb: v.number(), weekendPriceThb: nullableNumber,
  bedrooms: v.number(), bathrooms: v.number(), maxGuests: v.number(), parkingSpaces: v.number(),
  checkInTime: v.string(), checkOutTime: v.string(), securityDepositThb: nullableNumber,
  sortOrder: v.number(), googleCalendarId: nullableString,
});
const rateInputValidator = v.object({
  rateId: v.optional(v.id("specialRates")), clientKey: v.string(),
  labelEn: v.string(), labelTh: v.string(), labelSource: v.string(),
  startDate: v.string(), endDate: v.string(), nightlyPriceThb: v.number(),
});
const photoInputValidator = v.object({
  photoId: v.optional(v.id("villaPhotos")), clientKey: v.string(),
  storageId: nullableStorageId, thumbnailStorageId: nullableStorageId, externalUrl: nullableString,
});
const customAmenityValidator = v.object({
  clientKey: v.string(), labelEn: v.string(), labelTh: v.string(), labelSource: v.string(), icon: nullableString,
});
const ruleInputValidator = v.object({
  ruleId: v.optional(v.id("houseRules")), clientKey: v.string(),
  textEn: v.string(), textTh: v.string(), textSource: v.string(), icon: nullableString,
});
const sleepingInputValidator = v.object({
  sleepingId: v.optional(v.id("sleepingArrangements")), clientKey: v.string(),
  bedroomNumber: v.number(), beds: v.array(bedTypeValidator),
});

export const villaEditorPayloadValidator = v.object({
  villaId: v.optional(v.id("villas")),
  sessionId: v.optional(v.string()),
  villa: villaEditorDetailsValidator,
  rates: v.array(rateInputValidator),
  photos: v.array(photoInputValidator),
  amenityIds: v.array(v.id("amenities")),
  customAmenities: v.array(customAmenityValidator),
  rules: v.array(ruleInputValidator),
  sleeping: v.array(sleepingInputValidator),
});
const savedRateValidator = rateInputValidator.extend({ rateId: v.id("specialRates") });
const savedPhotoValidator = photoInputValidator.extend({ photoId: v.id("villaPhotos"), url: nullableString, thumbnailUrl: nullableString });
const savedRuleValidator = ruleInputValidator.extend({ ruleId: v.id("houseRules") });
const savedSleepingValidator = sleepingInputValidator.extend({ sleepingId: v.id("sleepingArrangements") });
const savedAmenityValidator = v.object({
  amenityId: v.id("amenities"), slug: v.string(), labelEn: v.string(), labelTh: v.string(),
  labelSource: v.string(), icon: nullableString,
});

export const villaEditorSnapshotValidator = v.object({
  villaId: v.id("villas"), status: villaStatusValidator, createdAt: v.number(), updatedAt: v.number(),
  details: villaEditorDetailsValidator,
  rates: v.array(savedRateValidator), photos: v.array(savedPhotoValidator),
  amenities: v.array(savedAmenityValidator), rules: v.array(savedRuleValidator),
  sleeping: v.array(savedSleepingValidator),
});

type EditorPayload = Infer<typeof villaEditorPayloadValidator>;

function optionalString(value: string | null) {
  return value?.trim() || undefined;
}

function assertBilingual(source: string, english: string, thai: string, label: string) {
  const normalizedSource = source.trim();
  if (!normalizedSource || !english.trim() || !thai.trim())
    throw new Error(`${label} requires English and Thai / ${label}ต้องมีทั้งภาษาอังกฤษและภาษาไทย`);
  if (normalizedSource !== english.trim() && normalizedSource !== thai.trim())
    throw new Error(`${label} does not match its translations / ${label}ไม่ตรงกับคำแปล`);
}

function validate(payload: EditorPayload) {
  const villa = payload.villa;
  assertBilingual(villa.nameSource, villa.nameEn, villa.nameTh, "Villa name");
  assertBilingual(villa.descriptionSource, villa.descriptionEn, villa.descriptionTh, "Description");
  if (!villa.slug.trim() || !villa.formattedAddress.trim()) throw new Error("Villa slug and address are required / ต้องระบุ Slug และที่อยู่วิลล่า");
  if (!Number.isFinite(villa.latitude) || villa.latitude < -90 || villa.latitude > 90 ||
      !Number.isFinite(villa.longitude) || villa.longitude < -180 || villa.longitude > 180)
    throw new Error("Select a valid map location / เลือกตำแหน่งแผนที่ที่ถูกต้อง");
  for (const value of [villa.weekdayPriceThb, villa.weekendPriceThb ?? 0, villa.securityDepositThb ?? 0])
    if (!Number.isFinite(value) || value < 0) throw new Error("Prices cannot be negative / ราคาต้องไม่ติดลบ");
  for (const value of [villa.bedrooms, villa.bathrooms, villa.maxGuests, villa.parkingSpaces, villa.sortOrder])
    if (!Number.isInteger(value) || value < 0) throw new Error("Capacity values must be nonnegative whole numbers / จำนวนรองรับต้องเป็นจำนวนเต็มที่ไม่ติดลบ");
  if (villa.bedrooms < 1 || villa.maxGuests < 1) throw new Error("Bedrooms and maximum guests must be positive / ห้องนอนและจำนวนผู้เข้าพักสูงสุดต้องมากกว่าศูนย์");
  payload.rates.forEach((rate) => {
    assertBilingual(rate.labelSource, rate.labelEn, rate.labelTh, "Rate name");
    assertDatePeriod(rate.startDate, rate.endDate);
    if (rate.nightlyPriceThb <= 0) throw new Error("Nightly price must be positive / ราคาต่อคืนต้องมากกว่าศูนย์");
  });
  payload.photos.forEach((photo) => {
    const stored = photo.storageId !== null;
    const external = Boolean(photo.externalUrl?.trim());
    if (stored === external) throw new Error("Each photo needs one file or URL / รูปภาพแต่ละรูปต้องมีไฟล์หรือ URL อย่างใดอย่างหนึ่ง");
    if (photo.thumbnailStorageId && !photo.storageId) throw new Error("A thumbnail requires a stored photo / รูปย่อต้องใช้รูปภาพที่จัดเก็บไว้");
  });
  payload.customAmenities.forEach((item) => assertBilingual(item.labelSource, item.labelEn, item.labelTh, "Amenity"));
  payload.rules.forEach((rule) => assertBilingual(rule.textSource, rule.textEn, rule.textTh, "House rule"));
  if (payload.sleeping.length !== villa.bedrooms) throw new Error("Add one sleeping arrangement for every bedroom / เพิ่มการจัดที่นอนสำหรับทุกห้องนอน");
  const bedroomNumbers = payload.sleeping.map((room) => room.bedroomNumber).sort((a, b) => a - b);
  if (bedroomNumbers.some((number, index) => number !== index + 1) || payload.sleeping.some((room) => room.beds.length === 0))
    throw new Error("Bedroom numbers and beds are incomplete / หมายเลขห้องนอนและเตียงไม่ครบ");
}

async function assertEditSession(ctx: MutationCtx, villaId: Id<"villas">, workosUserId: string, sessionId: string | undefined) {
  const lock = await ctx.db.query("villaEditSessions").withIndex("by_villaId", (q) => q.eq("villaId", villaId)).unique();
  if (!sessionId || !lock || lock.sessionId !== sessionId || lock.workosUserId !== workosUserId || lock.expiresAt <= Date.now())
    throw new Error("Your villa edit lock expired. Reload before saving. / ล็อกการแก้ไขวิลล่าหมดอายุ โปรดโหลดใหม่ก่อนบันทึก");
  return lock;
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
        labelSource: item.labelSource ?? item.labelEn, icon: item.icon ?? null,
      }));
    const rules = (await Promise.all(ruleLinks.map((link) => ctx.db.get("houseRules", link.houseRuleId))))
      .filter((item) => item !== null).map((item) => ({
        ruleId: item._id, clientKey: item._id, textEn: item.textEn, textTh: item.textTh,
        textSource: item.textSource ?? item.textEn, icon: item.icon ?? null,
      }));
    const photoRows = await Promise.all(photos.map(async (photo) => ({
      photoId: photo._id, clientKey: photo._id,
      storageId: photo.storageId ?? null, thumbnailStorageId: photo.thumbnailStorageId ?? null,
      externalUrl: photo.externalUrl ?? null,
      url: photo.storageId ? await ctx.storage.getUrl(photo.storageId) : photo.externalUrl ?? null,
      thumbnailUrl: photo.thumbnailStorageId ? await ctx.storage.getUrl(photo.thumbnailStorageId) :
        photo.storageId ? await ctx.storage.getUrl(photo.storageId) : photo.externalUrl ?? null,
    })));
    return {
      villaId: villa._id, status: villa.status, createdAt: villa._creationTime, updatedAt: villa.updatedAt,
      details: {
        slug: villa.slug, nameEn: villa.nameEn, nameTh: villa.nameTh, nameSource: villa.nameSource ?? villa.nameEn,
        descriptionEn: villa.descriptionEn, descriptionTh: villa.descriptionTh, descriptionSource: villa.descriptionSource ?? villa.descriptionEn,
        latitude: villa.latitude, longitude: villa.longitude, formattedAddress: villa.formattedAddress,
        weekdayPriceThb: villa.weekdayPriceThb, weekendPriceThb: villa.weekendPriceThb ?? null,
        bedrooms: villa.bedrooms, bathrooms: villa.bathrooms, maxGuests: villa.maxGuests, parkingSpaces: villa.parkingSpaces,
        checkInTime: villa.checkInTime, checkOutTime: villa.checkOutTime,
        securityDepositThb: villa.securityDepositThb ?? null, sortOrder: villa.sortOrder,
        googleCalendarId: villa.googleCalendarId ?? null,
      },
      rates: rates.map((rate) => ({
        rateId: rate._id, clientKey: rate._id,
        labelEn: rate.labelEn, labelTh: rate.labelTh, labelSource: rate.labelSource ?? rate.labelEn,
        startDate: rate.startDate, endDate: rate.endDate, nightlyPriceThb: rate.nightlyPriceThb,
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
    validate(args);
    const now = Date.now();
    let villaId = args.villaId;
    let lockId: Id<"villaEditSessions"> | null = null;
    let previousGoogleCalendarId: string | undefined;
    const nextGoogleCalendarId = optionalString(args.villa.googleCalendarId);
    if (villaId) {
      const villa = await ctx.db.get("villas", villaId);
      if (!villa) throw new Error("Villa not found / ไม่พบวิลล่า");
      previousGoogleCalendarId = optionalString(villa.googleCalendarId ?? null);
      lockId = (await assertEditSession(ctx, villaId, actor.workosUserId, args.sessionId))._id;
      await ctx.db.replace("villas", villaId, {
        slug: args.villa.slug.trim(), status: villa.status,
        nameEn: args.villa.nameEn.trim(), nameTh: args.villa.nameTh.trim(), nameSource: args.villa.nameSource.trim(),
        descriptionEn: args.villa.descriptionEn.trim(), descriptionTh: args.villa.descriptionTh.trim(), descriptionSource: args.villa.descriptionSource.trim(),
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
        nameEn: args.villa.nameEn.trim(), nameTh: args.villa.nameTh.trim(), nameSource: args.villa.nameSource.trim(),
        descriptionEn: args.villa.descriptionEn.trim(), descriptionTh: args.villa.descriptionTh.trim(), descriptionSource: args.villa.descriptionSource.trim(),
        latitude: args.villa.latitude, longitude: args.villa.longitude, formattedAddress: args.villa.formattedAddress.trim(),
        weekdayPriceThb: args.villa.weekdayPriceThb, weekendPriceThb: args.villa.weekendPriceThb ?? undefined,
        bedrooms: args.villa.bedrooms, bathrooms: args.villa.bathrooms, maxGuests: args.villa.maxGuests, parkingSpaces: args.villa.parkingSpaces,
        checkInTime: args.villa.checkInTime, checkOutTime: args.villa.checkOutTime,
        securityDepositThb: args.villa.securityDepositThb ?? undefined, sortOrder: args.villa.sortOrder,
        googleCalendarId: nextGoogleCalendarId, updatedAt: now,
      });
    }

    const childRows = await Promise.all([
      ctx.db.query("specialRates").withIndex("by_villaId_and_sortOrder", (q) => q.eq("villaId", villaId)).take(101),
      ctx.db.query("villaPhotos").withIndex("by_villaId_and_sortOrder", (q) => q.eq("villaId", villaId)).take(101),
      ctx.db.query("villaAmenities").withIndex("by_villaId", (q) => q.eq("villaId", villaId)).take(101),
      ctx.db.query("villaHouseRules").withIndex("by_villaId", (q) => q.eq("villaId", villaId)).take(101),
      ctx.db.query("sleepingArrangements").withIndex("by_villaId_and_bedroomNumber", (q) => q.eq("villaId", villaId)).take(51),
    ]);
    if (childRows.some((rows) => rows.length > 100)) throw new Error("Villa content exceeds the supported editor limit / เนื้อหาวิลล่าเกินขีดจำกัดของตัวแก้ไข");
    for (const rows of childRows) for (const row of rows) await ctx.db.delete(row._id);
    for (const [sortOrder, rate] of args.rates.entries())
      await ctx.db.insert("specialRates", {
        villaId, labelEn: rate.labelEn.trim(), labelTh: rate.labelTh.trim(), labelSource: rate.labelSource.trim(),
        startDate: rate.startDate, endDate: rate.endDate, nightlyPriceThb: rate.nightlyPriceThb, sortOrder,
      });
    for (const [sortOrder, photo] of args.photos.entries())
      await ctx.db.insert("villaPhotos", {
        villaId, storageId: photo.storageId ?? undefined, thumbnailStorageId: photo.thumbnailStorageId ?? undefined,
        externalUrl: optionalString(photo.externalUrl), sortOrder,
      });
    const amenityIds = new Set(args.amenityIds);
    for (const custom of args.customAmenities) {
      const slug = amenitySlug(custom.labelEn);
      const existing = await ctx.db.query("amenities").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
      const amenityId = existing?._id ?? await ctx.db.insert("amenities", {
        slug, labelEn: custom.labelEn.trim(), labelTh: custom.labelTh.trim(),
        labelSource: custom.labelSource.trim(), icon: optionalString(custom.icon),
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
          textEn, textTh: rule.textTh.trim(), textSource: rule.textSource.trim(), icon: optionalString(rule.icon),
        });
      }
      await ctx.db.insert("villaHouseRules", { villaId, houseRuleId });
    }
    for (const room of args.sleeping)
      await ctx.db.insert("sleepingArrangements", { villaId, bedroomNumber: room.bedroomNumber, beds: room.beds });
    if (lockId) await ctx.db.delete(lockId);
    await writeAudit(ctx, actor, args.villaId ? "update" : "create", "villa", villaId);
    if (previousGoogleCalendarId !== nextGoogleCalendarId) {
      await ctx.scheduler.runAfter(0, internal.googleCalendar.reconcileVilla, { villaId });
    }
    return { villaId, updatedAt: now };
  },
});

const lockResultValidator = v.object({
  ownedByCurrentUser: v.boolean(), editorName: v.string(), expiresAt: v.number(),
});

export const getEditLock = query({
  args: { villaId: v.id("villas"), now: v.number() },
  returns: v.union(v.null(), lockResultValidator),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const lock = await ctx.db.query("villaEditSessions").withIndex("by_villaId", (q) => q.eq("villaId", args.villaId)).unique();
    if (!lock || lock.expiresAt <= args.now) return null;
    return { ownedByCurrentUser: lock.workosUserId === actor.workosUserId, editorName: "Another administrator / ผู้ดูแลระบบคนอื่น", expiresAt: lock.expiresAt };
  },
});

export const acquireEditLock = mutation({
  args: { villaId: v.id("villas"), sessionId: v.string() },
  returns: lockResultValidator,
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const now = Date.now();
    const existing = await ctx.db.query("villaEditSessions").withIndex("by_villaId", (q) => q.eq("villaId", args.villaId)).unique();
    if (existing && existing.expiresAt > now && (existing.workosUserId !== actor.workosUserId || existing.sessionId !== args.sessionId)) {
      return { ownedByCurrentUser: false, editorName: "Another administrator / ผู้ดูแลระบบคนอื่น", expiresAt: existing.expiresAt };
    }
    const expiresAt = now + LOCK_TTL_MS;
    if (existing) await ctx.db.replace("villaEditSessions", existing._id, { villaId: args.villaId, workosUserId: actor.workosUserId, sessionId: args.sessionId, expiresAt });
    else await ctx.db.insert("villaEditSessions", { villaId: args.villaId, workosUserId: actor.workosUserId, sessionId: args.sessionId, expiresAt });
    return { ownedByCurrentUser: true, editorName: actor.workosUserId, expiresAt };
  },
});

export const heartbeatEditLock = mutation({
  args: { villaId: v.id("villas"), sessionId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const lock = await ctx.db.query("villaEditSessions").withIndex("by_villaId", (q) => q.eq("villaId", args.villaId)).unique();
    if (!lock || lock.workosUserId !== actor.workosUserId || lock.sessionId !== args.sessionId || lock.expiresAt <= Date.now()) return false;
    await ctx.db.patch("villaEditSessions", lock._id, { expiresAt: Date.now() + LOCK_TTL_MS });
    return true;
  },
});

export const releaseEditLock = mutation({
  args: { villaId: v.id("villas"), sessionId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const lock = await ctx.db.query("villaEditSessions").withIndex("by_villaId", (q) => q.eq("villaId", args.villaId)).unique();
    if (lock && lock.workosUserId === actor.workosUserId && lock.sessionId === args.sessionId) await ctx.db.delete(lock._id);
    return null;
  },
});

export const cleanupUncommittedPhotoUploads = mutation({
  args: { storageIds: v.array(v.id("_storage")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    for (const storageId of args.storageIds) {
      const referenced = await ctx.db.query("villaPhotos").withIndex("by_storageId", (q) => q.eq("storageId", storageId)).first()
        ?? await ctx.db.query("villaPhotos").withIndex("by_thumbnailStorageId", (q) => q.eq("thumbnailStorageId", storageId)).first();
      if (!referenced) await ctx.storage.delete(storageId);
    }
    return null;
  },
});
