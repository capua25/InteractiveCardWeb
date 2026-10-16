import { RevealItem } from "@/components/scroll-reveal/RevealItem";
import { ScrollReveal } from "@/components/scroll-reveal/ScrollReveal";

export function About({ text }: { text: string }) {
  return (
    <section aria-labelledby="about-title" className="px-6 py-16">
      <ScrollReveal>
        <RevealItem>
          <h2 id="about-title" className="mb-4 text-center font-heading text-3xl text-primary">
            Sobre nosotros
          </h2>
        </RevealItem>
        <RevealItem>
          <p className="mx-auto max-w-prose text-center text-lg leading-relaxed">{text}</p>
        </RevealItem>
      </ScrollReveal>
    </section>
  );
}
