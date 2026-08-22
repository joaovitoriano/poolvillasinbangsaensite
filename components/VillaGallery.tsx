"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useEffect, useState } from "react";
import { shouldBypassImageOptimization } from "@/lib/remote-image";

type Photo = { _id: string; url: string | null };

export function VillaGallery({ photos, locale, villaName }: { photos: Photo[]; locale: "en" | "th"; villaName: string }) {
  const usable = photos.filter((photo): photo is Photo & { url: string } => Boolean(photo.url));
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps", duration: 30, loop: false, skipSnaps: false });
  const [active, setActive] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(usable.length > 1);

  useEffect(() => {
    if (!emblaApi) return;
    const syncSelection = () => {
      setActive(emblaApi.selectedScrollSnap());
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };
    syncSelection();
    emblaApi.on("select", syncSelection);
    emblaApi.on("reInit", syncSelection);
    return () => {
      emblaApi.off("select", syncSelection);
      emblaApi.off("reInit", syncSelection);
    };
  }, [emblaApi]);

  if (!usable.length) return null;

  return (
    <section className="bg-[var(--paper)] lg:px-8 lg:pt-7" aria-label={locale === "th" ? "แกลเลอรีรูปภาพวิลล่า" : "Villa photo gallery"}>
      <div className="relative mx-auto max-w-[1280px] overflow-hidden bg-[var(--paper-deep)] shadow-[0_18px_46px_rgba(0,19,38,.1)] lg:rounded-2xl">
        <div ref={emblaRef} className="overflow-hidden lg:cursor-grab lg:active:cursor-grabbing">
          <div className="flex touch-pan-y">
            {usable.map((photo, index) => (
              <figure key={photo._id} className="relative aspect-[5/4] min-w-0 flex-[0_0_100%] sm:aspect-[4/3] lg:aspect-[16/7]">
                <Image src={photo.url} unoptimized={shouldBypassImageOptimization(photo.url)} alt={locale === "th" ? `${villaName} รูปที่ ${index + 1} จาก ${usable.length}` : `${villaName}, photo ${index + 1} of ${usable.length}`} fill priority={index === 0} sizes="100vw" draggable={false} className="object-cover" />
              </figure>
            ))}
          </div>
        </div>
        {usable.length > 1 ? <>
          <button type="button" aria-label={locale === "th" ? "รูปก่อนหน้า" : "Previous photo"} disabled={!canScrollPrev} onClick={() => emblaApi?.scrollPrev()} className="absolute left-5 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/92 text-[var(--navy)] shadow-md transition hover:bg-white disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terracotta)] lg:grid"><ChevronLeft size={20} /></button>
          <button type="button" aria-label={locale === "th" ? "รูปถัดไป" : "Next photo"} disabled={!canScrollNext} onClick={() => emblaApi?.scrollNext()} className="absolute right-5 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/92 text-[var(--navy)] shadow-md transition hover:bg-white disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terracotta)] lg:grid"><ChevronRight size={20} /></button>
          <div className="absolute bottom-4 left-1/2 flex max-w-[calc(100%-7rem)] -translate-x-1/2 gap-1.5" aria-hidden="true">{usable.slice(0, 12).map((photo, index) => <span key={photo._id} className={`h-1.5 rounded-full transition-all ${index === active ? "w-5 bg-white" : "w-1.5 bg-white/55"}`} />)}</div>
        </> : null}
        <span className="absolute bottom-3 right-3 rounded-md bg-black/65 px-2.5 py-1.5 font-mono text-[10px] font-medium text-white backdrop-blur-sm lg:bottom-5 lg:right-5">{active + 1} / {usable.length}</span>
      </div>
    </section>
  );
}
