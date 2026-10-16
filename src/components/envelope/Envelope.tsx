"use client";

import Image from "next/image";
import { motion } from "motion/react";
import {
  entranceSpring,
  envelopeCollapse,
  envelopeIdle,
  envelopeOpening,
  flapSpring,
  hintPulse,
  uiSpring,
} from "@/lib/motion";
import { useShouldAnimate } from "@/lib/use-should-animate";

type EnvelopeProps = {
  venueName: string;
  logo?: string;
  onOpen: () => void;
};

const PAPER = "bg-[#f6e7d8]";

// Al desmontarse dentro de AnimatePresence corre la secuencia de apertura (~1.2 s):
// la solapa se pliega, la carta asoma y el sobre se achica mientras el fondo se desvanece.
export function Envelope({ venueName, logo, onOpen }: EnvelopeProps) {
  // Loop idle y pulso: MotionConfig reducedMotion="user" no frena loops infinitos.
  const shouldAnimate = useShouldAnimate();
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary p-6"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: envelopeCollapse }}
    >
      <motion.button
        type="button"
        onClick={onOpen}
        aria-label={`Abrir la invitación de ${venueName}`}
        className="relative aspect-[4/3] w-full max-w-sm rounded-lg text-primary focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-accent"
        whileTap={{ scale: 0.97, transition: uiSpring }}
        exit={{ scale: envelopeOpening.collapseScale, transition: envelopeCollapse }}
      >
        {/* El botón (área de toque) queda quieto y flota solo la capa visual: un
            blanco en movimiento perpetuo es difícil de tocar y nunca está "estable". */}
        <motion.span
          data-testid="envelope-body"
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 [perspective:800px]"
          animate={shouldAnimate ? envelopeIdle.animate : undefined}
          transition={shouldAnimate ? envelopeIdle.transition : undefined}
          exit={{ y: 0, rotate: 0, transition: envelopeCollapse }}
        >
          {/* Dorso del sobre */}
          <span aria-hidden="true" className={`absolute inset-0 rounded-lg shadow-2xl ${PAPER}`} />
          {/* Carta: oculta detrás del frente hasta que asoma al abrir */}
          <motion.span
            aria-hidden="true"
            className="absolute inset-x-6 top-4 h-3/4 rounded-md bg-white shadow-md"
            initial={{ opacity: 0, y: 0 }}
            exit={{
              opacity: 1,
              y: envelopeOpening.letterRise,
              transition: { ...entranceSpring, delay: envelopeOpening.letterDelay },
            }}
          />
          {/* Frente: tapa la mitad inferior de la carta */}
          <span aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-3/5 rounded-b-lg ${PAPER}`} />
          {/* Solapa: al pasar los 90° muestra su dorso oculto y desaparece */}
          <motion.span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1/2 origin-top rounded-t-lg bg-accent [backface-visibility:hidden] [clip-path:polygon(0_0,100%_0,50%_100%)]"
            exit={{ rotateX: 180, transition: flapSpring }}
          />
          {logo ? (
            <Image
              src={logo}
              alt={`Logo de ${venueName}`}
              width={96}
              height={96}
              className="relative z-10 rounded-full"
              priority
            />
          ) : (
            <span className="relative z-10 font-heading text-2xl">{venueName}</span>
          )}
          <motion.span
            className="relative z-10 text-sm uppercase tracking-widest"
            animate={shouldAnimate ? hintPulse.animate : undefined}
            transition={shouldAnimate ? hintPulse.transition : undefined}
            exit={{ opacity: 0, transition: { duration: envelopeOpening.hintFade } }}
          >
            tocá para abrir
          </motion.span>
        </motion.span>
      </motion.button>
    </motion.div>
  );
}
