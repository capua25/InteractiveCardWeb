"use client";

import { motion } from "motion/react";
import { attentionRing, floatingEnter } from "@/lib/motion";
import { useShouldAnimate } from "@/lib/use-should-animate";
import { WhatsAppButton } from "@/components/whatsapp-button/WhatsAppButton";

type FloatingWhatsAppProps = {
  href: string;
  // Entra (y dispara el anillo una sola vez) cuando el contenido queda a la vista.
  revealed: boolean;
};

// Capa cliente del botón flotante: WhatsAppButton sigue siendo server-compatible.
export function FloatingWhatsApp({ href, revealed }: FloatingWhatsAppProps) {
  const shouldAnimate = useShouldAnimate();
  return (
    <motion.div
      className="fixed bottom-5 right-5 z-40"
      variants={floatingEnter}
      initial="hidden"
      animate={revealed ? "visible" : "hidden"}
    >
      {shouldAnimate ? (
        <motion.span
          aria-hidden="true"
          data-testid="whatsapp-ring"
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-[#25d366]"
          variants={attentionRing}
        />
      ) : null}
      <WhatsAppButton href={href} variant="floating" />
    </motion.div>
  );
}
