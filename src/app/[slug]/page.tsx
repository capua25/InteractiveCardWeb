import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllSlugs, getVenueBySlug } from "@/domain/venue-repository";
import { VenueCard } from "@/components/venue-card/VenueCard";

// Slugs fuera de generateStaticParams → 404 (requiere cacheComponents desactivado).
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const venue = getVenueBySlug(slug);
  if (!venue) return {};

  return {
    title: venue.seo.title,
    description: venue.seo.description,
    openGraph: {
      type: "website",
      locale: "es_AR",
      url: `/${venue.slug}`,
      siteName: venue.name,
      title: venue.seo.title,
      description: venue.seo.description,
      images: [{ url: venue.seo.ogImage, width: 1200, height: 630, alt: venue.name }],
    },
  };
}

export default async function VenuePage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const venue = getVenueBySlug(slug);
  if (!venue) notFound();

  return <VenueCard venue={venue} />;
}
