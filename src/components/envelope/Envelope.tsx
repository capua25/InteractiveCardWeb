"use client";

import Image from "next/image";
import { motion } from "motion/react";

type EnvelopeProps = {
  venueName: string;
  logo?: string;
  onOpen: () => void;
};

export function Envelope({ venueName, logo, onOpen }: EnvelopeProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary p-6"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5, delay: 0.4 } }}
    >
      <motion.button
        type="button"
        onClick={onOpen}
        aria-label={`Abrir la invitación de ${venueName}`}
        className="relative flex aspect-[4/3] w-full max-w-sm flex-col items-center justify-center gap-4 overflow-hidden rounded-lg bg-[#f6e7d8] text-primary shadow-2xl [perspective:800px] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-accent"
        whileTap={{ scale: 0.97 }}
        exit={{ scale: 1.08, transition: { duration: 0.6 } }}
      >
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1/2 origin-top bg-accent [clip-path:polygon(0_0,100%_0,50%_100%)]"
          exit={{ rotateX: 180, transition: { duration: 0.4 } }}
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
        <span className="relative z-10 text-sm uppercase tracking-widest">tocá para abrir</span>
      </motion.button>
    </motion.div>
  );
}
