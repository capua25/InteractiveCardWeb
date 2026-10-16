import type { CSSProperties } from "react";
import type { VenueTheme } from "@/domain/venue";

export function themeToCssVars(theme: VenueTheme): CSSProperties {
  return {
    "--venue-primary": theme.primary,
    "--venue-accent": theme.accent,
    "--venue-font-heading": theme.fontHeading,
  } as CSSProperties;
}
