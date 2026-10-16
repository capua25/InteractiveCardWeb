import type { EventType } from "@/domain/venue";
import { ScrollReveal } from "@/components/scroll-reveal/ScrollReveal";

export function EventTypes({ items }: { items: EventType[] }) {
  return (
    <section aria-labelledby="event-types-title" className="bg-primary/5 px-6 py-16">
      <ScrollReveal>
        <h2 id="event-types-title" className="mb-8 text-center font-heading text-3xl text-primary">
          Tipos de eventos
        </h2>
        <ul className="mx-auto grid max-w-md grid-cols-2 gap-4">
          {items.map((item) => (
            <li
              key={item.label}
              className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 text-center shadow-sm"
            >
              <span aria-hidden="true" className="text-4xl">
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
            </li>
          ))}
        </ul>
      </ScrollReveal>
    </section>
  );
}
