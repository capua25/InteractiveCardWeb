import * as THREE from "three";
import type { Textures } from "./textures";

export type MaterialKey =
  | "plaster" | "stone" | "roof" | "metal" | "cement" | "gravel" | "grass"
  | "ceiling" | "wood" | "carpet" | "chair" | "trunk" | "wallLow"
  | "hearth" | "sconce" | "bulb" | "fire" | "glass"
  | "greyStucco" | "frameGray" | "frostedGlass" | "nylon" | "canvas" | "sand"
  | "crownLight" | "crownDark" | "photinia" | "phormium" | "lavender"
  | "lavenderFlower" | "acWhite";

export const UNIT: Partial<Record<MaterialKey, number>> = {
  plaster: 3, stone: 1.6, ceiling: 2.4, wood: 1.2, roof: 2,
  gravel: 2.5, cement: 3, grass: 5, carpet: 2, wallLow: 3.2,
};

export type MaterialFactory = (key: MaterialKey) => THREE.MeshStandardMaterial;

export function createMaterials(
  T: Textures,
  envMap: THREE.Texture | null,
  palette: { roof: string },
): MaterialFactory {
  const def: Record<MaterialKey, THREE.MeshStandardMaterialParameters> = {
    plaster: { map: T.plaster, roughness: 0.95 },
    stone: { map: T.stone, roughness: 0.9 },
    roof: { map: T.roof, roughness: 0.5, metalness: 0.2, color: palette.roof, envMap, envMapIntensity: 0.25 },
    metal: { color: "#1b1c1e", roughness: 0.5, metalness: 0.6, envMap, envMapIntensity: 0.4 },
    cement: { map: T.cement, roughness: 0.9 },
    gravel: { map: T.gravel, roughness: 1 },
    grass: { map: T.grass, roughness: 1 },
    ceiling: { map: T.ceiling, roughness: 0.8 },
    wood: { map: T.wood, roughness: 0.7 },
    carpet: { map: T.carpet, roughness: 1 },
    chair: { color: "#1e1e20", roughness: 0.6 },
    trunk: { color: "#5a4030", roughness: 1 },
    wallLow: { map: T.wallLow, roughness: 1 },
    hearth: { color: "#141110", roughness: 1 },
    sconce: { color: "#fff1cc", emissive: "#ffcf80", emissiveIntensity: 3 },
    bulb: { color: "#fff3c4", emissive: "#ffd070", emissiveIntensity: 4 },
    fire: { color: "#ff8a30", emissive: "#ff6a1a", emissiveIntensity: 5 },
    greyStucco: { color: "#82837b", roughness: 0.95 },
    frameGray: { color: "#8a8f86", roughness: 0.6, metalness: 0.3 },
    frostedGlass: { color: "#4d5a58", roughness: 0.5 },
    acWhite: { color: "#e8e8e4", roughness: 0.6 },
    nylon: {
      color: "#e9eef0", transparent: true, opacity: 0.35, side: THREE.DoubleSide,
      depthWrite: false, roughness: 0.6,
    },
    canvas: { color: "#141414", roughness: 1, side: THREE.DoubleSide },
    sand: { color: "#c2ab8d", roughness: 1 },
    crownLight: { color: "#7f9a45", roughness: 1, flatShading: true },
    crownDark: { color: "#26361f", roughness: 1, flatShading: true },
    photinia: { color: "#8a2a22", roughness: 1, flatShading: true },
    phormium: { color: "#7a2a2a", roughness: 0.9, flatShading: true },
    lavender: { color: "#4a5a2a", roughness: 1, flatShading: true },
    lavenderFlower: { color: "#746a8a", roughness: 1 },
    // vidrio: transparente, visible de ambos lados, con reflejo del entorno
    glass: {
      color: "#a9c2cc", roughness: 0.04, metalness: 0.1, transparent: true,
      opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, envMap, envMapIntensity: 1.2,
    },
  };
  const cache = new Map<MaterialKey, THREE.MeshStandardMaterial>();
  return (key) => {
    let m = cache.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial(def[key]);
      cache.set(key, m);
    }
    return m;
  };
}
