export type VenueTheme = {
  primary: string;
  accent: string;
  /** Valor CSS de font-family, p. ej. "var(--font-playfair), Georgia, serif". */
  fontHeading: string;
};

/** `icon` es un emoji (se renderiza decorativo, con aria-hidden). */
export type EventType = { label: string; icon: string };

export type GalleryImage = { src: string; alt: string };

export type VenueServices = { capacity?: number; items: string[] };

export type VenueLocation = {
  address: string;
  mapsUrl: string;
  embedUrl: string;
};

export type VenueSocials = { instagram?: string; facebook?: string };

/** Escenas 3D disponibles. Cada una es código three.js en src/tour/scenes/<id>/. */
export type TourSceneId = "barbatos";

export type Venue = {
  slug: string;
  name: string;
  tagline: string;
  /** Logo que se muestra en el sobre; si falta, el sobre muestra el nombre. */
  logo?: string;
  theme: VenueTheme;
  envelope: boolean;
  whatsapp: { phone: string; message: string };
  hero: { image: string };
  about?: string;
  eventTypes?: EventType[];
  gallery?: GalleryImage[];
  services?: VenueServices;
  location?: VenueLocation;
  socials?: VenueSocials;
  /** Si existe, el hero muestra "Recorrer el salón" junto al WhatsApp. */
  tour?: { scene: TourSceneId };
  /** ogImage: PNG/JPG 1200×630 (WhatsApp no muestra SVG). */
  seo: { title: string; description: string; ogImage: string };
};
