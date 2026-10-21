import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TourLauncher } from "@/components/venue-tour/TourLauncher";
import { loadTourScene } from "@/tour/registry";

// La escena (y three) nunca termina de bajar: el overlay queda en su estado de carga.
vi.mock("@/tour/registry", () => ({ loadTourScene: vi.fn(() => new Promise(() => {})) }));
vi.mock("@/tour/webgl", () => ({ hasWebGL: () => true }));

const theme = { primary: "#112233", accent: "#445566", fontHeading: "serif" };

beforeEach(() => {
  vi.spyOn(history, "back").mockImplementation(() => {});
  vi.mocked(loadTourScene).mockClear();
});

describe("TourLauncher mientras baja la escena", () => {
  it("el diálogo aparece en el mismo toque, en body, con el loader y las variables del tema", async () => {
    const { container } = render(<TourLauncher scene="barbatos" venueName="Barbato's" theme={theme} />);
    await userEvent.click(screen.getByRole("button", { name: "Recorrer el salón" }));
    // Import estático: no hay chunk del overlay que esperar (ni que pueda fallar).
    const dialog = screen.getByRole("dialog", { name: "Recorrido 3D de Barbato's" });
    expect(container).not.toContainElement(dialog);
    expect(document.body).toContainElement(dialog);
    expect(dialog.style.getPropertyValue("--venue-accent")).toBe("#445566");
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Cargando el recorrido…");
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(dialog).toContainElement(screen.getByTestId("tour-loader"));
    expect(loadTourScene).toHaveBeenCalledWith("barbatos");
  });

  it("durante la carga Cerrar y Escape cierran y devuelven el foco al botón", async () => {
    render(<TourLauncher scene="barbatos" venueName="Barbato's" theme={theme} />);
    const launcher = screen.getByRole("button", { name: "Recorrer el salón" });
    await userEvent.click(launcher);
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(launcher).toHaveFocus();

    await userEvent.click(launcher);
    expect(screen.getByRole("status")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(launcher).toHaveFocus();
  });
});
