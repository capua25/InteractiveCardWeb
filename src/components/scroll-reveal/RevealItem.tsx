"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cardHover, cardTap, revealItem } from "@/lib/motion";

type RevealItemProps = {
  children: ReactNode;
  as?: "div" | "li";
  className?: string;
  // Tarjetas: se elevan al hover y se hunden al tap.
  lift?: boolean;
};

// Hijo de ScrollReveal (u otro contenedor con las variants de reveal): hereda
// "hidden"/"visible" del padre y entra con el spring de entrada.
export function RevealItem({ children, as = "div", className, lift = false }: RevealItemProps) {
  const Component = as === "li" ? motion.li : motion.div;
  return (
    <Component
      variants={revealItem}
      className={className}
      whileHover={lift ? cardHover : undefined}
      whileTap={lift ? cardTap : undefined}
    >
      {children}
    </Component>
  );
}
