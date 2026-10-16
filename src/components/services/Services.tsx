import type { VenueServices } from "@/domain/venue";
import { RevealItem } from "@/components/scroll-reveal/RevealItem";
import { ScrollReveal } from "@/components/scroll-reveal/ScrollReveal";

export function Services({ capacity, items }: VenueServices) {
  return (
    <section aria-labelledby="services-title" className="px-6 py-16">
      <ScrollReveal>
        <RevealItem>
          <h2 id="services-title" className="mb-6 text-center font-heading text-3xl text-primary">
            Servicios y capacidad
          </h2>
        </RevealItem>
        {capacity !== undefined ? (
          <RevealItem>
            <p className="mb-6 text-center text-lg">
              Capacidad: <strong>hasta {capacity} personas</strong>
            </p>
          </RevealItem>
        ) : null}
        <ul className="mx-auto flex max-w-md flex-col gap-2">
          {items.map((item) => (
            <RevealItem
              as="li"
              lift
              key={item}
              className="flex items-center gap-3 rounded-lg border border-primary/20 px-4 py-3 transition-shadow hover:shadow-md"
            >
              <span aria-hidden="true" className="text-accent">
                ✦
              </span>
              {item}
            </RevealItem>
          ))}
        </ul>
      </ScrollReveal>
    </section>
  );
}
