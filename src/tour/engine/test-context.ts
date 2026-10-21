// Solo para tests: contexto del motor con texturas falsas (sin canvas).
import * as THREE from "three";
import { createMaterials, type MaterialFactory } from "./materials";
import { createPrimitives, type Primitives } from "./primitives";
import type { TextureKey, Textures } from "./textures";

const KEYS: TextureKey[] = [
  "stone", "ceiling", "wood", "roof", "gravel",
  "plaster", "wallLow", "cement", "grass", "carpet",
];

export function createTestEngineContext(): {
  materials: MaterialFactory;
  textures: Textures;
  primitives: Primitives;
} {
  const textures = Object.fromEntries(KEYS.map((k) => [k, new THREE.Texture()])) as Textures;
  const materials = createMaterials(textures, null, { roof: "#3b4f66" });
  return { materials, textures, primitives: createPrimitives(materials) };
}
