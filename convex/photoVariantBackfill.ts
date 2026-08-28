"use node";

import sharp from "sharp";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, type ActionCtx } from "./_generated/server";

const TARGETS = [720, 1080, 1440, 2048, 2560] as const;
const BYTE_BUDGETS: Record<number, number> = {
  720: 140_000,
  1080: 240_000,
  1440: 380_000,
  2048: 650_000,
  2560: 900_000,
};
const REUSABLE_SOURCE_FORMATS = new Set(["image/webp", "image/jpeg", "image/png", "image/avif"] as const);
type ReusableSourceFormat = "image/webp" | "image/jpeg" | "image/png" | "image/avif";

function sourceFormat(blobType: string, sharpFormat?: string): ReusableSourceFormat | undefined {
  if (REUSABLE_SOURCE_FORMATS.has(blobType as ReusableSourceFormat)) return blobType as ReusableSourceFormat;
  if (sharpFormat === "jpeg") return "image/jpeg";
  if (sharpFormat === "png") return "image/png";
  if (sharpFormat === "webp") return "image/webp";
  if (sharpFormat === "avif") return "image/avif";
  return undefined;
}

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

async function encodeVariant(input: Buffer, width: number, budget: number) {
  let quality = 84;
  let output = await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality, effort: 4 }).toBuffer({ resolveWithObject: true });
  while (output.data.byteLength > budget && quality > 68) {
    quality -= 4;
    output = await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality, effort: 4 }).toBuffer({ resolveWithObject: true });
  }
  return output;
}

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
  const metadata = await sharp(input).rotate().metadata();
  if (!metadata.width || !metadata.height) throw new Error("Image dimensions could not be read");
  const sourceWidth = metadata.autoOrient?.width ?? metadata.width;
  const sourceHeight = metadata.autoOrient?.height ?? metadata.height;
  const maximumWidth = Math.min(sourceWidth, TARGETS.at(-1)!);
  const widths = [...new Set([...TARGETS.filter((width) => width < maximumWidth), maximumWidth])];
  const existing = new Set(photo.existingWidths);
  const reusableSourceFormat = sourceFormat(blob.type, metadata.format);
  const canReuseSource = Boolean(
    photo.storageId &&
    sourceWidth <= TARGETS.at(-1)! &&
    reusableSourceFormat,
  );
  let created = 0;
  for (const width of widths) {
    if (width === sourceWidth && canReuseSource && photo.storageId && reusableSourceFormat) {
      await ctx.runMutation(internal.photoVariantBackfillData.recordVariant, {
        villaPhotoId: photo.photoId,
        storageId: photo.storageId,
        width: sourceWidth,
        height: sourceHeight,
        byteSize: blob.size,
        format: reusableSourceFormat,
      });
      if (!existing.has(width)) created += 1;
      continue;
    }
    if (existing.has(width)) continue;
    const budget = BYTE_BUDGETS[width] ?? Math.max(90_000, Math.round(width * 350));
    const output = await encodeVariant(input, width, budget);
    const storageId = await ctx.storage.store(new Blob([new Uint8Array(output.data)], { type: "image/webp" }));
    await ctx.runMutation(internal.photoVariantBackfillData.recordVariant, {
      villaPhotoId: photo.photoId,
      storageId,
      width: output.info.width,
      height: output.info.height,
      byteSize: output.data.byteLength,
      format: "image/webp",
    });
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
