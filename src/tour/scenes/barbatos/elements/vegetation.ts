import * as THREE from "three";
import { addCrown, addStar, CardBuilder, limb, mergeAll } from "@/tour/engine/cards";
import { rng } from "@/tour/engine/textures";
import type { GeometryDetail, SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

const POPLAR = { radius: 0.7, lift: 0.3, seed: 5, jitter: 0.15 };
const SAPLING = { trunkRadius: 0.06, trunkRatio: 0.55, crownRadius: 0.22, crownY: 0.72 };
const WILLOW = { trunkRadius: 0.11, trunkHeight: 1.2, crown: { rx: 1.2, ry: 0.8, y: 2.3 }, skirt: { y: 0.5, height: 2, scale: 0.7 } };
const PHOTINIA = { trunkRadius: 0.1, trunkHeight: 1.4, crownRadius: 1.3, crownY: 2.9 };
const PHORMIUM = { min: 1.4, max: 2.2, seed: 11, width: 0.8 };
const SEED = 23;

/** Radio de copa (círculo en planta) de cada árbol dentro del lote, para chequear despejes. */
export function treeCrowns(l: BarbatosLayout): { x: number; z: number; radius: number }[] {
  const v = l.vegetation;
  return [
    ...v.saplings.map((s) => ({ x: s.x, z: s.z, radius: s.height * SAPLING.crownRadius })),
    ...v.tallSaplings.map((t) => ({ x: t.x, z: t.z, radius: t.radius })),
    ...v.wallRow.map((w) => ({ x: w.x, z: w.z, radius: w.radius })),
    ...v.poplars.map((p) => ({ x: p.x, z: p.z, radius: POPLAR.radius * (1 + POPLAR.jitter) })),
    ...v.phormiums.map((p) => ({ x: p.x, z: p.z, radius: PHORMIUM.width / 2 })),
    ...v.willows.map((w) => ({ x: w.x, z: w.z, radius: WILLOW.skirt.scale * 2.2 })),
    { x: v.photinia.x, z: v.photinia.z, radius: PHOTINIA.crownRadius },
  ];
}

// Tarjetas por planta y segmentos de tronco según el nivel de detalle. Cambia triángulos y textura (512/256 px),
// nunca la cantidad de meshes: cada especie va en un solo mesh (o InstancedMesh) por material.
export const CARDS = {
  high: { sapling: 10, tall: 18, poplar: 24, wallRow: 12, willowDome: 12, willowSkirt: 18, photinia: 22, phormium: 4, trunk: 7, branches: 3 },
  low: { sapling: 6, tall: 11, poplar: 14, wallRow: 7, willowDome: 7, willowSkirt: 11, photinia: 13, phormium: 3, trunk: 5, branches: 2 },
} as const satisfies Record<GeometryDetail, Record<string, number>>;

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// Ramas cortas desde el tronco hasta adentro de la copa, repartidas en ángulo.
function branches(parts: THREE.BufferGeometry[], x: number, z: number, fromY: number, crown: THREE.Vector3, reach: number, n: number, r: number, segs: number, R: () => number) {
  const phase = R() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2 + (R() - 0.5) * 0.6;
    const y0 = fromY + i * reach * 0.25;
    const tip = V(crown.x + Math.cos(a) * reach, crown.y + (R() - 0.2) * reach * 0.6, crown.z + Math.sin(a) * reach);
    parts.push(limb(V(x, y0, z), tip, r, r * 0.35, Math.max(3, segs - 2)));
  }
}

/** Matas en estrella de una sola planta (geometría compartida por InstancedMesh), base en y=0. */
export function starGeometry(count: number, width: number, height: number): THREE.BufferGeometry {
  const b = new CardBuilder();
  addStar(b, V(0, 0, 0), count, width, height, 0);
  return b.geometry();
}

