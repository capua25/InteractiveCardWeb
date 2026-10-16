import { ScrollReveal } from "@/components/scroll-reveal/ScrollReveal";

export function About({ text }: { text: string }) {
  return (
    <section aria-labelledby="about-title" className="px-6 py-16">
      <ScrollReveal>
        <h2 id="about-title" className="mb-4 text-center font-heading text-3xl text-primary">
          Sobre nosotros
        </h2>
        <p className="mx-auto max-w-prose text-center text-lg leading-relaxed">{text}</p>
      </ScrollReveal>
    </section>
  );
}
