"use client";

import { useContext, type ReactNode } from "react";
import { motion } from "motion/react";
import { revealContainer } from "@/lib/motion";
import { ContentRevealedContext } from "@/components/card-shell/content-revealed-context";

// Escalona nombre, tagline y CTA cuando el contenido queda a la vista (tras abrir
// el sobre, o al montar si no hay sobre). No usa whileInView: el hero ya está en
// viewport detrás del sobre y la entrada se perdería.
export function HeroIntro({ children, className }: { children: ReactNode; className?: string }) {
  const revealed = useContext(ContentRevealedContext);
  return (
    <motion.div
      className={className}
      variants={revealContainer}
      initial="hidden"
      animate={revealed ? "visible" : "hidden"}
    >
      {children}
    </motion.div>
  );
}
