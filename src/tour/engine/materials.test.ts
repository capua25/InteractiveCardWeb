import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createMaterials } from "./materials";
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
});
