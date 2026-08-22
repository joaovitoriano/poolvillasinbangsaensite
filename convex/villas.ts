import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { relevantAvailabilityBlocks, relevantSpecialRates } from "./lib/boundedData";
import { assertDateRange, dateInBangkok, rangesOverlap } from "./lib/dates";
import {
  amenityDocumentValidator,
  houseRuleDocumentValidator,
  sleepingDocumentValidator,
  specialRateDocumentValidator,
  villaDocumentValidator,
  villaPhotoDocumentValidator,
} from "./lib/documentValidators";
import { calculateQuote } from "./lib/pricing";
import { localeValidator } from "./lib/validators";

const nullableStringValidator = v.union(v.null(), v.string());
const photoWithUrlsValidator = v.object({
  ...villaPhotoDocumentValidator.fields,
  url: nullableStringValidator,
  thumbnailUrl: nullableStringValidator,
});
const villaCardValidator = v.object({
  ...villaDocumentValidator.fields,
  available: v.boolean(),
  mainPhotoUrl: nullableStringValidator,
  amenities: v.array(amenityDocumentValidator),
});
const relatedVillaValidator = v.object({ ...villaDocumentValidator.fields, mainPhotoUrl: nullableStringValidator });
const nightQuoteValidator = v.object({
  date: v.string(), priceThb: v.number(),
  rateKind: v.union(v.literal("weekday"), v.literal("weekend"), v.literal("special")),
  rateLabel: v.string(),
});

async function photosFor(ctx: QueryCtx, villaId: Id<"villas">) {
  const photos = await ctx.db.query("villaPhotos").withIndex("by_villaId_and_sortOrder", (q) => q.eq("villaId", villaId)).take(40);
  return await Promise.all(photos.map(async (photo) => ({
    ...photo,
    url: photo.storageId ? await ctx.storage.getUrl(photo.storageId) : photo.externalUrl ?? null,
    thumbnailUrl: photo.thumbnailStorageId
      ? await ctx.storage.getUrl(photo.thumbnailStorageId)
      : photo.storageId ? await ctx.storage.getUrl(photo.storageId) : photo.externalUrl ?? null,
  })));
}

async function amenitiesFor(ctx: QueryCtx, villaId: Id<"villas">) {
  const links = await ctx.db.query("villaAmenities").withIndex("by_villaId", (q) => q.eq("villaId", villaId)).take(100);
  return (await Promise.all(links.map((link) => ctx.db.get("amenities", link.amenityId)))).filter((item) => item !== null);
}

export const search = query({
  args: {
    locale: localeValidator, checkIn: v.optional(v.string()), checkOut: v.optional(v.string()), guests: v.optional(v.number()),
    minPrice: v.optional(v.number()), maxPrice: v.optional(v.number()), bedrooms: v.optional(v.number()), location: v.optional(v.string()),
    amenitySlugs: v.optional(v.array(v.string())),
    sort: v.optional(v.union(v.literal("recommended"), v.literal("price_asc"), v.literal("price_desc"), v.literal("capacity"), v.literal("newest"))),
  },
  returns: v.array(villaCardValidator),
  handler: async (ctx, args) => {
    if ((args.checkIn && !args.checkOut) || (!args.checkIn && args.checkOut)) throw new Error("Both dates are required / ต้องระบุวันที่ทั้งสองวัน");
    if (args.checkIn && args.checkOut) assertDateRange(args.checkIn, args.checkOut);
    let villas = await ctx.db.query("villas").withIndex("by_status_and_sortOrder", (q) => q.eq("status", "published")).take(100);
    villas = villas.filter((villa) =>
      (args.guests === undefined || villa.maxGuests >= args.guests) &&
      (args.minPrice === undefined || villa.weekdayPriceThb >= args.minPrice) &&
      (args.maxPrice === undefined || villa.weekdayPriceThb <= args.maxPrice) &&
      (args.bedrooms === undefined || villa.bedrooms >= args.bedrooms) &&
      (!args.location || villa.formattedAddress.toLowerCase().includes(args.location.toLowerCase())),
    );
    const result = [];
    for (const villa of villas) {
      const amenities = await amenitiesFor(ctx, villa._id);
      if (args.amenitySlugs?.length && !args.amenitySlugs.every((slug) => amenities.some((item) => item.slug === slug))) continue;
      const blocks = args.checkIn && args.checkOut ? await relevantAvailabilityBlocks(ctx, villa._id, args.checkIn, args.checkOut) : [];
      const available = !args.checkIn || !args.checkOut || !blocks.some((block) => rangesOverlap(args.checkIn!, args.checkOut!, block.startDate, block.endDate));
      const photos = await photosFor(ctx, villa._id);
      result.push({ ...villa, available, mainPhotoUrl: photos[0]?.url ?? null, amenities: amenities.slice(0, 8) });
    }
    result.sort((a, b) => args.sort === "price_asc" ? a.weekdayPriceThb - b.weekdayPriceThb :
      args.sort === "price_desc" ? b.weekdayPriceThb - a.weekdayPriceThb :
      args.sort === "capacity" ? b.maxGuests - a.maxGuests :
      args.sort === "newest" ? b._creationTime - a._creationTime : a.sortOrder - b.sortOrder);
    return result;
  },
});

