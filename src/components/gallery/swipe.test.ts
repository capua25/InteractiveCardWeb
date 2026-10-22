import { describe, expect, it } from "vitest";
import { swipeDirection } from "@/components/gallery/swipe";

describe("swipeDirection", () => {
  it("hacia la izquierda pasa a la siguiente y hacia la derecha a la anterior", () => {
    expect(swipeDirection(-80, 5, 400)).toBe("next");
    expect(swipeDirection(80, -5, 400)).toBe("prev");
  });

  it("acepta justo el umbral de 50 px y descarta lo que no llega (si es lento)", () => {
    expect(swipeDirection(-50, 0, 1000)).toBe("next");
    expect(swipeDirection(-49, 0, 1000)).toBeNull();
  });

  it("un flick rápido cuenta aunque sea corto, pero no un temblor", () => {
    expect(swipeDirection(-30, 0, 50)).toBe("next"); // 0.6 px/ms
    expect(swipeDirection(-10, 0, 5)).toBeNull(); // rápido pero < 20 px
  });

  it("ignora gestos más verticales que horizontales (scroll)", () => {
    expect(swipeDirection(-80, 120, 300)).toBeNull();
    expect(swipeDirection(60, 60, 300)).toBeNull();
  });

  it("un tap sin movimiento no es swipe", () => {
    expect(swipeDirection(0, 0, 0)).toBeNull();
  });
});
