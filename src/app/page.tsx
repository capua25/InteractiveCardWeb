import { redirect } from "next/navigation";
import { getAllSlugs } from "@/domain/venue-repository";

export default function Home() {
  const [firstSlug] = getAllSlugs();
  if (!firstSlug) throw new Error("No hay salones cargados en src/content/venues.ts");
  redirect(`/${firstSlug}`);
}
