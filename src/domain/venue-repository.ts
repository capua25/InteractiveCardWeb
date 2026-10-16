import { venues } from "@/content/venues";
import type { Venue } from "@/domain/venue";

export type VenueRepository = {
  getVenueBySlug: (slug: string) => Venue | undefined;
  getAllSlugs: () => string[];
};

// Único punto que sabe de dónde vienen los datos. En la fase con base de datos
// se reemplaza la fuente sin tocar páginas ni componentes.
export function createVenueRepository(source: readonly Venue[]): VenueRepository {
  return {
    getVenueBySlug: (slug) => source.find((venue) => venue.slug === slug),
    getAllSlugs: () => source.map((venue) => venue.slug),
  };
}

const repository = createVenueRepository(venues);

export const getVenueBySlug = repository.getVenueBySlug;
export const getAllSlugs = repository.getAllSlugs;