// Vegetación del parque en 5 draw calls: troncos y ramas (un mesh), hojas de los árboles (un mesh de tarjetas),
// sauces (tarjetas de hebras colgantes), fotinia y formios (instanciados). Fuera del muro no hay árboles.
export const vegetation: SceneElement<BarbatosLayout> = {
  id: "vegetation",
  build({ layout: l, materials, detail = "low" }) {
    const C = CARDS[detail];
    const v = l.vegetation;
    const R = rng(SEED);
    const trunks: THREE.BufferGeometry[] = [];
    const leaves = new CardBuilder();
    const willow = new CardBuilder();
    const photinia = new CardBuilder();

    for (const s of v.saplings) {
      const r = s.height * SAPLING.crownRadius;
      const crown = V(s.x, s.height * SAPLING.crownY, s.z);
      trunks.push(limb(V(s.x, 0, s.z), V(s.x, crown.y + r * 0.1, s.z), SAPLING.trunkRadius * 0.8, SAPLING.trunkRadius * 0.3, C.trunk));
      branches(trunks, s.x, s.z, s.height * SAPLING.trunkRatio, crown, r * 0.5, C.branches, SAPLING.trunkRadius * 0.4, C.trunk, R);
      addCrown(leaves, { center: crown, radii: V(r, r * 1.4, r), count: C.sapling, size: r * 1.4, shell: 0.45, flatten: 0.45 }, R);
    }
    for (const t of v.tallSaplings) {
      const r = t.radius;
      const crown = V(t.x, t.height - r, t.z);
      const tr = SAPLING.trunkRadius * 1.6;
      trunks.push(limb(V(t.x, 0, t.z), V(t.x, crown.y + r * 0.3, t.z), tr, tr * 0.3, C.trunk));
      branches(trunks, t.x, t.z, crown.y - r * 0.9, crown, r * 0.55, C.branches + 1, tr * 0.5, C.trunk, R);
      addCrown(leaves, { center: crown, radii: V(r * 0.95, r * 1.2, r * 0.95), count: C.tall, size: r * 1.15, shell: 0.5 }, R);
    }
    for (const w of v.wallRow) {
      const top = POPLAR.lift + w.height;
      trunks.push(limb(V(w.x, 0, w.z), V(w.x, top * 0.8, w.z), 0.035, 0.012, C.trunk));
      addCrown(leaves, { center: V(w.x, POPLAR.lift + w.height * 0.55, w.z), radii: V(w.radius * 1.3, w.height * 0.45, w.radius * 1.3), count: C.wallRow, size: 0.6, aspect: 1.3, shell: 0.5, flatten: 0.35 }, R);
    }
    const J = rng(POPLAR.seed);
    for (const p of v.poplars) {
      const w = POPLAR.radius * (1 - POPLAR.jitter + 2 * POPLAR.jitter * J());
      const h = p.height * (1 - POPLAR.jitter + 2 * POPLAR.jitter * J());
      J(); // yaw de la versión anterior: se consume para no correr la secuencia de jitter
      trunks.push(limb(V(p.x, 0, p.z), V(p.x, POPLAR.lift + h * 0.75, p.z), 0.055, 0.02, C.trunk));
      addCrown(leaves, { center: V(p.x, POPLAR.lift + h * 0.53, p.z), radii: V(w * 0.8, h * 0.47, w * 0.8), count: C.poplar, size: w * 1.2, aspect: 1.3, shell: 0.5, flatten: 0.35 }, R);
    }

    for (const t of v.willows) {
      const c = WILLOW.crown;
      const crown = V(t.x, c.y, t.z);
      trunks.push(limb(V(t.x, 0, t.z), V(t.x, c.y + c.ry * 0.3, t.z), WILLOW.trunkRadius, WILLOW.trunkRadius * 0.4, C.trunk));
      branches(trunks, t.x, t.z, WILLOW.trunkHeight, crown, c.rx * 0.6, C.branches, WILLOW.trunkRadius * 0.45, C.trunk, R);
      // cúpula: tarjetas sobre la mitad de arriba del elipsoide
      addCrown(willow, { center: crown, radii: V(c.rx, c.ry, c.rx), count: C.willowDome, size: 1.15, shell: 0.6, minY: 0, flatten: 0.3 }, R);
      // falda: tarjetas verticales de hebras colgantes alrededor del borde, de la copa hasta cerca del pasto
      const top = c.y + c.ry * 0.5;
      const bottom = WILLOW.skirt.y;
      const h = top - bottom;
      const phase = R() * Math.PI * 2;
      for (let i = 0; i < C.willowSkirt; i++) {
        const a = phase + (i / C.willowSkirt) * Math.PI * 2 + (R() - 0.5) * 0.3;
        const rad = c.rx * (0.7 + R() * 0.15);
        const normal = V(Math.cos(a), 0.18, Math.sin(a));
        const hh = h * (0.8 + R() * 0.2);
        willow.add({
          center: V(t.x + Math.cos(a) * rad, top - hh / 2, t.z + Math.sin(a) * rad),
          normal, up: V(-Math.cos(a) * 0.12, 1, -Math.sin(a) * 0.12), width: 0.95, height: hh, bendFrom: V(t.x, c.y - 0.6, t.z), bend: 0.6,
        });
      }
    }

    const ph = v.photinia;
    const phCrown = V(ph.x, PHOTINIA.crownY, ph.z);
    trunks.push(limb(V(ph.x, 0, ph.z), V(ph.x, PHOTINIA.crownY, ph.z), PHOTINIA.trunkRadius, PHOTINIA.trunkRadius * 0.3, C.trunk));
    branches(trunks, ph.x, ph.z, PHOTINIA.trunkHeight * 0.6, phCrown, PHOTINIA.crownRadius * 0.55, C.branches + 1, PHOTINIA.trunkRadius * 0.6, C.trunk, R);
    addCrown(photinia, { center: phCrown, radii: V(PHOTINIA.crownRadius, PHOTINIA.crownRadius * 1.15, PHOTINIA.crownRadius), count: C.photinia, size: 1.2, shell: 0.5 }, R);

    // formios: una estrella de tarjetas compartida, instanciada con alto y giro por planta
    const F = rng(PHORMIUM.seed);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const flax = new THREE.InstancedMesh(starGeometry(C.phormium, PHORMIUM.width, 1), materials("phormium"), v.phormiums.length);
    v.phormiums.forEach((f, i) => {
      const h = PHORMIUM.min + F() * (PHORMIUM.max - PHORMIUM.min);
      flax.setMatrixAt(i, m.compose(V(f.x, 0, f.z), q.setFromAxisAngle(V(0, 1, 0), i * 2.1), V(1, h, 1)));
    });
    flax.instanceMatrix.needsUpdate = true;

    const g = new THREE.Group();
    g.add(
      new THREE.Mesh(mergeAll(trunks), materials("trunk")),
      new THREE.Mesh(leaves.geometry(), materials("leaves")),
      new THREE.Mesh(willow.geometry(), materials("willow")),
      new THREE.Mesh(photinia.geometry(), materials("photinia")),
      flax,
    );
    return g;
  },
};
