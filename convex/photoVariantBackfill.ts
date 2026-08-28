"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, type ActionCtx } from "./_generated/server";
import {
  encodeLosslessWebp,
  plannedVariantWidths,
  readImageSource,
  reusableImageFormat,
} from "./lib/losslessImageVariants";

type PhotoSource = {
  photoId: Id<"villaPhotos">;
  storageId?: Id<"_storage">;
  externalUrl?: string;
  existingWidths: number[];
};

type PhotoPage = {
  photos: PhotoSource[];
  continueCursor: string;
  isDone: boolean;
};

type BackfillResult = {
  processedPhotos: number;
  createdVariants: number;
  continueCursor: string;
  isDone: boolean;
};

async function sourceBlob(
  ctx: ActionCtx,
  source: { storageId?: Id<"_storage">; externalUrl?: string },
) {
  if (source.storageId) {
    const blob = await ctx.storage.get(source.storageId);
    if (!blob) throw new Error("Original image file is missing");
    return blob;
  }
  if (!source.externalUrl) throw new Error("Photo has no image source");
  const response = await fetch(source.externalUrl, { redirect: "follow" });
  if (!response.ok) throw new Error(`External image request failed (${response.status})`);
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > 25_000_000) throw new Error("External image exceeds the 25 MB backfill limit");
  const blob = await response.blob();
  if (blob.size > 25_000_000) throw new Error("External image exceeds the 25 MB backfill limit");
  if (!blob.type.startsWith("image/")) throw new Error("External source is not an image");
  return blob;
}

async function processPhoto(
  ctx: ActionCtx,
  photo: PhotoSource,
): Promise<number> {
  const blob = await sourceBlob(ctx, photo);
  const input = Buffer.from(await blob.arrayBuffer());
  const source = await readImageSource(input);
  const widths = plannedVariantWidths(source.width);
  const existing = new Set(photo.existingWidths);
  const reusableSourceFormat = reusableImageFormat(blob.type, source.format);
  let created = 0;
  for (const width of widths) {
    if (existing.has(width)) continue;
    if (width === source.width && photo.storageId && reusableSourceFormat) {
      await ctx.runMutation(internal.photoVariantBackfillData.recordVariant, {
        villaPhotoId: photo.photoId,
        storageId: photo.storageId,
        width: source.width,
        height: source.height,
        byteSize: blob.size,
        format: reusableSourceFormat,
      });
      created += 1;
      continue;
    }
    const output = await encodeLosslessWebp(input, width);
    const storageId = await ctx.storage.store(new Blob([new Uint8Array(output.data)], { type: "image/webp" }));
    try {
      await ctx.runMutation(internal.photoVariantBackfillData.recordVariant, {
        villaPhotoId: photo.photoId,
        storageId,
        width: output.info.width,
        height: output.info.height,
        byteSize: output.data.byteLength,
        format: "image/webp",
      });
    } catch (error) {
      await ctx.storage.delete(storageId);
      throw error;
    }
    created += 1;
  }
  return created;
}

export const processBatch = action({
  args: { cursor: v.union(v.string(), v.null()), limit: v.optional(v.number()) },
  returns: v.object({
    processedPhotos: v.number(),
    createdVariants: v.number(),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args): Promise<BackfillResult> => {
    await ctx.runQuery(internal.photoVariantBackfillData.requireBackfillAccess, {});
    const page: PhotoPage = await ctx.runQuery(internal.photoVariantBackfillData.pagePhotos, {
      cursor: args.cursor,
      limit: args.limit ?? 1,
    });
    let createdVariants = 0;
    for (const photo of page.photos) createdVariants += await processPhoto(ctx, photo);
    return {
      processedPhotos: page.photos.length,
      createdVariants,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});

export const removeLegacyVariants = action({
  args: { variantIds: v.array(v.id("villaPhotoVariants")) },
  returns: v.object({ deletedVariantRecords: v.number(), deletedStorageFiles: v.number() }),
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.photoVariantBackfillData.requireBackfillAccess, {});
    const candidates: Array<{ variantId: Id<"villaPhotoVariants">; storageId: Id<"_storage"> }> = await ctx.runQuery(
      internal.photoVariantBackfillData.validateVariantRemoval,
      { variantIds: args.variantIds },
    );
    await ctx.runMutation(internal.photoVariantBackfillData.removeVariantRecords, { candidates });
    let deletedStorageFiles = 0;
    for (const candidate of candidates) {
      await ctx.storage.delete(candidate.storageId);
      deletedStorageFiles += 1;
    }
    return { deletedVariantRecords: candidates.length, deletedStorageFiles };
  },
});
