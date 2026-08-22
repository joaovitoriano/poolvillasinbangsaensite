import imageCompression from "browser-image-compression";

const FULL_SIZE_MB = 4;
const FULL_MAX_DIMENSION = 2048;
const THUMB_SIZE = 400;

function webpName(name: string, suffix = "") {
  const base = name.replace(/\.[^.]+$/, "") || "villa-photo";
  return `${base}${suffix}.webp`;
}
export async function compressVillaImage(file: File) {
  const compressed = await imageCompression(file, {
    maxSizeMB: FULL_SIZE_MB,
    maxWidthOrHeight: FULL_MAX_DIMENSION,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.92,
  });
  return new File([compressed], webpName(file.name), { type: "image/webp" });
}

export async function createVillaThumbnail(file: File) {
  const bitmap = await createImageBitmap(file);
  const edge = Math.min(bitmap.width, bitmap.height);
  const sourceX = (bitmap.width - edge) / 2;
  const sourceY = (bitmap.height - edge) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = THUMB_SIZE;
  canvas.height = THUMB_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot prepare image thumbnails");
  context.drawImage(bitmap, sourceX, sourceY, edge, edge, 0, 0, THUMB_SIZE, THUMB_SIZE);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Thumbnail conversion failed")), "image/webp", 0.8));
  return new File([blob], webpName(file.name, "-thumb"), { type: "image/webp" });
}
