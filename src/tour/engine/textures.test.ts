import * as THREE from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { canvasTex, makeTextures, rng } from "./textures";

// jsdom no dibuja en canvas 2D: getContext("2d") se stubbea con un Proxy de no-ops.
beforeEach(() => {
  const noop = new Proxy(function () {}, {
    get: () => noop,
    set: () => true,
    apply: () => undefined,
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    noop as unknown as CanvasRenderingContext2D,
  );
});

describe("textures", () => {
  it("rng es determinista y devuelve valores en [0, 1)", () => {
    const a = rng(7);
    const b = rng(7);
    const xs = Array.from({ length: 50 }, a);
    expect(xs).toEqual(Array.from({ length: 50 }, b));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it("makeTextures crea las 10 texturas repetibles en sRGB con anisotropía limitada", () => {
    const t = makeTextures(4);
    expect(Object.keys(t).sort()).toEqual([
      "carpet", "ceiling", "cement", "grass", "gravel",
      "plaster", "roof", "stone", "wallLow", "wood",
    ]);
    expect(t.wood).toBe(t.ceiling);
    for (const tex of Object.values(t)) {
      expect(tex.wrapS).toBe(THREE.RepeatWrapping);
      expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);
      expect(tex.anisotropy).toBe(4);
    }
  });

  it("canvasTex respeta el máximo de anisotropía recibido", () => {
    expect(canvasTex(16, () => {}, 2).anisotropy).toBe(2);
  });
});
