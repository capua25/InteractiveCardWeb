import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CardShell } from "@/components/card-shell/CardShell";
import { TourLauncher } from "@/components/venue-tour/TourLauncher";
import { loadTourScene } from "@/tour/registry";
import type { TourModule } from "@/tour/types";
import { hasWebGL } from "@/tour/webgl";

vi.mock("@/tour/registry", () => ({ loadTourScene: vi.fn() }));
vi.mock("@/tour/webgl", () => ({ hasWebGL: vi.fn(() => true) }));

const loadTourSceneMock = vi.mocked(loadTourScene);
const hasWebGLMock = vi.mocked(hasWebGL);

const controller = { setView: vi.fn(), setRoofVisible: vi.fn(), dispose: vi.fn() };
const mount = vi.fn<TourModule["mount"]>(() => controller);

const theme = { primary: "#112233", accent: "#445566", fontHeading: "serif" };
const renderLauncher = () => render(<TourLauncher scene="barbatos" venueName="Barbato's" theme={theme} />);
const launcher = () => screen.getByRole("button", { name: "Recorrer el salón" });

// Ruling 9: mocks y estado global limpios en cada test.
beforeEach(() => {
  vi.restoreAllMocks();
  hasWebGLMock.mockReset().mockReturnValue(true);
  loadTourSceneMock.mockReset().mockResolvedValue({ mount });
  mount.mockReset().mockImplementation(() => controller);
  controller.setView.mockReset();
  controller.setRoofVisible.mockReset();
  controller.dispose.mockReset();
  vi.spyOn(history, "back").mockImplementation(() => {});
  document.body.style.overflow = "";
});

describe("TourLauncher", () => {
  it("muestra Recorrer el salón y no carga la escena antes del toque", () => {
    renderLauncher();
    expect(launcher()).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(loadTourSceneMock).not.toHaveBeenCalled();
  });

  it("al tocar abre el diálogo y enfoca Cerrar", async () => {
    renderLauncher();
    await userEvent.click(launcher());
    expect(await screen.findByRole("dialog", { name: "Recorrido 3D de Barbato's" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus();
  });

  it("Cerrar desmonta el diálogo, libera la escena y devuelve el foco al botón", async () => {
    renderLauncher();
    await userEvent.click(launcher());
    await screen.findByRole("button", { name: "Afuera" });
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(controller.dispose).toHaveBeenCalledTimes(1);
    expect(launcher()).toHaveFocus();
  });

  it("Escape cierra y devuelve el foco al botón", async () => {
    renderLauncher();
    await userEvent.click(launcher());
    await screen.findByRole("button", { name: "Afuera" });
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(controller.dispose).toHaveBeenCalledTimes(1);
    expect(launcher()).toHaveFocus();
  });

  // Review Focus 2
  it("reabrir monta una escena nueva y libera la anterior una sola vez", async () => {
    renderLauncher();
    await userEvent.click(launcher());
    await screen.findByRole("button", { name: "Afuera" });
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    await userEvent.click(launcher());
    await screen.findByRole("button", { name: "Afuera" });
    await waitFor(() => expect(mount).toHaveBeenCalledTimes(2));
    expect(controller.dispose).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId("tour-canvas-host")).toHaveLength(1);
  });

  it("con el sobre abierto, cerrar el visor deja el overflow del body como estaba", async () => {
    render(
      <CardShell envelope venueName="Barbato's" whatsappHref="https://wa.me/1">
        <TourLauncher scene="barbatos" venueName="Barbato's" theme={theme} />
      </CardShell>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Abrir la invitación/ }));
    const before = document.body.style.overflow;
    await userEvent.click(await screen.findByRole("button", { name: "Recorrer el salón" }));
    await userEvent.click(await screen.findByRole("button", { name: "Cerrar" }));
    expect(document.body.style.overflow).toBe(before);
  });
});
