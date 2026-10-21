"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { TourSceneId, VenueTheme } from "@/domain/venue";

// El overlay usa APIs del navegador (WebGL, portal en body): solo cliente. Su chunk
// (y el de three, que llega con loadTourScene) baja recién al tocar el botón.
const TourOverlay = dynamic(() => import("./TourOverlay").then((m) => m.TourOverlay), {
  ssr: false,
  loading: () => (
    <div role="status" className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900 text-white/80">
      Cargando el recorrido…
    </div>
  ),
});

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
      {open ? <TourOverlay scene={scene} venueName={venueName} theme={theme} onClose={close} /> : null}
    </>
  );
}
