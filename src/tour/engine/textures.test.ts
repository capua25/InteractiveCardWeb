import * as THREE from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FOLIAGE_TEXTURE_SIZE } from "./foliage-textures";
import { canvasTex, makeTextures, rng } from "./textures";

const REPEAT = ["carpet", "ceiling", "cement", "grass", "gravel", "plaster", "roof", "stone", "wallLow", "wood"] as const;
const FOLIAGE = ["flax", "lavender", "leaves", "photiniaLeaves", "willow"] as const;

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
    expect(Object.keys(t).sort()).toEqual([...REPEAT, ...FOLIAGE].sort());
    expect(t.wood).toBe(t.ceiling);
    for (const k of REPEAT) {
      expect(t[k].wrapS).toBe(THREE.RepeatWrapping);
      expect(t[k].colorSpace).toBe(THREE.SRGBColorSpace);
      expect(t[k].anisotropy).toBe(4);
    }
  });

  it.each(["high", "low"] as const)("follaje %s: texturas recortables con mipmaps, sin repetir, a 512/256 px", (detail) => {
    const t = makeTextures(4, detail);
    const size = FOLIAGE_TEXTURE_SIZE[detail];
    expect(size).toBe(detail === "high" ? 512 : 256);
    for (const k of FOLIAGE) {
      const tex = t[k] as THREE.DataTexture;
      expect(tex.image.width, k).toBe(size);
      expect(tex.image.height, k).toBe(size);
      expect(tex.image.data?.length, k).toBe(size * size * 4);
      expect(tex.format).toBe(THREE.RGBAFormat);
      expect(tex.generateMipmaps).toBe(true);
      expect(tex.minFilter).toBe(THREE.LinearMipmapLinearFilter);
      expect(tex.wrapS).toBe(THREE.ClampToEdgeWrapping);
      expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);
      expect(tex.anisotropy).toBe(4);
    }
  });

  it("cada textura de follaje se dibuja una sola vez (un canvas por textura)", () => {
    const create = vi.spyOn(document, "createElement");
    makeTextures(4, "low");
    const canvases = create.mock.calls.filter(([tag]) => tag === "canvas").length;
    // 9 repetibles (wood comparte el canvas de ceiling) + 5 de follaje
    expect(canvases).toBe(REPEAT.length - 1 + FOLIAGE.length);
  });

  it("canvasTex respeta el máximo de anisotropía recibido", () => {
    expect(canvasTex(16, () => {}, 2).anisotropy).toBe(2);
  });
});
