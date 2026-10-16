import { ScrollReveal } from "@/components/scroll-reveal/ScrollReveal";
import { WhatsAppButton } from "@/components/whatsapp-button/WhatsAppButton";

export function FinalCta({ whatsappHref }: { whatsappHref: string }) {
  return (
    <section aria-labelledby="cta-title" className="bg-primary px-6 py-20 text-center text-white">
      <ScrollReveal>
        <h2 id="cta-title" className="mb-6 font-heading text-3xl">
          ¿Hacemos tu evento acá?
        </h2>
        <WhatsAppButton href={whatsappHref} label="Consultar disponibilidad" />
      </ScrollReveal>
    </section>
  );
}
