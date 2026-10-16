import type { VenueLocation } from "@/domain/venue";
import { ScrollReveal } from "@/components/scroll-reveal/ScrollReveal";

export function Location({ address, mapsUrl, embedUrl }: VenueLocation) {
  return (
    <section aria-labelledby="location-title" className="bg-primary/5 px-6 py-16">
      <ScrollReveal>
        <h2 id="location-title" className="mb-4 text-center font-heading text-3xl text-primary">
          Ubicación
        </h2>
        <p className="mb-6 text-center text-lg">{address}</p>
        <iframe
          src={embedUrl}
          title={`Mapa de ${address}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="mx-auto mb-6 aspect-[4/3] w-full max-w-md rounded-xl border-0"
        />
        <div className="text-center">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-full border-2 border-primary px-6 py-3 font-semibold text-primary"
          >
            Cómo llegar
          </a>
        </div>
      </ScrollReveal>
    </section>
  );
}
