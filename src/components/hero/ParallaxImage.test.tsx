import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ParallaxImage } from "@/components/hero/ParallaxImage";

const reduced = vi.hoisted(() => ({ value: false }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => reduced.value,
}));

describe("ParallaxImage", () => {
  afterEach(() => {
    reduced.value = false;
  });

  it("renderiza la imagen con su alt", () => {
    render(<ParallaxImage src="/venues/x/hero.svg" alt="Foto principal" />);
    expect(screen.getByAltText("Foto principal")).toBeInTheDocument();
  });

  it("sin reduced motion aplica el transform del parallax (escala inicial 1.1)", () => {
    render(<ParallaxImage src="/venues/x/hero.svg" alt="Foto principal" />);
    expect(screen.getByTestId("parallax-layer").style.transform).toContain("scale(1.1)");
  });

  it("con reduced motion no aplica ningún transform", () => {
    reduced.value = true;
    render(<ParallaxImage src="/venues/x/hero.svg" alt="Foto principal" />);
    expect(screen.getByTestId("parallax-layer").style.transform).toBe("");
  });
});
