import * as THREE from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ALPHA_CUT, bleed, coverageMips, FOLIAGE_TEXTURE_SIZE, type MipLevel } from "./foliage-textures";
import { acquireTextures, canvasTex, clearSharedTextures, makeTextures, releaseTextures, rng } from "./textures";

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

  it("makeTextures crea 15 texturas: 10 repetibles en sRGB con anisotropía limitada y 5 de follaje", () => {
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
      // mipmaps propios (con cobertura preservada) hasta 1×1; three no los regenera
      expect(tex.generateMipmaps).toBe(false);
      expect((tex.mipmaps as MipLevel[]).map((m) => m.width)).toEqual(Array.from({ length: Math.log2(size) + 1 }, (_, i) => size >> i));
      expect((tex.mipmaps as MipLevel[])[0].data).toBe(tex.image.data);
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

  it("bleed invierte las filas (fila 0 del canvas = arriba → v = 1) y pinta el RGB transparente con el promedio opaco", () => {
    // 2×2 RGBA: arriba-izq rojo opaco, arriba-der transparente (rgb basura), abajo-izq azul opaco, abajo-der alfa 100
    const src = new Uint8ClampedArray([
      255, 0, 0, 255, /**/ 9, 9, 9, 0,
      0, 0, 255, 255, /**/ 10, 20, 30, 100,
    ]);
    const out = Array.from(bleed(src, 2));
    expect(out).toEqual([
      // fila 0 de la salida = fila de abajo del canvas
      0, 0, 255, 255, /**/ 10, 20, 30, 100,
      // fila 1 = fila de arriba; el transparente toma el promedio de los opacos (alfa > 128): rojo y azul
      255, 0, 0, 255, /**/ 127.5 | 0, 0, 127.5 | 0, 0,
    ]);
  });

  it("los mipmaps conservan la cobertura del corte de alphaTest (hebras finas no desaparecen a la distancia)", () => {
    // líneas verticales de 1 px opacas cada 4 px (como hebras/tallos): 25% de cobertura en el nivel 0
    const size = 64;
    const base = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x += 4) base[(y * size + x) * 4 + 3] = 255;
    const cov = (d: Uint8Array) => {
      let c = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] >= ALPHA_CUT) c++;
      return c / (d.length / 4);
    };
    const mips = coverageMips(base, size);
    expect(mips.map((m) => m.width)).toEqual([64, 32, 16, 8, 4, 2, 1]);
    expect(cov(mips[0].data)).toBeCloseTo(0.25, 6);
    // con promedio simple el alfa de cada texel con hebra del nivel 1 es 127 (< 128) y del 2 en adelante 63: la
    // cobertura caería a 0 y las hebras desaparecerían. Acá ningún nivel queda vacío.
    expect(cov(mips[1].data)).toBeGreaterThanOrEqual(0.25);
    expect(cov(mips[1].data)).toBeLessThanOrEqual(0.5);
    for (const m of mips.slice(2)) expect(cov(m.data)).toBeGreaterThan(0);
  });

  it("los mipmaps no inflan la cobertura de una textura ya densa (también la acotan para abajo)", () => {
    const size = 32;
    const base = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size; i++) base[i * 4 + 3] = i % 2 ? 200 : 140; // 100% cubierto, alfa medio
    const half = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size; i++) half[i * 4 + 3] = i < (size * size) / 2 ? 255 : 0; // mitad de arriba
    const cov = (d: Uint8Array) => Array.from(d).filter((_, i) => i % 4 === 3).filter((a) => a >= ALPHA_CUT).length / (d.length / 4);
    expect(coverageMips(base, size).every((m) => cov(m.data) === 1)).toBe(true);
    expect(coverageMips(half, size).slice(0, 5).map((m) => cov(m.data))).toEqual([0.5, 0.5, 0.5, 0.5, 0.5]);
  });

  describe("cache compartido entre montajes", () => {
    beforeEach(() => clearSharedTextures());

    it("reabrir el recorrido (o el doble montaje de StrictMode) no vuelve a dibujar las texturas", () => {
      const create = vi.spyOn(document, "createElement");
      const a = acquireTextures(4, "low");
      const drawn = create.mock.calls.length;
      releaseTextures(a);
      const b = acquireTextures(4, "low");
      expect(b).toBe(a);
      expect(create.mock.calls.length).toBe(drawn);
      // otro nivel de detalle es otro juego (512 vs 256 px)
      expect(acquireTextures(4, "high")).not.toBe(a);
    });

    it("la GPU se libera recién cuando el último visor las suelta, y se pueden volver a usar", () => {
      const a = acquireTextures(2, "low");
      const dispose = vi.spyOn(a.leaves, "dispose");
      acquireTextures(2, "low"); // segundo visor montado a la vez
      releaseTextures(a);
      expect(dispose).not.toHaveBeenCalled();
      releaseTextures(a);
      expect(dispose).toHaveBeenCalledTimes(1);
      expect(acquireTextures(2, "low")).toBe(a);
    });

    it("texturas que no vienen del cache se liberan al soltarlas", () => {
      const own = makeTextures(1, "low");
      const dispose = vi.spyOn(own.flax, "dispose");
      releaseTextures(own);
      expect(dispose).toHaveBeenCalledTimes(1);
    });
  });
});
