import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RevealItem } from "@/components/scroll-reveal/RevealItem";
import { ScrollReveal } from "@/components/scroll-reveal/ScrollReveal";

// whileInView arranca en opacity 0 en jsdom: afirmamos presencia, no visibilidad.
describe("ScrollReveal + RevealItem", () => {
  it("renderiza sus hijos", () => {
    render(
      <ScrollReveal>
        <RevealItem>
          <h2>Título</h2>
        </RevealItem>
        <RevealItem>
          <p>Párrafo</p>
        </RevealItem>
      </ScrollReveal>,
    );
    expect(screen.getByRole("heading", { name: "Título" })).toBeInTheDocument();
    expect(screen.getByText("Párrafo")).toBeInTheDocument();
  });

  it("RevealItem como li mantiene la semántica de lista", () => {
    render(
      <ScrollReveal>
        <ul>
          <RevealItem as="li">Uno</RevealItem>
          <RevealItem as="li" lift>
            Dos
          </RevealItem>
        </ul>
      </ScrollReveal>,
    );
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Uno", "Dos"]);
  });
});
