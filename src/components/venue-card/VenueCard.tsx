import type { Venue } from "@/domain/venue";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { themeToCssVars } from "@/lib/theme";
import { CardShell } from "@/components/card-shell/CardShell";
import { Hero } from "@/components/hero/Hero";
import { About } from "@/components/about/About";
import { EventTypes } from "@/components/event-types/EventTypes";
import { Gallery } from "@/components/gallery/Gallery";
import { Services } from "@/components/services/Services";
import { Location } from "@/components/location/Location";
import { FinalCta } from "@/components/cta/FinalCta";
import { Footer } from "@/components/footer/Footer";

export function VenueCard({ venue }: { venue: Venue }) {
  // Un único link para hero, CTA final, footer y botón flotante.
  const whatsappHref = buildWhatsAppLink(venue.whatsapp.phone, venue.whatsapp.message);

  return (
    <div
      style={themeToCssVars(venue.theme)}
      data-testid="venue-card"
      className="min-h-svh bg-[#fffaf5] text-neutral-800"
    >
      <CardShell envelope={venue.envelope} venueName={venue.name} logo={venue.logo} whatsappHref={whatsappHref}>
        <Hero name={venue.name} tagline={venue.tagline} image={venue.hero.image} whatsappHref={whatsappHref} />
        <main>
          {venue.about ? <About text={venue.about} /> : null}
          {venue.eventTypes?.length ? <EventTypes items={venue.eventTypes} /> : null}
          {venue.gallery?.length ? <Gallery images={venue.gallery} /> : null}
          {venue.services?.items.length ? <Services {...venue.services} /> : null}
          {venue.location ? <Location {...venue.location} /> : null}
          <FinalCta whatsappHref={whatsappHref} />
        </main>
        <Footer
          venueName={venue.name}
          phone={venue.whatsapp.phone}
          whatsappHref={whatsappHref}
          address={venue.location?.address}
          socials={venue.socials}
        />
      </CardShell>
    </div>
  );
}
