"use client";

import { useRef, useState } from "react";
import type { TourSceneId, VenueTheme } from "@/domain/venue";
// Import estático a propósito: con React.lazy un fallo del chunk del overlay rompía la tarjeta
// entera. El overlay pesa pocos KB y no importa three (llega con el import() de loadTourScene).
import { TourOverlay } from "./TourOverlay";

type TourLauncherProps = { scene: TourSceneId; venueName: string; theme: VenueTheme };

export function TourLauncher({ scene, venueName, theme }: TourLauncherProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-white/90 px-6 py-3 text-base font-semibold text-primary shadow-md transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Recorrer el salón
      </button>
      {/* El overlay usa APIs del navegador (WebGL, portal en document.body): no debe renderizarse
          en SSR. Por eso `open` arranca en false y solo se monta tras el toque. */}
      {open ? <TourOverlay scene={scene} venueName={venueName} theme={theme} onClose={close} /> : null}
    </>
  );
}
