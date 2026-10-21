import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createMaterials } from "./materials";
import { barbatosScene } from "../scenes/barbatos";
import { FOLIAGE_KEYS } from "./materials";
import { TEXTURE_KEYS, type Textures } from "./textures";

const fakeTextures = Object.fromEntries(
  TEXTURE_KEYS.map((k) => [k, new THREE.Texture()]),
) as Textures;
const M = createMaterials(fakeTextures, null, { roof: "#3b4f66" });

describe("materials", () => {
  it("devuelve la misma instancia para la misma clave", () => {
    expect(M("stone")).toBe(M("stone"));
  });

  it("la chapa usa el color de la paleta", () => {
    expect(M("roof").color.getHexString()).toBe("3b4f66");
  });

  it("el vidrio es transparente, de doble cara y no escribe profundidad", () => {
    expect(M("glass")).toMatchObject({
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  });

  it("los apliques emiten luz cálida", () => {
    expect(M("sconce").emissiveIntensity).toBe(3);
    expect(M("bulb").emissiveIntensity).toBe(4);
  });

  it("la escena de Barbato's pinta la chapa de gris grafito", () => {
    const sceneM = createMaterials(fakeTextures, null, barbatosScene.palette);
    expect(sceneM("roof").color.getHexString()).toBe("6b6e75");
  });

  it("el nylon es transparente, de doble cara y no escribe profundidad", () => {
    expect(M("nylon")).toMatchObject({
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  });

  it("el follaje es de tarjetas recortadas: alphaTest 0.5, sin blending, escribe profundidad, doble cara", () => {
    for (const k of FOLIAGE_KEYS) {
      expect(M(k), k).toMatchObject({ alphaTest: 0.5, alphaToCoverage: true, transparent: false, depthWrite: true, side: THREE.DoubleSide, flatShading: false });
      expect(typeof M(k).onBeforeCompile, k).toBe("function");
    }
  });

  it("cada follaje usa su textura de canvas (la misma instancia: se genera una vez)", () => {
    const maps = { leaves: "leaves", willow: "willow", photinia: "photiniaLeaves", phormium: "flax", lavender: "lavender" } as const;
    for (const [k, t] of Object.entries(maps)) expect(M(k as never).map, k).toBe(fakeTextures[t]);
  });

  it("el follaje conserva la normal de la copa en las caras traseras (no la invierte)", () => {
    const shader = { fragmentShader: "a\n#include <normal_fragment_begin>\nb" };
    M("leaves").onBeforeCompile(shader as never, null as never);
    expect(shader.fragmentShader).not.toContain("#include <normal_fragment_begin>");
    expect(shader.fragmentShader).not.toContain("normal *= faceDirection");
    expect(shader.fragmentShader).toContain("vec3 normal = normalize( vNormal );");
  });

  it("los materiales con tinte conservan su multiplicador lineal (puede pasar de 1)", () => {
    const lin: Record<string, [number, number, number]> = {
      plaster: [0.78, 1.02, 2.16], stone: [0.85, 1.12, 1.5], gravel: [0.7, 0.9, 1.15],
      grass: [0.84, 0.83, 1.33], wallLow: [2, 3, 5], gabion: [2.3, 2.3, 2.5],
    };
    for (const [k, [r, g, b]] of Object.entries(lin)) {
      const c = M(k as never).color;
      expect([c.r, c.g, c.b], k).toEqual([r, g, b].map((x) => expect.closeTo(x, 5)));
    }
  });

  it("los materiales nuevos tienen los colores de las fotos", () => {
    const hex: Record<string, string> = {
      sand: "b5c0d2", greyStucco: "76a0c4", frameGray: "8a8f86", frostedGlass: "9db3ae",
      woodDark: "2a2c34", trunk: "7a7672",
    };
    for (const [k, v] of Object.entries(hex)) {
      expect(M(k as never).color.getHexString(), k).toBe(v);
    }
  });
});
