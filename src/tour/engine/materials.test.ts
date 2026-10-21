import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createMaterials } from "./materials";
import { ROOF_COLOR } from "../scenes/barbatos/dimensions";
import type { TextureKey, Textures } from "./textures";

const keys: TextureKey[] = [
  "stone", "ceiling", "wood", "roof", "gravel",
  "plaster", "wallLow", "cement", "grass", "carpet",
];
const fakeTextures = Object.fromEntries(
  keys.map((k) => [k, new THREE.Texture()]),
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

  it("la chapa de Barbato's es gris grafito", () => {
    expect(ROOF_COLOR).toBe("#6b6e75");
  });

  it("el nylon es transparente, de doble cara y no escribe profundidad", () => {
    expect(M("nylon")).toMatchObject({
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  });

  it("los materiales nuevos tienen los colores de las fotos", () => {
    const hex: Record<string, string> = {
      crownLight: "7f9a45", crownDark: "26361f", sand: "c2ab8d",
      greyStucco: "82837b", frameGray: "8a8f86", frostedGlass: "4d5a58",
      photinia: "8a2a22",
    };
    for (const [k, v] of Object.entries(hex)) {
      expect(M(k as never).color.getHexString(), k).toBe(v);
    }
  });
});
