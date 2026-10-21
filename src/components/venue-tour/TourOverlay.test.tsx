import { StrictMode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { TourOverlay } from "@/components/venue-tour/TourOverlay";
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
const renderOverlay = (onClose = vi.fn()) =>
  render(<TourOverlay scene="barbatos" venueName="Barbato's" theme={theme} onClose={onClose} />);

// Ruling 9: cada test arranca con mocks limpios y `history.back` stubbeado, para que
// un `mockReturnValue(false)` o un `popstate` de jsdom no contaminen al siguiente.
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

describe("TourOverlay", () => {
  it("abre como diálogo modal con label y enfoca Cerrar", () => {
    renderOverlay();
    const dialog = screen.getByRole("dialog", { name: "Recorrido 3D de Barbato's" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus();
  });

  it("la raíz del portal es hija de body y lleva las variables de tema", () => {
    renderOverlay();
    const root = screen.getByRole("dialog");
    expect(root.parentElement).toBe(document.body);
    expect(root.style.getPropertyValue("--venue-primary")).toBe("#112233");
  });

  it("muestra Cargando mientras baja la escena y la ayuda de gestos", () => {
    loadTourSceneMock.mockReturnValue(new Promise(() => {}));
    renderOverlay();
    expect(screen.getByRole("status")).toHaveTextContent("Cargando el recorrido…");
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByTestId("tour-loader")).toBeInTheDocument();
    expect(screen.getByText("Girar: arrastrá · Zoom: pellizcá · Mover: dos dedos")).toBeInTheDocument();
    // Ruling 14: sin escena montada no hay cámara que mover.
    expect(screen.queryByRole("button", { name: "Afuera" })).not.toBeInTheDocument();
  });

  it("monta la escena dentro del diálogo y muestra los controles", async () => {
    renderOverlay();
    await screen.findByRole("button", { name: "Afuera" });
    const host = screen.getByTestId("tour-canvas-host");
    expect(mount).toHaveBeenCalledWith(host, expect.objectContaining({ onContextLost: expect.any(Function) }));
    expect(host).toHaveAttribute("aria-hidden", "true");
    expect(host.style.touchAction).toBe("none");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("los botones siguen el orden Afuera, Adentro, Sin techo, Cerrar", async () => {
    renderOverlay();
    await screen.findByRole("button", { name: "Afuera" });
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Afuera", "Adentro", "Sin techo", "Cerrar"]);
  });

  it("Afuera y Adentro llaman a setView y aria-pressed sigue la vista activa", async () => {
    renderOverlay();
    const out = await screen.findByRole("button", { name: "Afuera" });
    const inside = screen.getByRole("button", { name: "Adentro" });
    expect(out).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(inside);
    expect(controller.setView).toHaveBeenLastCalledWith("in");
    expect(inside).toHaveAttribute("aria-pressed", "true");
    expect(out).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(out);
    expect(controller.setView).toHaveBeenLastCalledWith("out");
    expect(out).toHaveAttribute("aria-pressed", "true");
  });

  it("Sin techo alterna setRoofVisible, aria-pressed y el texto", async () => {
    renderOverlay();
    await userEvent.click(await screen.findByRole("button", { name: "Sin techo" }));
    expect(controller.setRoofVisible).toHaveBeenLastCalledWith(false);
    const withRoof = screen.getByRole("button", { name: "Con techo" });
    expect(withRoof).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(withRoof);
    expect(controller.setRoofVisible).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("button", { name: "Sin techo" })).toHaveAttribute("aria-pressed", "false");
  });

  it("Cerrar llama a onClose", async () => {
    const onClose = vi.fn();
    renderOverlay(onClose);
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Tab y Shift+Tab no salen del diálogo", async () => {
    renderOverlay();
    const out = await screen.findByRole("button", { name: "Afuera" });
    const close = screen.getByRole("button", { name: "Cerrar" });
    close.focus();
    await userEvent.tab();
    expect(out).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(close).toHaveFocus();
  });

  it("Tab con un solo botón (cargando) deja el foco en Cerrar", async () => {
    loadTourSceneMock.mockReturnValue(new Promise(() => {}));
    renderOverlay();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus();
  });

  // Tocar el canvas manda el foco a body: la trampa tiene que atraparlo igual.
  // Botones de la página alrededor del portal: sin la trampa, Tab desde body iría a ellos.
  const renderWithPage = () => {
    const before = document.createElement("button");
    before.textContent = "Antes";
    document.body.prepend(before);
    const utils = renderOverlay();
    const after = document.createElement("button");
    after.textContent = "Después";
    document.body.append(after);
    return { ...utils, cleanupPage: () => (before.remove(), after.remove()) };
  };

  it("Tab con el foco en body vuelve al primer botón del diálogo", async () => {
    const { cleanupPage } = renderWithPage();
    onTestFinished(cleanupPage);
    const out = await screen.findByRole("button", { name: "Afuera" });
    (document.activeElement as HTMLElement).blur();
    expect(document.body).toHaveFocus();
    await userEvent.tab();
    expect(out).toHaveFocus();
  });

  it("Shift+Tab con el foco en body va al último botón del diálogo", async () => {
    const { cleanupPage } = renderWithPage();
    onTestFinished(cleanupPage);
    await screen.findByRole("button", { name: "Afuera" });
    (document.activeElement as HTMLElement).blur();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus();
  });

  it("si el contexto se pierde con el foco en un control que desaparece, el foco va a Cerrar", async () => {
    renderOverlay();
    const inside = await screen.findByRole("button", { name: "Adentro" });
    inside.focus();
    act(() => mount.mock.calls[0][1].onContextLost());
    expect(inside).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus();
  });

  it("si la carga falla con el foco fuera del diálogo, el foco va a Cerrar", async () => {
    loadTourSceneMock.mockRejectedValueOnce(new Error("chunk"));
    renderOverlay();
    (document.activeElement as HTMLElement).blur();
    await screen.findByRole("button", { name: "Reintentar" });
    // El foco pasa en un efecto pasivo: puede correr después de que aparezca Reintentar.
    await waitFor(() => expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus());
  });

  it("Escape llama a onClose", async () => {
    const onClose = vi.fn();
    renderOverlay(onClose);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("popstate (atrás de Android) llama a onClose", () => {
    const onClose = vi.fn();
    renderOverlay(onClose);
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // El back() del cierre corre en un microtask (ver StrictMode abajo).
  const flushMicrotasks = () => act(async () => {});

  it("al abrir apila una entrada y al cerrar sin popstate la quita", async () => {
    const push = vi.spyOn(history, "pushState");
    const { unmount } = renderOverlay();
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith({ venueTour: true }, "");
    unmount();
    await flushMicrotasks();
    expect(history.back).toHaveBeenCalledTimes(1);
  });

  it("si cerró un popstate no vuelve a ir atrás", async () => {
    const onClose = vi.fn();
    const { unmount } = renderOverlay(onClose);
    window.dispatchEvent(new PopStateEvent("popstate"));
    unmount();
    await flushMicrotasks();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(history.back).not.toHaveBeenCalled();
  });

  // Ruling 10: en dev StrictMode monta, desmonta y vuelve a montar en el mismo tick.
  // Ese desmontaje no debe ir atrás (su popstate cerraría el visor recién abierto)
  // ni apilar una segunda entrada.
  it("en StrictMode apila una sola entrada y no se cierra solo", async () => {
    const push = vi.spyOn(history, "pushState");
    vi.mocked(history.back).mockImplementation(() => {
      setTimeout(() => window.dispatchEvent(new PopStateEvent("popstate")), 0);
    });
    const onClose = vi.fn();
    const { unmount } = render(
      <StrictMode>
        <TourOverlay scene="barbatos" venueName="Barbato's" theme={theme} onClose={onClose} />
      </StrictMode>,
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 10)));
    expect(push).toHaveBeenCalledTimes(1);
    expect(history.back).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
    await flushMicrotasks();
    expect(history.back).not.toHaveBeenCalled();
  });

  it("fija overflow hidden y restaura el valor previo al desmontar", () => {
    document.body.style.overflow = "clip";
    const { unmount } = renderOverlay();
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("clip");
  });

  it("dispose al desmontar", async () => {
    const { unmount } = renderOverlay();
    await screen.findByRole("button", { name: "Afuera" });
    unmount();
    expect(controller.dispose).toHaveBeenCalledTimes(1);
  });

  it("sin WebGL muestra el fallback y no llama al loader", () => {
    hasWebGLMock.mockReturnValue(false);
    renderOverlay();
    expect(screen.getByText("Tu dispositivo no puede mostrar el recorrido 3D")).toBeInTheDocument();
    expect(loadTourScene).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Afuera" })).not.toBeInTheDocument();
  });

  it("si el loader rechaza muestra Reintentar, y reintentar carga y monta", async () => {
    loadTourSceneMock.mockRejectedValueOnce(new Error("chunk"));
    renderOverlay();
    expect(await screen.findByText("No se pudo cargar el recorrido 3D")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Afuera" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await screen.findByRole("button", { name: "Afuera" });
    expect(loadTourScene).toHaveBeenCalledTimes(2);
    expect(mount).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });

  it("si mount tira muestra Reintentar", async () => {
    mount.mockImplementationOnce(() => {
      throw new Error("shader");
    });
    renderOverlay();
    expect(await screen.findByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("contexto perdido: libera, muestra Reintentar y reintentar monta de nuevo", async () => {
    renderOverlay();
    await screen.findByRole("button", { name: "Afuera" });
    act(() => mount.mock.calls[0][1].onContextLost());
    expect(controller.dispose).toHaveBeenCalledTimes(1);
    expect(screen.getByText("No se pudo cargar el recorrido 3D")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await screen.findByRole("button", { name: "Afuera" });
    expect(mount).toHaveBeenCalledTimes(2);
    expect(controller.dispose).toHaveBeenCalledTimes(1);
  });

  it("al reintentar vuelve a la vista Afuera con techo", async () => {
    renderOverlay();
    await userEvent.click(await screen.findByRole("button", { name: "Adentro" }));
    await userEvent.click(screen.getByRole("button", { name: "Sin techo" }));
    act(() => mount.mock.calls[0][1].onContextLost());
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("button", { name: "Afuera" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Sin techo" })).toHaveAttribute("aria-pressed", "false");
  });

  it("no monta la escena si se desmonta antes de que termine la carga", async () => {
    let resolve!: (m: TourModule) => void;
    loadTourSceneMock.mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = renderOverlay();
    unmount();
    await act(async () => resolve({ mount }));
    expect(mount).not.toHaveBeenCalled();
  });

  // El efecto de StrictMode corre dos veces: la carga del primero llega tarde y se descarta.
  it("en StrictMode monta una sola vez y la carga vieja se descarta", async () => {
    render(
      <StrictMode>
        <TourOverlay scene="barbatos" venueName="Barbato's" theme={theme} onClose={vi.fn()} />
      </StrictMode>,
    );
    await screen.findByRole("button", { name: "Afuera" });
    expect(loadTourScene).toHaveBeenCalledTimes(2);
    expect(mount).toHaveBeenCalledTimes(1);
    expect(controller.dispose).not.toHaveBeenCalled();
  });
});
