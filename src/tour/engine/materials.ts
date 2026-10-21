import * as THREE from "three";
import type { Textures } from "./textures";

export type MaterialKey =
  | "plaster" | "stone" | "roof" | "metal" | "cement" | "gravel" | "grass"
  | "ceiling" | "wood" | "carpet" | "chair" | "trunk" | "wallLow"
  | "hearth" | "sconce" | "bulb" | "fire" | "glass"
  | "greyStucco" | "frameGray" | "frostedGlass" | "nylon" | "canvas" | "sand" | "woodDark" | "gabion"
  | "leaves" | "willow" | "photinia" | "phormium" | "lavender" | "acWhite";

// Follaje en tarjetas: recorte por alphaTest (sin blending, escribe profundidad, sombra recortada por el mismo
// alphaTest en el depth material automático de three). Corte duro, sin alpha-to-coverage: el MSAA del renderer
// alcanza para el borde y no hay franjas semitransparentes que dependan del mipmap.
export const FOLIAGE_KEYS = ["leaves", "willow", "photinia", "phormium", "lavender"] as const satisfies readonly MaterialKey[];
const FOLIAGE_ALPHA_TEST = 0.5;

// Ajustes de shader del follaje:
// - Las tarjetas traen normales dobladas hacia afuera de la copa (sombreado de volumen). three invierte la normal en
//   las caras traseras de un material DoubleSide: acá se omite ese giro para que ambas caras usen la normal de la copa.
// - Sin especular: con el sol bajo detrás de los árboles, el Fresnel de las tarjetas vistas de canto pintaba un halo
//   amarillo pálido en el borde de las copas. Las hojas quedan mate (solo difusa).
// Si una versión nueva de three renombra lo que se parchea, falla al cargar el módulo (no en silencio).
function mustContain(text: string, part: string, where: string): string {
  if (!text.includes(part)) throw new Error(`foliage shader: "${part}" no está en ${where} (¿cambió three?)`);
  return text;
}
const FLIP = "normal *= faceDirection;";
const KEEP_CROWN_NORMALS = mustContain(THREE.ShaderChunk.normal_fragment_begin, FLIP, "normal_fragment_begin").replace(FLIP, "");
for (const field of ["material.specularColor", "material.specularColorBlended", "material.specularF90"]) {
  mustContain(THREE.ShaderChunk.lights_physical_fragment, field, "lights_physical_fragment");
}
const NO_SPECULAR = "material.specularColor = vec3( 0.0 );\nmaterial.specularColorBlended = vec3( 0.0 );\nmaterial.specularF90 = 0.0;";
export function foliageShader(shader: { fragmentShader: string }) {
  const normals = "#include <normal_fragment_begin>", lights = "#include <lights_physical_fragment>";
  shader.fragmentShader = mustContain(mustContain(shader.fragmentShader, normals, "el fragment shader"), lights, "el fragment shader")
    .replace(normals, KEEP_CROWN_NORMALS)
    .replace(lights, `${lights}\n${NO_SPECULAR}`);
}

export const UNIT: Partial<Record<MaterialKey, number>> = {
  plaster: 3, stone: 1.6, ceiling: 2.4, wood: 1.2, roof: 2,
  gravel: 2.5, cement: 3, grass: 5, carpet: 2, wallLow: 3.2,
};

// Multiplicador lineal por canal sobre la textura (puede pasar de 1): compensa la luz cálida del atardecer,
// que deja casi sin azul a las caras de contraluz.
const tint = (r: number, g: number, b: number) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);

export type MaterialFactory = (key: MaterialKey) => THREE.MeshStandardMaterial;

export function createMaterials(
  T: Textures,
  envMap: THREE.Texture | null,
  palette: { roof: string },
): MaterialFactory {
  const def: Record<MaterialKey, THREE.MeshStandardMaterialParameters> = {
    plaster: { map: T.plaster, color: tint(0.78, 1.02, 2.16), roughness: 0.95 },
    // tints (y hex pins bluish a propósito): compensan el sol #ffb36b + hemi cálida, que dejan sin azul las caras
    // en sombra; ganancias de azul moderadas para que piedra al sol Y en sombra lean gris neutro
    stone: { map: T.stone, color: tint(0.85, 1.12, 1.5), roughness: 0.9 },
    roof: { map: T.roof, roughness: 0.5, metalness: 0.2, color: palette.roof, envMap, envMapIntensity: 0.25 },
    metal: { color: "#1b1c1e", roughness: 0.5, metalness: 0.6, envMap, envMapIntensity: 0.4 },
    cement: { map: T.cement, roughness: 0.9 },
    gravel: { map: T.gravel, color: tint(0.7, 0.9, 1.15), roughness: 1 },
    grass: { map: T.grass, color: tint(0.84, 0.83, 1.33), roughness: 1 },
    ceiling: { map: T.ceiling, roughness: 0.8 },
    wood: { map: T.wood, roughness: 0.7 },
    carpet: { map: T.carpet, roughness: 1 },
    chair: { color: "#1e1e20", roughness: 0.6 },
    trunk: { color: "#7a7672", roughness: 1 }, // corteza gris: la luz cálida la lleva a gris pardo
    wallLow: { map: T.wallLow, color: tint(2, 3, 5), roughness: 1 },
    hearth: { color: "#141110", roughness: 1 },
    sconce: { color: "#fff1cc", emissive: "#ffcf80", emissiveIntensity: 3 },
    bulb: { color: "#fff3c4", emissive: "#ffd070", emissiveIntensity: 4 },
    fire: { color: "#ff8a30", emissive: "#ff6a1a", emissiveIntensity: 5 },
    greyStucco: { color: "#76a0c4", roughness: 0.95 },
    frameGray: { color: "#8a8f86", roughness: 0.6, metalness: 0.3 },
    frostedGlass: { color: "#9db3ae", roughness: 0.5 },
    acWhite: { color: "#e8e8e4", roughness: 0.6 },
    nylon: {
      color: "#e9eef0", transparent: true, opacity: 0.35, side: THREE.DoubleSide,
      depthWrite: false, roughness: 0.6,
    },
    canvas: { color: "#141414", roughness: 1, side: THREE.DoubleSide },
    // hex azulado a propósito: la luz cálida lo lleva a beige claro / gris verdoso en pantalla
    sand: { color: "#b5c0d2", roughness: 1 },
    woodDark: { color: "#2a2c34", roughness: 0.7 },
    gabion: { map: T.stone, color: tint(2.3, 2.3, 2.5), roughness: 0.9 },
    // follaje: la textura trae el color; el tinte (azul > 1) compensa la luz cálida como en el pasto
    leaves: { map: T.leaves, color: tint(0.74, 1, 1.45), roughness: 0.9 },
    willow: { map: T.willow, color: tint(0.7, 1.02, 1.6), roughness: 0.9 },
    photinia: { map: T.photiniaLeaves, color: tint(1, 1, 1.25), roughness: 0.9 },
    phormium: { map: T.flax, color: tint(1, 1, 1.3), roughness: 0.8 },
    lavender: { map: T.lavender, color: tint(0.82, 1, 1.5), roughness: 1 },
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
      if ((FOLIAGE_KEYS as readonly MaterialKey[]).includes(key)) {
        m.alphaTest = FOLIAGE_ALPHA_TEST;
        m.side = THREE.DoubleSide;
        m.onBeforeCompile = foliageShader;
      }
      cache.set(key, m);
    }
    return m;
  };
}
