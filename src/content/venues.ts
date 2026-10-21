import type { Venue } from "@/domain/venue";

// ⚠️ PLACEHOLDER: todos los datos de este archivo son de ejemplo.
// Reemplazarlos por los datos reales del salón (nombre, textos, fotos, logo,
// WhatsApp, dirección, redes y colores) antes de publicar.
export const venues: Venue[] = [
  {
    // Portada de la demo: el primer salón es al que redirige "/".
    slug: "barbatos",
    name: "Barbato's",
    tagline: "Salón y parque para tus eventos (PLACEHOLDER)",
    // PLACEHOLDER: colores provisorios hasta tener la identidad real del salón.
    theme: {
      primary: "#3b4f66",
      accent: "#c06a55",
      fontHeading: "var(--font-playfair), Georgia, serif",
    },
    envelope: true,
    whatsapp: {
      phone: "+598 99 000 002", // PLACEHOLDER
      message: "¡Hola! Vi la tarjeta de Barbato's y quiero consultar por un evento (PLACEHOLDER)",
    },
    hero: { image: "/venues/barbatos/hero.jpg" },
    about:
      "Un salón con galería y parque para celebrar al aire libre o bajo techo, con hogar a leña para las noches frías. (PLACEHOLDER)",
    gallery: [
      { src: "/venues/barbatos/gallery-1.jpg", alt: "Interior del salón con mesas redondas" },
      { src: "/venues/barbatos/gallery-2.jpg", alt: "Interior del salón mirando hacia el hogar" },
      { src: "/venues/barbatos/gallery-3.jpg", alt: "Vista panorámica del interior del salón" },
      { src: "/venues/barbatos/gallery-4.jpg", alt: "Galería trasera y parque" },
      { src: "/venues/barbatos/gallery-5.jpg", alt: "Frente del salón de noche" },
    ],
    location: {
      address: "Dirección a confirmar, Uruguay (PLACEHOLDER)",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Montevideo+Uruguay",
      embedUrl: "https://www.google.com/maps?q=Montevideo+Uruguay&output=embed",
    },
    tour: { scene: "barbatos" },
    seo: {
      title: "Barbato's — Salón de eventos (PLACEHOLDER)",
      description: "Recorré Barbato's en 3D y consultá por tu evento. (PLACEHOLDER)",
      ogImage: "/venues/barbatos/og.png",
    },
  },
  {
    slug: "salon-ejemplo",
    name: "Salón Ejemplo (PLACEHOLDER)",
    tagline: "Tu evento, como lo soñaste (PLACEHOLDER)",
    logo: "/venues/salon-ejemplo/logo.svg",
    theme: {
      primary: "#7a1f3d",
      accent: "#d4a373",
      fontHeading: "var(--font-playfair), Georgia, serif",
    },
    envelope: true,
    whatsapp: {
      phone: "+54 9 11 0000-0000",
      message: "¡Hola! Vi la tarjeta del salón y quiero consultar por un evento 🎉",
    },
    hero: { image: "/venues/salon-ejemplo/hero.svg" },
    about:
      "PLACEHOLDER — Somos un salón familiar con más de 20 años organizando cumpleaños, casamientos y eventos corporativos.",
    eventTypes: [
      { label: "Casamientos", icon: "💍" },
      { label: "Cumpleaños de 15", icon: "👑" },
      { label: "Infantiles", icon: "🎈" },
      { label: "Corporativos", icon: "💼" },
    ],
    gallery: [
      { src: "/venues/salon-ejemplo/gallery-1.svg", alt: "Salón principal decorado (placeholder)" },
      { src: "/venues/salon-ejemplo/gallery-2.svg", alt: "Mesa de dulces (placeholder)" },
      { src: "/venues/salon-ejemplo/gallery-3.svg", alt: "Pista de baile (placeholder)" },
    ],
    services: {
      capacity: 200,
      items: ["Catering propio", "DJ e iluminación", "Ambientación", "Estacionamiento"],
    },
    location: {
      address: "Av. Siempreviva 742, Buenos Aires (PLACEHOLDER)",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Obelisco+Buenos+Aires",
      embedUrl: "https://www.google.com/maps?q=Obelisco+Buenos+Aires&output=embed",
    },
    socials: {
      instagram: "https://www.instagram.com/",
      facebook: "https://www.facebook.com/",
    },
    seo: {
      title: "Salón Ejemplo — Eventos (PLACEHOLDER)",
      description: "Consultá por tu evento en Salón Ejemplo. (PLACEHOLDER)",
      ogImage: "/venues/salon-ejemplo/og.png",
    },
  },
  {
    // PLACEHOLDER: salón mínimo, solo campos obligatorios y sin sobre.
    slug: "salon-minimo",
    name: "Salón Mínimo (PLACEHOLDER)",
    tagline: "Solo lo esencial (PLACEHOLDER)",
    theme: {
      primary: "#1d3557",
      accent: "#e9c46a",
      fontHeading: "Georgia, serif",
    },
    envelope: false,
    whatsapp: { phone: "5491100000001", message: "Hola, quiero consultar por una fecha" },
    hero: { image: "/venues/salon-minimo/hero.svg" },
    seo: {
      title: "Salón Mínimo (PLACEHOLDER)",
      description: "Salón de ejemplo con solo los datos obligatorios. (PLACEHOLDER)",
      ogImage: "/venues/salon-minimo/og.png",
    },
  },
];
