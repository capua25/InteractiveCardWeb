import { describe, expect, it } from "vitest";
import type { Venue } from "@/domain/venue";
import {
  createVenueRepository,
  getAllSlugs,
  getVenueBySlug,
} from "@/domain/venue-repository";

const baseVenue: Venue = {
  slug: "uno",
  name: "Salón Uno",
  tagline: "Eslogan",
  theme: { primary: "#000000", accent: "#ffffff", fontHeading: "serif" },
  envelope: true,
  whatsapp: { phone: "5491100000000", message: "Hola" },
  hero: { image: "/venues/uno/hero.svg" },
  seo: { title: "Salón Uno", description: "Desc", ogImage: "/venues/uno/og.png" },
};

describe("createVenueRepository", () => {
  const repo = createVenueRepository([baseVenue, { ...baseVenue, slug: "dos", name: "Salón Dos" }]);

  it("devuelve el salón cuando el slug existe", () => {
    expect(repo.getVenueBySlug("dos")?.name).toBe("Salón Dos");
  });

  it("devuelve undefined cuando el slug no existe", () => {
    expect(repo.getVenueBySlug("no-existe")).toBeUndefined();
  });

  it("lista todos los slugs en orden", () => {
    expect(repo.getAllSlugs()).toEqual(["uno", "dos"]);
  });
});

describe("repositorio con el contenido real", () => {
  it("Barbato's es la portada y los ejemplos siguen", () => {
    expect(getAllSlugs()).toEqual(["barbatos", "salon-ejemplo", "salon-minimo"]);
    const b = getVenueBySlug("barbatos")!;
    expect(b).toMatchObject({ name: "Barbato's", envelope: true, tour: { scene: "barbatos" } });
    expect(b.logo).toBeUndefined();
    expect(getVenueBySlug("salon-ejemplo")?.envelope).toBe(true);
    expect(getVenueBySlug("salon-minimo")?.envelope).toBe(false);
    expect(getVenueBySlug("salon-ejemplo")?.tour).toBeUndefined();
    expect(getVenueBySlug("salon-minimo")?.tour).toBeUndefined();
  });

  it("no repite slugs", () => {
    const slugs = getAllSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
