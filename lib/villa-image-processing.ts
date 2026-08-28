const TARGETS = [720, 1080, 1440, 2048, 2560] as const;
type BrowserVariantFormat = "image/png";

function variantName(name: string, width: number) {
  const base = name.replace(/\.[^.]+$/, "") || "villa-photo";
  return `${base}-${width}w.png`;
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(
    (value) => value ? resolve(value) : reject(new Error("Image conversion failed")),
    "image/png",
  ));
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
      const blob = await canvasBlob(canvas);
      yield {
        file: new File([blob], variantName(file.name, width), { type: "image/png" }),
        width,
        height,
        byteSize: blob.size,
        format: "image/png",
      };
    }
  } finally {
    decoded.close();
  }
}
