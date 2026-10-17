import { WhatsAppButton } from "@/components/whatsapp-button/WhatsAppButton";
import { RevealItem } from "@/components/scroll-reveal/RevealItem";
import { HeroIntro } from "@/components/hero/HeroIntro";
import { ParallaxImage } from "@/components/hero/ParallaxImage";

type HeroProps = {
  name: string;
  tagline: string;
  image: string;
  whatsappHref: string;
};

export function Hero({ name, tagline, image, whatsappHref }: HeroProps) {
  return (
    <header className="relative flex min-h-[90svh] items-end overflow-hidden">
      <ParallaxImage src={image} alt={`Foto principal de ${name}`} />
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />
      <HeroIntro className="relative z-10 flex w-full flex-col items-center gap-4 px-6 pb-16 text-center text-white">
        <RevealItem>
          <h1 className="font-heading text-4xl leading-tight sm:text-5xl">{name}</h1>
        </RevealItem>
        <RevealItem>
          <p className="max-w-md text-lg text-white/90">{tagline}</p>
        </RevealItem>
        <RevealItem>
          <WhatsAppButton href={whatsappHref} />
        </RevealItem>
      </HeroIntro>
    </header>
  );
}
