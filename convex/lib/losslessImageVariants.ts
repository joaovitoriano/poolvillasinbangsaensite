"use node";

import sharp from "sharp";

export const IMAGE_VARIANT_WIDTHS = [720, 1080, 1440, 2048, 2560] as const;

export type ReusableImageFormat = "image/webp" | "image/jpeg" | "image/png" | "image/avif";

const REUSABLE_IMAGE_FORMATS = new Set<ReusableImageFormat>([
  "image/webp",
  "image/jpeg",
  "image/png",
  "image/avif",
]);

export function reusableImageFormat(blobType: string, sharpFormat?: string): ReusableImageFormat | undefined {
  if (REUSABLE_IMAGE_FORMATS.has(blobType as ReusableImageFormat)) return blobType as ReusableImageFormat;
  if (sharpFormat === "jpeg") return "image/jpeg";
  if (sharpFormat === "png") return "image/png";
  if (sharpFormat === "webp") return "image/webp";
  if (sharpFormat === "avif") return "image/avif";
  return undefined;
}

export async function readImageSource(input: Buffer) {
  const metadata = await sharp(input).rotate().metadata();
  if (!metadata.width || !metadata.height) throw new Error("Image dimensions could not be read / ไม่สามารถอ่านขนาดรูปภาพได้");
  return {
    width: metadata.autoOrient?.width ?? metadata.width,
    height: metadata.autoOrient?.height ?? metadata.height,
    format: metadata.format,
  };
}

export function plannedVariantWidths(sourceWidth: number) {
  const maximumWidth = Math.min(sourceWidth, IMAGE_VARIANT_WIDTHS.at(-1)!);
  return [...new Set([
    ...IMAGE_VARIANT_WIDTHS.filter((width) => width < maximumWidth),
    maximumWidth,
  ])];
}

export async function encodeLosslessWebp(input: Buffer, width: number) {
  return await sharp(input)
    .rotate()
    .resize({ width, withoutEnlargement: true, kernel: "lanczos3" })
    .webp({ lossless: true, exact: true, effort: 6 })
    .toBuffer({ resolveWithObject: true });
}