export const getBySlug = query({
  args: { slug: v.string(), locale: localeValidator },
  returns: v.union(v.null(), v.object({
    ...villaDocumentValidator.fields,
    photos: v.array(photoWithUrlsValidator),
    sleeping: v.array(sleepingDocumentValidator),
    rules: v.array(houseRuleDocumentValidator),
    amenities: v.array(amenityDocumentValidator),
    rates: v.array(specialRateDocumentValidator),
    unavailable: v.array(v.object({ startDate: v.string(), endDate: v.string() })),
    related: v.array(relatedVillaValidator),
  })),
  handler: async (ctx, args) => {
    const villa = await ctx.db.query("villas").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique();
    if (!villa || villa.status !== "published") return null;
    const [photos, sleeping, ruleLinks, amenities, rates, blocks] = await Promise.all([
      photosFor(ctx, villa._id),
      ctx.db.query("sleepingArrangements").withIndex("by_villaId_and_bedroomNumber", (q) => q.eq("villaId", villa._id)).take(50),
      ctx.db.query("villaHouseRules").withIndex("by_villaId", (q) => q.eq("villaId", villa._id)).take(100),
      amenitiesFor(ctx, villa._id),
      relevantSpecialRates(ctx, villa._id, "9999-12-31"),
      relevantAvailabilityBlocks(ctx, villa._id, dateInBangkok(Date.now()), "9999-12-31"),
    ]);
    const rules = (await Promise.all(ruleLinks.map((link) => ctx.db.get("houseRules", link.houseRuleId)))).filter((item) => item !== null);
    const relatedRows = (await ctx.db.query("villas").withIndex("by_status_and_sortOrder", (q) => q.eq("status", "published")).take(20))
      .filter((item) => item._id !== villa._id).slice(0, 3);
    const related = await Promise.all(relatedRows.map(async (item) => ({ ...item, mainPhotoUrl: (await photosFor(ctx, item._id))[0]?.url ?? null })));
    return { ...villa, photos, sleeping, rules, amenities, rates, unavailable: blocks.map(({ startDate, endDate }) => ({ startDate, endDate })), related };
  },
});

export const quote = query({
  args: { villaId: v.id("villas"), checkIn: v.string(), checkOut: v.string() },
  returns: v.union(
    v.object({ available: v.literal(false), nights: v.array(nightQuoteValidator), totalThb: v.number() }),
    v.object({ available: v.literal(true), nights: v.array(nightQuoteValidator), totalThb: v.number() }),
  ),
  handler: async (ctx, args) => {
    assertDateRange(args.checkIn, args.checkOut);
    const villa = await ctx.db.get("villas", args.villaId);
    if (!villa || villa.status !== "published") throw new Error("Villa not found / ไม่พบวิลล่า");
    const blocks = await relevantAvailabilityBlocks(ctx, villa._id, args.checkIn, args.checkOut);
    if (blocks.some((block) => rangesOverlap(args.checkIn, args.checkOut, block.startDate, block.endDate)))
      return { available: false as const, nights: [], totalThb: 0 };
    const rates = await relevantSpecialRates(ctx, villa._id, args.checkOut);
    return { available: true as const, ...calculateQuote(villa, rates, args.checkIn, args.checkOut) };
  },
});

export const listAmenities = query({
  args: {},
  returns: v.array(amenityDocumentValidator),
  handler: async (ctx) => {
    const published = await ctx.db.query("villas").withIndex("by_status_and_sortOrder", (q) => q.eq("status", "published")).take(100);
    const ids = new Set<Id<"amenities">>();
    for (const villa of published) {
      const links = await ctx.db.query("villaAmenities").withIndex("by_villaId", (q) => q.eq("villaId", villa._id)).take(100);
      for (const link of links) ids.add(link.amenityId);
    }
    return (await Promise.all([...ids].map((id) => ctx.db.get("amenities", id))))
      .filter((amenity) => amenity !== null)
      .sort((a, b) => a.labelEn.localeCompare(b.labelEn));
  },
});

export const listSlugs = query({
  args: {},
  returns: v.array(v.object({ slug: v.string(), updatedAt: v.number() })),
  handler: async (ctx) => (await ctx.db.query("villas").withIndex("by_status_and_sortOrder", (q) => q.eq("status", "published")).take(200))
    .map((villa) => ({ slug: villa.slug, updatedAt: villa.updatedAt })),
});
