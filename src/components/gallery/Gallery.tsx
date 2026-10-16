"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { GalleryImage } from "@/domain/venue";
import { ScrollReveal } from "@/components/scroll-reveal/ScrollReveal";

export function Gallery({ images }: { images: GalleryImage[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex === null ? null : images[activeIndex];
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const close = useCallback(() => {
    // La miniatura sigue montada: devolverle el foco antes de desmontar el diálogo.
    if (activeIndex !== null) thumbnailRefs.current[activeIndex]?.focus();
    setActiveIndex(null);
  }, [activeIndex]);

  useEffect(() => {
    if (activeIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, close]);

  return (
    <section aria-labelledby="gallery-title" className="px-6 py-16">
      <ScrollReveal>
        <h2 id="gallery-title" className="mb-8 text-center font-heading text-3xl text-primary">
          Galería
        </h2>
        <ul className="mx-auto grid max-w-md grid-cols-2 gap-3">
          {images.map((image, index) => (
            <li key={image.src}>
              <button
                type="button"
                ref={(node) => {
                  thumbnailRefs.current[index] = node;
                }}
                onClick={() => setActiveIndex(index)}
                aria-label={`Ampliar imagen: ${image.alt}`}
                className="relative block aspect-square w-full overflow-hidden rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 448px) 50vw, 224px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      </ScrollReveal>
      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.alt}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={close}
        >
          <button
            type="button"
            autoFocus
            onClick={close}
            className="absolute right-4 top-4 rounded-full bg-white/10 px-4 py-2 text-white"
          >
            Cerrar
          </button>
          <div className="relative h-[80svh] w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <Image src={active.src} alt={active.alt} fill sizes="100vw" className="object-contain" />
          </div>
        </div>
      ) : null}
    </section>
  );
}
