import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TourLauncher } from "@/components/venue-tour/TourLauncher";

// El módulo del overlay nunca termina de cargar: se ve el fallback de la carga diferida.
vi.mock("@/components/venue-tour/TourOverlay", () => new Promise(() => {}));

const theme = { primary: "#112233", accent: "#445566", fontHeading: "serif" };

describe("TourLauncher mientras baja el overlay", () => {
  it("muestra TourLoader en un portal en body, fuera del contenedor, con las variables del tema", async () => {
    const { container } = render(<TourLauncher scene="barbatos" venueName="Barbato's" theme={theme} />);
    await userEvent.click(screen.getByRole("button", { name: "Recorrer el salón" }));
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Cargando el recorrido…");
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(container).not.toContainElement(status);
    expect(document.body).toContainElement(status);
    const root = screen.getByTestId("tour-loader");
    expect(root.style.getPropertyValue("--venue-accent")).toBe("#445566");
  });
});
