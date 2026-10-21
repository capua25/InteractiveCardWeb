"use client";

import { useShouldAnimate } from "@/lib/use-should-animate";

// Loader de la bajada de la escena (y de three), dentro del diálogo: hereda las variables del
// tema y ocupa el viewport entero, centrado, debajo de la barra con Cerrar.
export function TourLoader() {
  const spins = useShouldAnimate();
  return (
    <div
      data-testid="tour-loader"
      className="fixed inset-0 flex items-center justify-center bg-neutral-900 text-white/80"
    >
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-4">
        <svg
          data-testid="tour-loader-icon"
          aria-hidden="true"
          viewBox="0 0 48 48"
          className={`size-12 ${spins ? "animate-spin" : ""}`}
          fill="none"
          strokeWidth="4"
        >
          <circle cx="24" cy="24" r="20" stroke="currentColor" opacity="0.2" />
          <path d="M44 24a20 20 0 0 0-20-20" stroke="var(--venue-accent, #ffffff)" strokeLinecap="round" />
        </svg>
        <p>Cargando el recorrido…</p>
      </div>
    </div>
  );
}
