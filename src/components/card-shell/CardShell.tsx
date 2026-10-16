"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, MotionConfig } from "motion/react";
import { Envelope } from "@/components/envelope/Envelope";
import { WhatsAppButton } from "@/components/whatsapp-button/WhatsAppButton";

type CardShellProps = {
  envelope: boolean;
  venueName: string;
  logo?: string;
  whatsappHref: string;
  children: ReactNode;
};

// Frontera cliente mínima: solo el estado del sobre y el botón flotante.
// `children` llega renderizado desde el server.
export function CardShell({ envelope, venueName, logo, whatsappHref, children }: CardShellProps) {
  const [opened, setOpened] = useState(!envelope);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {!opened ? (
          <Envelope key="envelope" venueName={venueName} logo={logo} onOpen={() => setOpened(true)} />
        ) : null}
      </AnimatePresence>
      <div aria-hidden={!opened} inert={!opened} data-testid="card-content">
        {children}
      </div>
      {opened ? <WhatsAppButton href={whatsappHref} variant="floating" /> : null}
    </MotionConfig>
  );
}
