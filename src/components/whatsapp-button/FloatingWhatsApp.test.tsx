import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FloatingWhatsApp } from "@/components/whatsapp-button/FloatingWhatsApp";

const reduced = vi.hoisted(() => ({ value: false }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => reduced.value,
}));

const href = "https://wa.me/5491100000000?text=Hola";

describe("FloatingWhatsApp", () => {
  afterEach(() => {
    reduced.value = false;
  });

  it("renderiza el botón flotante con el link", () => {
    render(<FloatingWhatsApp href={href} revealed />);
    expect(screen.getByTestId("whatsapp-floating")).toHaveAttribute("href", href);
  });

  it("sin reduced motion renderiza el anillo de atención (decorativo)", () => {
    render(<FloatingWhatsApp href={href} revealed />);
    expect(screen.getByTestId("whatsapp-ring")).toHaveAttribute("aria-hidden", "true");
  });

  it("con reduced motion no renderiza el anillo", () => {
    reduced.value = true;
    render(<FloatingWhatsApp href={href} revealed />);
    expect(screen.getByTestId("whatsapp-floating")).toBeInTheDocument();
    expect(screen.queryByTestId("whatsapp-ring")).not.toBeInTheDocument();
  });

  it("hasta que el contenido se revela queda inerte (sin foco ni clicks a opacity 0)", () => {
    const { rerender } = render(<FloatingWhatsApp href={href} revealed={false} />);
    expect(screen.getByTestId("whatsapp-floating").closest("[inert]")).not.toBeNull();
    rerender(<FloatingWhatsApp href={href} revealed />);
    expect(screen.getByTestId("whatsapp-floating").closest("[inert]")).toBeNull();
  });
});
