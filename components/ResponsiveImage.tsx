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

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  photo: ResponsivePhoto;
  priority?: boolean;
};

export function ResponsiveImage({ photo, priority = false, sizes, alt, ...props }: Props) {
  const variants = [...photo.variants].sort((left, right) => left.width - right.width);
  const src = variants[0]?.url ?? photo.url;
  if (!src) return null;
  const srcSet = variants.length
    ? variants.map((variant) => `${variant.url} ${variant.width}w`).join(", ")
    : undefined;
  return (
    // The browser must own srcset selection so Convex serves the stored variant directly.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt ?? ""}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
    />
  );
}
