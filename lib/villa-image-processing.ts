const TARGETS = [720, 1080, 1440, 2048, 2560] as const;
const BYTE_BUDGETS: Record<number, number> = {
  720: 140_000,
  1080: 240_000,
  1440: 380_000,
  2048: 650_000,
  2560: 900_000,
};

type BrowserVariantFormat = "image/webp" | "image/jpeg";

function variantName(name: string, width: number, format: BrowserVariantFormat) {
  const base = name.replace(/\.[^.]+$/, "") || "villa-photo";
  return `${base}-${width}w.${format === "image/webp" ? "webp" : "jpg"}`;
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(
    (value) => value ? resolve(value) : reject(new Error("Image conversion failed")),
    "image/webp",
    quality,
  ));
}

async function encodeWithinBudget(canvas: HTMLCanvasElement, budget: number) {
  let quality = 0.86;
  let format: BrowserVariantFormat = "image/webp";
  let blob = await canvasBlob(canvas, quality);
  if (blob.type !== format) {
    format = "image/jpeg";
    blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (value) => value?.type === format ? resolve(value) : reject(new Error("This browser cannot encode villa images")),
      format,
      quality,
    ));
  }
  while (blob.size > budget && quality > 0.68) {
    quality -= 0.04;
    blob = format === "image/webp"
      ? await canvasBlob(canvas, quality)
      : await new Promise<Blob>((resolve, reject) => canvas.toBlob(
        (value) => value?.type === format ? resolve(value) : reject(new Error("Image conversion failed")),
        format,
        quality,
      ));
  }
  return { blob, format };
}

export type GeneratedPhotoVariant = {
  file: File;
  width: number;
  height: number;
  byteSize: number;
  format: BrowserVariantFormat;
};

async function decodeImage(file: File) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap as CanvasImageSource, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch { /* use the broadly supported image-element decoder below */ }
  }
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.src = objectUrl;
  try {
    if (typeof image.decode === "function") await image.decode();
    else await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Image decoding failed")); });
    return { source: image as CanvasImageSource, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(objectUrl) };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

export async function* createVillaImageVariants(file: File): AsyncGenerator<GeneratedPhotoVariant> {
  const decoded = await decodeImage(file);
  try {
    const maximumWidth = Math.min(decoded.width, TARGETS.at(-1)!);
    const widths = [...new Set([
      ...TARGETS.filter((width) => width < maximumWidth),
      maximumWidth,
    ])];
    for (const width of widths) {
      const height = Math.max(1, Math.round(decoded.height * (width / decoded.width)));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This browser cannot prepare responsive images");
      context.drawImage(decoded.source, 0, 0, width, height);
      const budget = BYTE_BUDGETS[width] ?? Math.max(90_000, Math.round(width * 350));
      const { blob, format } = await encodeWithinBudget(canvas, budget);
      yield {
        file: new File([blob], variantName(file.name, width, format), { type: format }),
        width,
        height,
        byteSize: blob.size,
        format,
      };
    }
  } finally {
    decoded.close();
  }
}
