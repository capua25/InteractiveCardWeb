import Image from "next/image";
import { WhatsAppButton } from "@/components/whatsapp-button/WhatsAppButton";

type HeroProps = {
  name: string;
  tagline: string;
  image: string;
  whatsappHref: string;
};

export function Hero({ name, tagline, image, whatsappHref }: HeroProps) {
  return (
    <header className="relative flex min-h-[90svh] items-end overflow-hidden">
      <Image src={image} alt={`Foto principal de ${name}`} fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />
      <div className="relative z-10 flex w-full flex-col items-center gap-4 px-6 pb-16 text-center text-white">
        <h1 className="font-heading text-4xl leading-tight sm:text-5xl">{name}</h1>
        <p className="max-w-md text-lg text-white/90">{tagline}</p>
        <WhatsAppButton href={whatsappHref} />
      </div>
    </header>
  );
}
