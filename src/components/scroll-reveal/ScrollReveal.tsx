"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { revealContainer, revealViewport } from "@/lib/motion";

// Contenedor: al entrar en viewport escalona a sus RevealItem (en cualquier nivel).
export function ScrollReveal({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={revealContainer} initial="hidden" whileInView="visible" viewport={revealViewport}>
      {children}
    </motion.div>
  );
}
