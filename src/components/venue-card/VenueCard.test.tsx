import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Venue } from "@/domain/venue";
import { VenueCard } from "@/components/venue-card/VenueCard";

const minimalVenue: Venue = {
  slug: "minimo",
  name: "Salón Mínimo",
  tagline: "Solo lo esencial",
  theme: { primary: "#112233", accent: "#445566", fontHeading: "Georgia, serif" },
  envelope: false,
  whatsapp: { phone: "+54 9 11 1234-5678", message: "Hola, ¿tienen fecha?" },
  hero: { image: "/venues/minimo/hero.svg" },
  seo: { title: "Salón Mínimo", description: "Desc", ogImage: "/venues/minimo/og.png" },
};

const fullVenue: Venue = {
  ...minimalVenue,
  slug: "completo",
  name: "Salón Completo",
  about: "Somos un salón familiar.",
  eventTypes: [{ label: "Casamientos", icon: "💍" }],
  gallery: [{ src: "/venues/completo/1.svg", alt: "Salón decorado" }],
  services: { capacity: 120, items: ["Catering"] },
  location: {
    address: "Calle Falsa 123",
    mapsUrl: "https://maps.example/dir",
    embedUrl: "https://maps.example/embed",
  },
  socials: { instagram: "https://instagram.com/x" },
};

const OPTIONAL_TITLES = ["Sobre nosotros", "Tipos de eventos", "Galería", "Servicios y capacidad", "Ubicación"];
const expectedHref = "https://wa.me/5491112345678?text=Hola%2C%20%C2%BFtienen%20fecha%3F";

describe("VenueCard", () => {
  // Review Focus 3
  it("con solo campos obligatorios renderiza hero, CTA y footer, sin secciones opcionales", () => {
    render(<VenueCard venue={minimalVenue} />);
    expect(screen.getByRole("heading", { level: 1, name: "Salón Mínimo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "¿Hacemos tu evento acá?" })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    for (const title of OPTIONAL_TITLES) {
      expect(screen.queryByRole("heading", { name: title })).not.toBeInTheDocument();
    }
    expect(screen.queryByRole("navigation", { name: "Redes sociales" })).not.toBeInTheDocument();
  });

  it("con arrays vacíos tampoco renderiza esas secciones", () => {
    render(<VenueCard venue={{ ...minimalVenue, eventTypes: [], gallery: [], services: { items: [] } }} />);
    for (const title of ["Tipos de eventos", "Galería", "Servicios y capacidad"]) {
      expect(screen.queryByRole("heading", { name: title })).not.toBeInTheDocument();
    }
  });

  it("con todos los datos renderiza todas las secciones", () => {
    render(<VenueCard venue={fullVenue} />);
    for (const title of OPTIONAL_TITLES) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    expect(screen.getByRole("navigation", { name: "Redes sociales" })).toBeInTheDocument();
  });

  it("todos los botones de WhatsApp usan el mismo link con el mensaje pre-armado", () => {
    render(<VenueCard venue={minimalVenue} />);
    const whatsappLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("https://wa.me/"));
    // hero + CTA final + footer + flotante
    expect(whatsappLinks).toHaveLength(4);
    for (const link of whatsappLinks) {
      expect(link).toHaveAttribute("href", expectedHref);
    }
  });

  it("inyecta el theme como variables CSS en el contenedor", () => {
    render(<VenueCard venue={minimalVenue} />);
    const container = screen.getByTestId("venue-card");
    expect(container.style.getPropertyValue("--venue-primary")).toBe("#112233");
    expect(container.style.getPropertyValue("--venue-accent")).toBe("#445566");
    expect(container.style.getPropertyValue("--venue-font-heading")).toBe("Georgia, serif");
  });

  // Sin sobre no hay nada que tape el hero: tiene que salir visible desde el
  // HTML del server (sin JS también), sin entrada animada.
  it("con envelope: false el hero no arranca oculto (sin opacity 0 inline)", () => {
    render(<VenueCard venue={minimalVenue} />);
    const h1 = screen.getByRole("heading", { level: 1, name: "Salón Mínimo" });
    expect(h1.parentElement?.style.opacity).not.toBe("0");
    expect(h1.closest("[style*='opacity: 0']")).toBeNull();
  });

  it("con envelope: false el HTML del server no envuelve el h1 en opacity 0", () => {
    const html = renderToString(<VenueCard venue={minimalVenue} />);
    expect(html).toContain("<h1");
    expect(html).not.toMatch(/opacity:\s*0[;"][^>]*>\s*<h1/);
  });

  it("con sobre: tras tocarlo, CTA del hero y flotante quedan inertes mientras el sobre sale", async () => {
    render(<VenueCard venue={{ ...minimalVenue, envelope: true }} />);
    await userEvent.click(screen.getByRole("button", { name: /Abrir la invitación/ }));
    // El contenedor del contenido ya no es inerte: lo que bloquea es la capa oculta.
    expect(screen.getByTestId("card-content")).not.toHaveAttribute("inert");
    const h1 = screen.getByRole("heading", { level: 1, hidden: true, name: "Salón Mínimo" });
    expect(h1.parentElement?.style.opacity).toBe("0");
    const heroCta = within(h1.closest("header")!).getByRole("link", { hidden: true });
    expect(heroCta.closest("[inert]")).not.toBeNull();
    expect(screen.getByTestId("whatsapp-floating").closest("[inert]")).not.toBeNull();
  });
});
