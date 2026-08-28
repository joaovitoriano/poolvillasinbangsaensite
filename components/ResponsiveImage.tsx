import type { ImgHTMLAttributes } from "react";

export type ResponsiveImageVariant = {
  url: string;
  width: number;
  height?: number;
  byteSize?: number;
  format?: "image/webp" | "image/jpeg" | "image/png" | "image/avif";
};

export type ResponsivePhoto = {
  url: string | null;
  variants: ResponsiveImageVariant[];
};

export function responsiveImageSources(photo: ResponsivePhoto) {
  const variants = [...photo.variants].sort((left, right) => left.width - right.width);
  const src = variants[0]?.url ?? photo.url;
  return {
    src,
    srcSet: variants.length
      ? variants.map((variant) => `${variant.url} ${variant.width}w`).join(", ")
      : undefined,
  };
}

const preloadCache = new Map<string, Promise<void>>();

export function preloadResponsiveImage(photo: ResponsivePhoto, sizes: string) {
  if (typeof window === "undefined") return Promise.resolve();
  const { src, srcSet } = responsiveImageSources(photo);
  if (!src) return Promise.resolve();
  const cacheKey = `${srcSet ?? src}|${sizes}`;
  const cached = preloadCache.get(cacheKey);
  if (cached) return cached;
  const image = new Image();
  image.decoding = "async";
  image.sizes = sizes;
  if (srcSet) image.srcset = srcSet;
  image.src = src;
  const promise = image.decode().catch(() => new Promise<void>((resolve, reject) => {
    if (image.complete) {
      if (image.naturalWidth > 0) resolve();
      else reject(new Error("Image preload failed"));
      return;
    }
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => reject(new Error("Image preload failed")), { once: true });
  }));
  preloadCache.set(cacheKey, promise);
  void promise.catch(() => preloadCache.delete(cacheKey));
  return promise;
}

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  photo: ResponsivePhoto;
  priority?: boolean;
};

export function ResponsiveImage({ photo, priority = false, sizes, alt, loading, fetchPriority, decoding, ...props }: Props) {
  const { src, srcSet } = responsiveImageSources(photo);
  if (!src) return null;
  return (
    // The browser must own srcset selection so Convex serves the stored variant directly.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt ?? ""}
      loading={loading ?? (priority ? "eager" : "lazy")}
      fetchPriority={fetchPriority ?? (priority ? "high" : "auto")}
      decoding={decoding ?? "async"}
    />
  );
}
