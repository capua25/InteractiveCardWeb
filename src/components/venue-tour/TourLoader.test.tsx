import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TourLoader } from "@/components/venue-tour/TourLoader";

const reduced = vi.hoisted(() => ({ value: false }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => reduced.value,
}));

afterEach(() => {
  reduced.value = false;
});

describe("TourLoader", () => {
  it("anuncia Cargando el recorrido… con un único status y el ícono oculto", () => {
    render(<TourLoader />);
    const status = screen.getByRole("status");
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(status).toHaveTextContent("Cargando el recorrido…");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(screen.getByTestId("tour-loader-icon")).toHaveAttribute("aria-hidden", "true");
  });

  it("gira el ícono por defecto", async () => {
    render(<TourLoader />);
    expect(await screen.findByTestId("tour-loader-icon")).toHaveClass("animate-spin");
  });

  it("con reduced motion el ícono queda estático", () => {
    reduced.value = true;
    render(<TourLoader />);
    expect(screen.getByTestId("tour-loader-icon")).not.toHaveClass("animate-spin");
  });
});
