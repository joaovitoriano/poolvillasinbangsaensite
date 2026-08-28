import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { requireSuperadmin, sessionUserValidator } from "./lib/access";
import { imageVariantFormatValidator } from "./lib/validators";

const photoSourceValidator = v.object({
  photoId: v.id("villaPhotos"),
  storageId: v.optional(v.id("_storage")),
  externalUrl: v.optional(v.string()),
  existingWidths: v.array(v.number()),
});

export const requireBackfillAccess = internalQuery({
  args: {},
  returns: sessionUserValidator,
  handler: async (ctx) => await requireSuperadmin(ctx),
});

export const pagePhotos = internalQuery({
  args: { cursor: v.union(v.string(), v.null()), limit: v.number() },
  returns: v.object({
    photos: v.array(photoSourceValidator),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db.query("villaPhotos").order("asc").paginate({
      cursor: args.cursor,
      numItems: Math.max(1, Math.min(5, Math.floor(args.limit))),
    });
    const photos = await Promise.all(page.page.map(async (photo) => {
      const variants = await ctx.db.query("villaPhotoVariants")
        .withIndex("by_villaPhotoId_and_width", (q) => q.eq("villaPhotoId", photo._id))
        .take(10);
      return {
        photoId: photo._id,
        storageId: photo.storageId,
        externalUrl: photo.externalUrl,
        existingWidths: variants.map((variant) => variant.width),
      };
    }));
    return { photos, continueCursor: page.continueCursor, isDone: page.isDone };
  },
});

export const recordVariant = internalMutation({
  args: {
    villaPhotoId: v.id("villaPhotos"),
    storageId: v.id("_storage"),
    width: v.number(),
    height: v.number(),
    byteSize: v.number(),
    format: imageVariantFormatValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!await ctx.db.get("villaPhotos", args.villaPhotoId)) throw new Error("Villa photo no longer exists");
    const existing = await ctx.db.query("villaPhotoVariants")
      .withIndex("by_villaPhotoId_and_width", (q) => q.eq("villaPhotoId", args.villaPhotoId).eq("width", args.width))
      .unique();
    const value = {
      storageId: args.storageId,
      height: args.height,
      byteSize: args.byteSize,
      format: args.format,
    };
    if (existing) await ctx.db.patch("villaPhotoVariants", existing._id, value);
    else await ctx.db.insert("villaPhotoVariants", { villaPhotoId: args.villaPhotoId, width: args.width, ...value });
    return null;
  },
});

const removalCandidateValidator = v.object({
  variantId: v.id("villaPhotoVariants"),
  storageId: v.id("_storage"),
});

export const validateVariantRemoval = internalQuery({
  args: { variantIds: v.array(v.id("villaPhotoVariants")) },
  returns: v.array(removalCandidateValidator),
  handler: async (ctx, args) => {
    await requireSuperadmin(ctx);
    if (new Set(args.variantIds).size !== args.variantIds.length) throw new Error("Variant IDs must be unique");
    const candidates = [];
    for (const variantId of args.variantIds) {
      const variant = await ctx.db.get("villaPhotoVariants", variantId);
      if (!variant) throw new Error(`Variant ${variantId} no longer exists`);
      const originalReference = await ctx.db.query("villaPhotos")
        .withIndex("by_storageId", (q) => q.eq("storageId", variant.storageId)).first();
      const thumbnailReference = await ctx.db.query("villaPhotos")
        .withIndex("by_thumbnailStorageId", (q) => q.eq("thumbnailStorageId", variant.storageId)).first();
      const variantReferences = await ctx.db.query("villaPhotoVariants")
        .withIndex("by_storageId", (q) => q.eq("storageId", variant.storageId)).take(2);
      if (originalReference || thumbnailReference || variantReferences.some((reference) => reference._id !== variantId)) {
        throw new Error(`Storage file ${variant.storageId} has another reference and cannot be removed`);
      }
      candidates.push({ variantId, storageId: variant.storageId });
    }
    return candidates;
  },
});

export const removeVariantRecords = internalMutation({
  args: { candidates: v.array(removalCandidateValidator) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSuperadmin(ctx);
    for (const candidate of args.candidates) {
      const variant = await ctx.db.get("villaPhotoVariants", candidate.variantId);
      if (!variant || variant.storageId !== candidate.storageId) throw new Error("Variant changed before removal");
      await ctx.db.delete("villaPhotoVariants", candidate.variantId);
    }
    return null;
  },
});
