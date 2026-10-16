import type { VenueServices } from "@/domain/venue";
import { ScrollReveal } from "@/components/scroll-reveal/ScrollReveal";

export function Services({ capacity, items }: VenueServices) {
  return (
    <section aria-labelledby="services-title" className="px-6 py-16">
      <ScrollReveal>
        <h2 id="services-title" className="mb-6 text-center font-heading text-3xl text-primary">
          Servicios y capacidad
        </h2>
        {capacity !== undefined ? (
          <p className="mb-6 text-center text-lg">
            Capacidad: <strong>hasta {capacity} personas</strong>
          </p>
        ) : null}
        <ul className="mx-auto flex max-w-md flex-col gap-2">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-3 rounded-lg border border-primary/20 px-4 py-3">
              <span aria-hidden="true" className="text-accent">
                ✦
              </span>
              {item}
            </li>
          ))}
        </ul>
      </ScrollReveal>
    </section>
  );
}
