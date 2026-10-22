import { fireEvent, render, screen, within } from "@testing-library/react";
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

  describe("navegación en la vista ampliada", () => {
    const three = [
      { src: "/venues/x/1.svg", alt: "Fachada" },
      { src: "/venues/x/2.svg", alt: "Galería" },
      { src: "/venues/x/3.svg", alt: "Fogón" },
    ];
    const open = async (alt: string) => {
      render(<Gallery images={three} />);
      await userEvent.click(screen.getByRole("button", { name: `Ampliar imagen: ${alt}` }));
      return screen.getByRole("dialog");
    };
    const swipe = (target: Element, from: [number, number], to: [number, number], pointerId = 1) => {
      fireEvent.pointerDown(target, { clientX: from[0], clientY: from[1], pointerId, isPrimary: true });
      fireEvent.pointerUp(target, { clientX: to[0], clientY: to[1], pointerId, isPrimary: true });
    };

    it("ArrowRight y ArrowLeft cambian de foto y el contador la acompaña", async () => {
      const dialog = await open("Fachada");
      expect(within(dialog).getByText("1 / 3")).toBeInTheDocument();
      await userEvent.keyboard("{ArrowRight}");
      expect(screen.getByRole("dialog", { name: "Galería" })).toBe(dialog);
      expect(within(dialog).getByAltText("Galería")).toBeInTheDocument();
      expect(within(dialog).queryByAltText("Fachada")).not.toBeInTheDocument();
      expect(within(dialog).getByText("2 / 3")).toBeInTheDocument();
      await userEvent.keyboard("{ArrowLeft}");
      expect(screen.getByRole("dialog", { name: "Fachada" })).toBeInTheDocument();
    });

    it("da la vuelta en los extremos (circular)", async () => {
      await open("Fogón");
      await userEvent.keyboard("{ArrowRight}");
      expect(screen.getByRole("dialog", { name: "Fachada" })).toBeInTheDocument();
      await userEvent.keyboard("{ArrowLeft}");
      expect(screen.getByRole("dialog", { name: "Fogón" })).toBeInTheDocument();
    });

    it("los botones Foto anterior/siguiente navegan sin cerrar la vista", async () => {
      const dialog = await open("Galería");
      await userEvent.click(within(dialog).getByRole("button", { name: "Foto siguiente" }));
      expect(screen.getByRole("dialog", { name: "Fogón" })).toBeInTheDocument();
      await userEvent.click(within(dialog).getByRole("button", { name: "Foto anterior" }));
      await userEvent.click(within(dialog).getByRole("button", { name: "Foto anterior" }));
      expect(screen.getByRole("dialog", { name: "Fachada" })).toBeInTheDocument();
    });

    it("un swipe horizontal cambia de foto y no cierra la vista", async () => {
      const dialog = await open("Fachada");
      const photo = within(dialog).getByAltText("Fachada");
      swipe(photo, [300, 200], [200, 210]);
      fireEvent.click(dialog); // el click que el navegador emite al soltar no debe cerrar
      expect(screen.getByRole("dialog", { name: "Galería" })).toBeInTheDocument();
      swipe(within(dialog).getByAltText("Galería"), [100, 200], [260, 190]);
      expect(screen.getByRole("dialog", { name: "Fachada" })).toBeInTheDocument();
    });

    it("ignora swipes cortos, verticales o con un segundo dedo (pinch)", async () => {
      const dialog = await open("Fachada");
      const photo = within(dialog).getByAltText("Fachada");
      swipe(photo, [300, 200], [270, 200]); // 30 px lento: no llega
      swipe(photo, [300, 200], [220, 400]); // mayormente vertical
      fireEvent.pointerDown(photo, { clientX: 300, clientY: 200, pointerId: 1, isPrimary: true });
      fireEvent.pointerDown(photo, { clientX: 500, clientY: 200, pointerId: 2, isPrimary: false });
      fireEvent.pointerUp(photo, { clientX: 100, clientY: 200, pointerId: 1, isPrimary: true });
      expect(screen.getByRole("dialog", { name: "Fachada" })).toBeInTheDocument();
    });

    it("al cerrar tras navegar, el foco vuelve a la miniatura de la foto actual", async () => {
      await open("Fachada");
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{Escape}");
      expect(screen.getByRole("button", { name: "Ampliar imagen: Galería" })).toHaveFocus();
    });

    it("Tab no sale del diálogo", async () => {
      const dialog = await open("Fachada");
      const buttons = within(dialog).getAllByRole("button");
      buttons[buttons.length - 1].focus();
      await userEvent.tab();
      expect(buttons[0]).toHaveFocus();
      await userEvent.tab({ shift: true });
      expect(buttons[buttons.length - 1]).toHaveFocus();
    });

    it("con una sola foto no hay flechas ni contador", async () => {
      render(<Gallery images={[three[0]]} />);
      await userEvent.click(screen.getByRole("button", { name: "Ampliar imagen: Fachada" }));
      const dialog = screen.getByRole("dialog", { name: "Fachada" });
      expect(within(dialog).queryByRole("button", { name: "Foto siguiente" })).not.toBeInTheDocument();
      expect(within(dialog).queryByText("1 / 1")).not.toBeInTheDocument();
      await userEvent.keyboard("{ArrowRight}");
      expect(screen.getByRole("dialog", { name: "Fachada" })).toBeInTheDocument();
    });
  });
});
