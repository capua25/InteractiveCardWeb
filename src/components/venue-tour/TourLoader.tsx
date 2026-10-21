"use client";

import type { VenueTheme } from "@/domain/venue";
import { themeToCssVars } from "@/lib/theme";
import { useShouldAnimate } from "@/lib/use-should-animate";

type TourLoaderProps = {
  // Solo hace falta fuera del diálogo (la carga diferida): dentro ya hereda las variables.
  theme?: VenueTheme;
  className?: string;
};

// Mismo loader para la carga diferida del overlay y para la bajada de la escena:
// ocupa el viewport entero y queda centrado, así no hay salto entre uno y otro.
export function TourLoader({ theme, className = "" }: TourLoaderProps) {
  const spins = useShouldAnimate();
  return (
    <div
      data-testid="tour-loader"
      style={theme ? themeToCssVars(theme) : undefined}
      className={`fixed inset-0 flex items-center justify-center bg-neutral-900 text-white/80 ${className}`}
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
