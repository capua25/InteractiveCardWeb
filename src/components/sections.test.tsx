import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "@/components/footer/Footer";
import { Location } from "@/components/location/Location";
import { Services } from "@/components/services/Services";

describe("Location", () => {
  it("embebe el mapa con lazy loading y title, y linkea a Cómo llegar", () => {
    render(
      <Location
        address="Calle Falsa 123"
        mapsUrl="https://maps.example/dir"
        embedUrl="https://maps.example/embed"
      />,
    );
    const map = screen.getByTitle("Mapa de Calle Falsa 123");
    expect(map.tagName).toBe("IFRAME");
    expect(map).toHaveAttribute("loading", "lazy");
    expect(map).toHaveAttribute("src", "https://maps.example/embed");
    expect(screen.getByRole("link", { name: "Cómo llegar" })).toHaveAttribute("href", "https://maps.example/dir");
  });
});

describe("Services", () => {
  it("muestra la capacidad solo si está definida", () => {
    const { rerender } = render(<Services capacity={150} items={["Catering"]} />);
    expect(screen.getByText("hasta 150 personas")).toBeInTheDocument();
    rerender(<Services items={["Catering"]} />);
    expect(screen.queryByText(/Capacidad/)).not.toBeInTheDocument();
    expect(screen.getByText("Catering")).toBeInTheDocument();
  });
});

describe("Footer", () => {
  const base = {
    venueName: "Salón X",
    phone: "+54 9 11 0000-0000",
    whatsappHref: "https://wa.me/5491100000000?text=Hola",
  };

  it("siempre muestra el contacto", () => {
    render(<Footer {...base} />);
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: base.phone })).toHaveAttribute("href", base.whatsappHref);
  });

  it("no muestra redes si socials no tiene datos", () => {
    render(<Footer {...base} socials={{}} />);
    expect(screen.queryByRole("navigation", { name: "Redes sociales" })).not.toBeInTheDocument();
  });

  it("muestra solo las redes cargadas", () => {
    render(<Footer {...base} socials={{ instagram: "https://instagram.com/x" }} />);
    const nav = screen.getByRole("navigation", { name: "Redes sociales" });
    expect(within(nav).getByRole("link", { name: "Instagram" })).toHaveAttribute("href", "https://instagram.com/x");
    expect(within(nav).queryByRole("link", { name: "Facebook" })).not.toBeInTheDocument();
  });
});
