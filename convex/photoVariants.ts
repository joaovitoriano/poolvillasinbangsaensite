"use node";

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import {
  encodeLosslessWebp,
  plannedVariantWidths,
  readImageSource,
  reusableImageFormat,
} from "./lib/losslessImageVariants";
import { imageVariantFormatValidator } from "./lib/validators";

const generatedVariantValidator = v.object({
  storageId: v.id("_storage"),
  width: v.number(),
  height: v.number(),
  byteSize: v.number(),
  format: imageVariantFormatValidator,
});

export const createForUpload = action({
  args: { originalStorageId: v.id("_storage") },
  returns: v.array(generatedVariantValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const sourceBlob = await ctx.storage.get(args.originalStorageId);
    if (!sourceBlob) throw new Error("Original image file is missing / ไม่พบไฟล์รูปภาพต้นฉบับ");
    const input = Buffer.from(await sourceBlob.arrayBuffer());
    const source = await readImageSource(input);
    const reusableFormat = reusableImageFormat(sourceBlob.type, source.format);
    const createdStorageIds: Id<"_storage">[] = [];
    try {
      const variants = [];
      for (const width of plannedVariantWidths(source.width)) {
        if (width === source.width && reusableFormat) {
          variants.push({
            storageId: args.originalStorageId,
            width: source.width,
            height: source.height,
            byteSize: sourceBlob.size,
            format: reusableFormat,
          });
          continue;
        }
        const output = await encodeLosslessWebp(input, width);
        const storageId = await ctx.storage.store(new Blob(
          [new Uint8Array(output.data)],
          { type: "image/webp" },
        ));
        createdStorageIds.push(storageId);
        variants.push({
          storageId,
          width: output.info.width,
          height: output.info.height,
          byteSize: output.data.byteLength,
          format: "image/webp" as const,
        });
      }
      return variants;
    } catch (error) {
      await Promise.allSettled(createdStorageIds.map((storageId) => ctx.storage.delete(storageId)));
      if (error instanceof Error && error.message.includes(" / ")) throw error;
      throw new Error("The image could not be prepared without quality loss / ไม่สามารถเตรียมรูปภาพโดยไม่ลดคุณภาพได้");
    }
  },
});
