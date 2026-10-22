"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useIsPresent, type Transition } from "motion/react";
import type { GalleryImage } from "@/domain/venue";
import { backdropFade, entranceSpring, photoSlide } from "@/lib/motion";
import { RevealItem } from "@/components/scroll-reveal/RevealItem";
import { ScrollReveal } from "@/components/scroll-reveal/ScrollReveal";
import { swipeDirection } from "@/components/gallery/swipe";

// Miniatura y vista ampliada comparten layoutId: Motion anima una hacia la otra.
const layoutIdFor = (image: GalleryImage) => `gallery-image-${image.src}`;

/** -1 / +1 según la última navegación; 0 = recién abierta desde la miniatura. */
type Direction = -1 | 0 | 1;

export function Gallery({ images }: { images: GalleryImage[] }) {
  const [view, setView] = useState<{ index: number; direction: Direction } | null>(null);
  const activeIndex = view?.index ?? null;
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const canNavigate = images.length > 1;

  const close = useCallback(() => {
    // La miniatura de la foto actual sigue montada: devolverle el foco antes de
    // desmontar el diálogo (tras navegar, es la de la foto que se estaba viendo).
    if (activeIndex !== null) thumbnailRefs.current[activeIndex]?.focus();
    setView(null);
  }, [activeIndex]);

  // Circular: desde la última, "siguiente" vuelve a la primera (y viceversa).
  const step = useCallback(
    (direction: -1 | 1) => {
      if (!canNavigate) return;
      setView((v) => (v ? { index: (v.index + direction + images.length) % images.length, direction } : v));
    },
    [canNavigate, images.length],
  );

  useEffect(() => {
    if (activeIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault(); // que no desplace la página de fondo
        step(event.key === "ArrowRight" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, close, step]);

  // Con cantidad impar, la primera foto ocupa el ancho completo y la grilla cierra pareja.
  const featureFirst = images.length % 2 === 1;

  return (
    <section aria-labelledby="gallery-title" className="px-6 py-16">
      <ScrollReveal>
        <RevealItem>
          <h2 id="gallery-title" className="mb-8 text-center font-heading text-3xl text-primary">
            Galería
          </h2>
        </RevealItem>
        <ul className="mx-auto grid max-w-md grid-cols-2 gap-3">
          {images.map((image, index) => {
            const featured = featureFirst && index === 0;
            return (
              <RevealItem as="li" key={image.src} className={featured ? "col-span-2" : undefined}>
                <button
                  type="button"
                  ref={(node) => {
                    thumbnailRefs.current[index] = node;
                  }}
                  onClick={() => setView({ index, direction: 0 })}
                  aria-label={`Ampliar imagen: ${image.alt}`}
                  className={`relative block w-full overflow-hidden rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${featured ? "aspect-[4/3]" : "aspect-square"}`}
                >
                  <motion.div layoutId={layoutIdFor(image)} transition={entranceSpring} className="absolute inset-0">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes={featured ? "(max-width: 448px) 100vw, 448px" : "(max-width: 448px) 50vw, 224px"}
                      className="object-cover"
                    />
                  </motion.div>
                </button>
              </RevealItem>
            );
          })}
        </ul>
      </ScrollReveal>
      <AnimatePresence>
        {view ? (
          <Lightbox
            key="lightbox"
            images={images}
            index={view.index}
            direction={view.direction}
            onPrev={canNavigate ? () => step(-1) : undefined}
            onNext={canNavigate ? () => step(1) : undefined}
            onClose={close}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}

// Tras navegar, la foto nueva toma el lugar de su miniatura sin volar desde la
// grilla (layout instantáneo); al cerrar, vuelve a su miniatura con el spring.
const instantLayout: Transition = { duration: 0 };
const SLIDE_OFFSET = 48; // px; con reduced motion, MotionConfig deja solo el fundido

type LightboxProps = {
  images: GalleryImage[];
  index: number;
  direction: Direction;
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
};

function Lightbox({ images, index, direction, onPrev, onNext, onClose }: LightboxProps) {
  const image = images[index];
  // Mientras corre la salida, el diálogo ya está cerrado: deja de ser dialog y de
  // recibir interacción (el foco ya volvió a la miniatura).
  const isPresent = useIsPresent();
  const pointer = useRef<{ id: number; x: number; y: number; t: number } | null>(null);
  // Soltar tras un swipe dispara un click en el ancestro común: no debe cerrar.
  const swiped = useRef(false);

  const onPointerDown = (event: ReactPointerEvent) => {
    swiped.current = false;
    // Un segundo dedo (pinch) cancela el gesto en curso.
    pointer.current = event.isPrimary
      ? { id: event.pointerId, x: event.clientX, y: event.clientY, t: event.timeStamp }
      : null;
  };
  const onPointerUp = (event: ReactPointerEvent) => {
    const start = pointer.current;
    pointer.current = null;
    if (!start || start.id !== event.pointerId) return;
    const direction = swipeDirection(event.clientX - start.x, event.clientY - start.y, event.timeStamp - start.t);
    if (!direction) return;
    swiped.current = true;
    (direction === "next" ? onNext : onPrev)?.();
  };

  // Foco atrapado: Tab recorre solo los botones del diálogo.
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button"));
    if (buttons.length === 0) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !buttons.includes(active as HTMLElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: backdropFade };
  const navButton =
    "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

  return (
    <div
      role={isPresent ? "dialog" : undefined}
      aria-modal={isPresent ? "true" : undefined}
      aria-label={isPresent ? image.alt : undefined}
      aria-hidden={isPresent ? undefined : "true"}
      inert={!isPresent}
      tabIndex={-1}
      // pan-y + pinch-zoom: el navegador conserva scroll vertical y zoom; el gesto
      // horizontal llega como eventos de puntero.
      className="fixed inset-0 z-50 flex touch-pan-y touch-pinch-zoom items-center justify-center p-4 outline-none"
      onClick={() => {
        if (swiped.current) swiped.current = false;
        else onClose();
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        pointer.current = null;
      }}
      onKeyDown={onKeyDown}
    >
      {/* El fondo y los controles se funden; la imagen viaja desde/hacia la miniatura. */}
      <motion.div aria-hidden="true" className="absolute inset-0 bg-black/90" {...fade} />
      {onNext ? (
        <motion.p
          className="absolute left-4 top-4 z-10 rounded-full bg-white/10 px-3 py-2 text-sm tabular-nums text-white"
          aria-live="polite"
          aria-atomic="true"
          {...fade}
        >
          <span aria-hidden="true">
            {index + 1} / {images.length}
          </span>
          <span className="sr-only">
            Foto {index + 1} de {images.length}
          </span>
        </motion.p>
      ) : null}
      <motion.button
        type="button"
        autoFocus
        onClick={onClose}
        className="absolute right-4 top-4 z-10 min-h-11 rounded-full bg-white/10 px-4 py-2 text-white"
        {...fade}
      >
        Cerrar
      </motion.button>
      <motion.div
        key={image.src}
        layoutId={layoutIdFor(image)}
        transition={direction === 0 ? entranceSpring : instantLayout}
        className="relative h-[80svh] w-full max-w-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <motion.div
          className="absolute inset-0"
          initial={direction === 0 ? false : { opacity: 0, x: direction * SLIDE_OFFSET }}
          animate={{ opacity: 1, x: 0 }}
          transition={photoSlide}
        >
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            draggable={false}
            className="select-none object-contain"
          />
        </motion.div>
      </motion.div>
      {onPrev && onNext ? (
        <>
          <motion.button
            type="button"
            aria-label="Foto anterior"
            onClick={(event) => {
              event.stopPropagation();
              onPrev();
            }}
            className={`${navButton} left-2 sm:left-4`}
            {...fade}
          >
            <Chevron direction="left" />
          </motion.button>
          <motion.button
            type="button"
            aria-label="Foto siguiente"
            onClick={(event) => {
              event.stopPropagation();
              onNext();
            }}
            className={`${navButton} right-2 sm:right-4`}
            {...fade}
          >
            <Chevron direction="right" />
          </motion.button>
        </>
      ) : null}
    </div>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}
