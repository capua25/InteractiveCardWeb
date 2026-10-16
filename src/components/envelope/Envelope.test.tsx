import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Envelope } from "@/components/envelope/Envelope";

describe("Envelope", () => {
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
});
