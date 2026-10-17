import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Gallery } from "@/components/gallery/Gallery";

const images = [
  { src: "/venues/x/1.svg", alt: "Salón decorado" },
  { src: "/venues/x/2.svg", alt: "Mesa de dulces" },
];

describe("Gallery", () => {
  it("muestra todas las miniaturas con su alt", () => {
    render(<Gallery images={images} />);
    expect(screen.getByAltText("Salón decorado")).toBeInTheDocument();
    expect(screen.getByAltText("Mesa de dulces")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abre la vista ampliada al tocar una imagen y la cierra con el botón", async () => {
    render(<Gallery images={images} />);
    await userEvent.click(screen.getByRole("button", { name: "Ampliar imagen: Mesa de dulces" }));
    const dialog = screen.getByRole("dialog", { name: "Mesa de dulces" });
    expect(within(dialog).getByAltText("Mesa de dulces")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cierra la vista ampliada con Escape", async () => {
    render(<Gallery images={images} />);
    await userEvent.click(screen.getByRole("button", { name: "Ampliar imagen: Salón decorado" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mueve el foco al botón Cerrar al abrir la vista ampliada", async () => {
    render(<Gallery images={images} />);
    await userEvent.click(screen.getByRole("button", { name: "Ampliar imagen: Salón decorado" }));
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus();
  });

  it("devuelve el foco a la miniatura que abrió la vista al cerrar con Escape", async () => {
    render(<Gallery images={images} />);
    const thumb = screen.getByRole("button", { name: "Ampliar imagen: Mesa de dulces" });
    await userEvent.click(thumb);
    await userEvent.keyboard("{Escape}");
    expect(thumb).toHaveFocus();
  });

  it("devuelve el foco a la miniatura que abrió la vista al cerrar con el botón", async () => {
    render(<Gallery images={images} />);
    const thumb = screen.getByRole("button", { name: "Ampliar imagen: Salón decorado" });
    await userEvent.click(thumb);
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(thumb).toHaveFocus();
  });

  // La salida animada (layoutId + fundido) deja el nodo montado un instante:
  // durante ese tramo no debe exponerse como diálogo ni ser interactivo.
  // (jsdom no hace layout y la salida con layoutId no termina acá; el desmontaje
  // real se verificó en Chromium.)
  it("al cerrar deja de ser diálogo de inmediato y el nodo que sale queda inerte", async () => {
    render(<Gallery images={images} />);
    await userEvent.click(screen.getByRole("button", { name: "Ampliar imagen: Salón decorado" }));
    const overlay = screen.getByRole("dialog");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(!overlay.isConnected || overlay.hasAttribute("inert")).toBe(true);
  });
});
