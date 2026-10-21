import { describe, expect, it } from "vitest";
import { BARBATOS_VIEWS } from "../scenes/barbatos/views";
import { clampTarget, resolveViewPose } from "./camera";

describe("camera", () => {
  it("Afuera en pantalla angosta se aleja ×1,5 desde el target", () => {
    expect(resolveViewPose(BARBATOS_VIEWS, "out", 0.5).pos).toEqual([29, 13.75, 34.5]);
  });
  it("Afuera en pantalla ancha y Adentro siempre usan la pose del v6", () => {
    expect(resolveViewPose(BARBATOS_VIEWS, "out", 1.6)).toEqual(BARBATOS_VIEWS.out);
    expect(resolveViewPose(BARBATOS_VIEWS, "in", 0.5)).toEqual(BARBATOS_VIEWS.in);
  });
  it("clampTarget recorta a la caja y deja intacto lo que está adentro", () => {
    const b = { min: [-25, 0, -28], max: [25, 8, 16] } as const;
    expect(clampTarget([90, -3, -100], b)).toEqual([25, 0, -28]);
    expect(clampTarget([-1, 2.5, 0], b)).toEqual([-1, 2.5, 0]);
  });
});
