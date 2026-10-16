import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WhatsAppButton } from "@/components/whatsapp-button/WhatsAppButton";

const href = "https://wa.me/5491100000000?text=Hola";

describe("WhatsAppButton", () => {
  it("renderiza un link a WhatsApp que abre en otra pestaña", () => {
    render(<WhatsAppButton href={href} />);
    const link = screen.getByRole("link", { name: "Consultanos por WhatsApp" });
    expect(link).toHaveAttribute("href", href);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("la variante flotante mantiene el label accesible aunque no muestre texto", () => {
    render(<WhatsAppButton href={href} variant="floating" label="Escribinos" />);
    const link = screen.getByRole("link", { name: "Escribinos" });
    expect(link).toHaveAttribute("data-testid", "whatsapp-floating");
    expect(link).not.toHaveTextContent("Escribinos");
  });
});
