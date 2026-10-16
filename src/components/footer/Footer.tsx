import type { VenueSocials } from "@/domain/venue";

type FooterProps = {
  venueName: string;
  phone: string;
  whatsappHref: string;
  address?: string;
  socials?: VenueSocials;
};

export function Footer({ venueName, phone, whatsappHref, address, socials }: FooterProps) {
  const socialLinks = [
    { name: "Instagram", href: socials?.instagram },
    { name: "Facebook", href: socials?.facebook },
  ].filter((link): link is { name: string; href: string } => Boolean(link.href));

  return (
    <footer className="bg-neutral-900 px-6 pb-28 pt-12 text-center text-sm text-white/80">
      <p className="mb-2 font-heading text-lg text-white">{venueName}</p>
      <p className="mb-1">
        WhatsApp:{" "}
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="underline">
          {phone}
        </a>
      </p>
      {address ? <p className="mb-1">{address}</p> : null}
      {socialLinks.length > 0 ? (
        <nav aria-label="Redes sociales" className="mt-4">
          <ul className="flex justify-center gap-4">
            {socialLinks.map((link) => (
              <li key={link.name}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.name}
                  className="underline"
                >
                  {link.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </footer>
  );
}
