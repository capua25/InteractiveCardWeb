import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Envelope } from "@/components/envelope/Envelope";

const reduced = vi.hoisted(() => ({ value: false }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => reduced.value,
}));

// Deja correr unos frames reales del loop (jsdom anima con requestAnimationFrame).
const frames = () => new Promise((resolve) => setTimeout(resolve, 200));

describe("Envelope", () => {
  afterEach(() => {
    reduced.value = false;
  });

  it("muestra la leyenda y un botón con label accesible", () => {
    render(<Envelope venueName="Salón X" onOpen={() => {}} />);
    expect(screen.getByRole("button", { name: "Abrir la invitación de Salón X" })).toBeInTheDocument();
    expect(screen.getByText("tocá para abrir")).toBeInTheDocument();
  });

  it("muestra el logo cuando hay uno", () => {
    render(<Envelope venueName="Salón X" logo="/venues/x/logo.svg" onOpen={() => {}} />);
    expect(screen.getByAltText("Logo de Salón X")).toBeInTheDocument();
  });

  it("llama a onOpen al hacer click", async () => {
    const onOpen = vi.fn();
    render(<Envelope venueName="Salón X" onOpen={onOpen} />);
    await userEvent.click(screen.getByRole("button", { name: /Abrir la invitación/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it.each([["{Enter}"], [" "]])("se abre con el teclado (%s)", async (key) => {
    const onOpen = vi.fn();
    render(<Envelope venueName="Salón X" onOpen={onOpen} />);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: /Abrir la invitación/ })).toHaveFocus();
    await userEvent.keyboard(key);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("sin reduced motion el sobre flota en reposo (loop idle activo)", async () => {
    render(<Envelope venueName="Salón X" onOpen={() => {}} />);
    await frames();
    expect(screen.getByTestId("envelope-body").style.transform).not.toBe("");
    // El área de toque no se mueve: flota solo la capa visual.
    expect(screen.getByRole("button", { name: /Abrir la invitación/ }).style.transform).toBe("");
  });

  it("con reduced motion el sobre queda quieto: sin loop idle ni pulso del texto", async () => {
    reduced.value = true;
    render(<Envelope venueName="Salón X" onOpen={() => {}} />);
    await frames();
    expect(screen.getByTestId("envelope-body").style.transform).toBe("");
    expect(screen.getByText("tocá para abrir").style.opacity).toBe("");
  });
});
