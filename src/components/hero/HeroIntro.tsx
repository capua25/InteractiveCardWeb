"use client";

import { useContext, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { revealContainer } from "@/lib/motion";
import { ContentRevealedContext } from "@/components/card-shell/content-revealed-context";

// Escalona nombre, tagline y CTA cuando el sobre termina de salir. No usa
// whileInView: el hero ya está en viewport detrás del sobre y la entrada se perdería.
// Sin sobre (ya revelado al montar) sale visible desde el HTML del server, sin
// entrada: nada lo tapa y tiene que verse aunque no haya JS.
export function HeroIntro({ children, className }: { children: ReactNode; className?: string }) {
  const revealed = useContext(ContentRevealedContext);
  const [revealedOnMount] = useState(revealed);
  return (
    <motion.div
      className={className}
      variants={revealContainer}
      initial={revealedOnMount ? false : "hidden"}
      animate={revealed ? "visible" : "hidden"}
      // Mientras está oculto (opacity 0) el CTA no debe recibir foco ni clicks.
      inert={!revealed}
    >
      {children}
    </motion.div>
  );
}
