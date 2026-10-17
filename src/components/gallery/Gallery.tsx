"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useIsPresent } from "motion/react";
import type { GalleryImage } from "@/domain/venue";
import { backdropFade, entranceSpring } from "@/lib/motion";
import { RevealItem } from "@/components/scroll-reveal/RevealItem";
import { ScrollReveal } from "@/components/scroll-reveal/ScrollReveal";

// Miniatura y vista ampliada comparten layoutId: Motion anima una hacia la otra.
const layoutIdFor = (image: GalleryImage) => `gallery-image-${image.src}`;

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
        <RevealItem>
          <h2 id="gallery-title" className="mb-8 text-center font-heading text-3xl text-primary">
            Galería
          </h2>
        </RevealItem>
        <ul className="mx-auto grid max-w-md grid-cols-2 gap-3">
          {images.map((image, index) => (
            <RevealItem as="li" key={image.src}>
              <button
                type="button"
                ref={(node) => {
                  thumbnailRefs.current[index] = node;
                }}
                onClick={() => setActiveIndex(index)}
                aria-label={`Ampliar imagen: ${image.alt}`}
                className="relative block aspect-square w-full overflow-hidden rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <motion.div layoutId={layoutIdFor(image)} transition={entranceSpring} className="absolute inset-0">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(max-width: 448px) 50vw, 224px"
                    className="object-cover"
                  />
                </motion.div>
              </button>
            </RevealItem>
          ))}
        </ul>
      </ScrollReveal>
      <AnimatePresence>{active ? <Lightbox key={active.src} image={active} onClose={close} /> : null}</AnimatePresence>
    </section>
  );
}

function Lightbox({ image, onClose }: { image: GalleryImage; onClose: () => void }) {
  // Mientras corre la salida, el diálogo ya está cerrado: deja de ser dialog y de
  // recibir interacción (el foco ya volvió a la miniatura).
  const isPresent = useIsPresent();
  return (
    <div
      role={isPresent ? "dialog" : undefined}
      aria-modal={isPresent ? "true" : undefined}
      aria-label={isPresent ? image.alt : undefined}
      aria-hidden={isPresent ? undefined : "true"}
      inert={!isPresent}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* El fondo y el botón se funden; la imagen viaja desde/hacia la miniatura. */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-black/90"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={backdropFade}
      />
      <motion.button
        type="button"
        autoFocus
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 px-4 py-2 text-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={backdropFade}
      >
        Cerrar
      </motion.button>
      <motion.div
        layoutId={layoutIdFor(image)}
        transition={entranceSpring}
        className="relative h-[80svh] w-full max-w-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <Image src={image.src} alt={image.alt} fill sizes="100vw" className="object-contain" />
      </motion.div>
    </div>
  );
}
