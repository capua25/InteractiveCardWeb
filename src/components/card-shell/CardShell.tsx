"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const contentRef = useRef<HTMLDivElement>(null);
  const focusOnOpen = useRef(false);

  // El botón enfocado del sobre se desmonta al abrir: devolvemos el foco al
  // contenido, pero solo si el usuario abrió el sobre (no en la carga inicial).
  useEffect(() => {
    if (opened && focusOnOpen.current) {
      focusOnOpen.current = false;
      contentRef.current?.focus();
    }
  }, [opened]);

  // `inert` bloquea la interacción pero no el scroll: mientras el sobre está
  // cerrado fijamos el overflow del body y lo restauramos al abrir/desmontar.
  useEffect(() => {
    if (opened) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [opened]);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {!opened ? (
          <Envelope key="envelope" venueName={venueName} logo={logo} onOpen={() => {
              focusOnOpen.current = true;
              setOpened(true);
            }} />
        ) : null}
      </AnimatePresence>
      <div
        ref={contentRef}
        tabIndex={-1}
        className="outline-none"
        aria-hidden={!opened}
        inert={!opened}
        data-testid="card-content"
      >
        {children}
      </div>
      {opened ? <WhatsAppButton href={whatsappHref} variant="floating" /> : null}
    </MotionConfig>
  );
}
