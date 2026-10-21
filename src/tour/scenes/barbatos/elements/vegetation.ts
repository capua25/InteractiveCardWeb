import * as THREE from "three";
import { addColumn, addCrown, addStar, CardBuilder, limb, mergeAll } from "@/tour/engine/cards";
import { FLAX_ATLAS } from "@/tour/engine/foliage-textures";
import { rng } from "@/tour/engine/textures";
import type { GeometryDetail, SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

// álamos contra el muro −x: columnas anchas que se tocan con las vecinas (cortina continua, como en las fotos). El
// jitter de ancho es chico para que el follaje no pase el muro; el de alto da la silueta despareja.
const POPLAR = {
  card: 0.94, // lado base de las tarjetas (con ±`cardJitter` por árbol)
  footprint: { x: 1.0, alongWall: 1.3, backWallGap: 0.5 }, // huella elíptica real del follaje (semiejes, m)
  lift: 0.3, seed: 5, cardJitter: 0.06, heightJitter: 0.15, foliageFrom: 0.25,
};
// fila del muro del fondo: columnas finas; la huella del follaje es `reach`·radio del layout
const WALL_ROW = { reach: 1.26, foliageFrom: 0.45, cardRatio: 1.3 };
const SAPLING = { trunkRadius: 0.06, crownRadius: 0.22 };
const WILLOW = { trunkRadius: 0.11, trunkHeight: 1.2, crown: { rx: 1.2, ry: 0.8, y: 2.3 }, skirt: { y: 0.5, height: 2, scale: 0.7 } };
const PHOTINIA = { stems: 5, stemRadius: 0.05, crownRadius: 1.3, tipSpread: 0.55, foliageFrom: 0.4 }; // foliageFrom: fracción del alto
const PHORMIUM = { min: 1.4, max: 2.2, seed: 11, width: 0.8, variegated: [0] as readonly number[] }; // índices variegados (verde/amarillo)
const SEED = 23;

/** Huella en planta de una copa: elipse de semiejes `rx`, `rz`; `radius` es el círculo conservador (el mayor). */
export type Crown = { x: number; z: number; rx: number; rz: number; radius: number; kind: "poplar" | "wallRow" | "other" };
const circle = (x: number, z: number, r: number): Crown => ({ x, z, rx: r, rz: r, radius: r, kind: "other" });

/** Huella elíptica de un álamo: hasta 1.3 m a lo largo del muro (menos el último, que no se mete en el muro del
 * fondo) y 1 m de ancho. `addColumn` garantiza que ninguna tarjeta sale de ella. */
export function poplarFootprint(l: BarbatosLayout, z: number): { rx: number; rz: number } {
  const f = POPLAR.footprint;
  return { rx: f.x, rz: Math.min(f.alongWall, z - l.lot.zBack - f.backWallGap) };
}

/** Huella de cada copa dentro del lote, para chequear despejes. Álamos y fila del fondo son exactas (su geometría
 * nunca sale de la elipse); el resto son radios de diseño. */
export function treeCrowns(l: BarbatosLayout): Crown[] {
  const v = l.vegetation;
  return [
    ...v.saplings.map((s) => circle(s.x, s.z, s.height * SAPLING.crownRadius)),
    ...v.tallSaplings.map((t) => circle(t.x, t.z, t.radius)),
    ...v.wallRow.map((w): Crown => ({ ...circle(w.x, w.z, w.radius * WALL_ROW.reach), kind: "wallRow" })),
    ...v.poplars.map((p): Crown => {
      const { rx, rz } = poplarFootprint(l, p.z);
      return { x: p.x, z: p.z, rx, rz, radius: Math.max(rx, rz), kind: "poplar" };
    }),
    ...v.phormiums.map((p) => circle(p.x, p.z, PHORMIUM.width / 2)),
    ...v.willows.map((w) => circle(w.x, w.z, WILLOW.skirt.scale * 2.2)),
    circle(v.photinia.x, v.photinia.z, PHOTINIA.crownRadius),
  ];
}

// Tarjetas por planta y segmentos de tronco según el nivel de detalle. Cambia triángulos y textura (512/256 px),
// nunca la cantidad de meshes: cada especie va en un solo mesh (o InstancedMesh) por material.
// En celulares hay menos tarjetas pero más grandes (`scale`), para que las copas se vean igual de llenas.
export const CARDS = {
  high: { sapling: 14, tall: 30, poplar: 64, wallRow: 24, willowDome: 16, willowSkirt: 26, photinia: 44, phormium: 4, trunk: 7, branches: 3, scale: 1 },
  low: { sapling: 9, tall: 18, poplar: 40, wallRow: 15, willowDome: 10, willowSkirt: 16, photinia: 26, phormium: 3, trunk: 5, branches: 2, scale: 1.15 },
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

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

// Arbolito joven: tallo fino y tarjetas chicas repartidas en espiral a lo largo de los 2/3 de arriba, cada una con
// su ramita (no una bola sobre un palo).
function sapling(trunks: THREE.BufferGeometry[], leaves: CardBuilder, x: number, z: number, height: number, r: number, cards: number, segs: number, scale: number, R: () => number) {
  trunks.push(limb(V(x, 0, z), V(x, height * 0.97, z), SAPLING.trunkRadius * 0.75, SAPLING.trunkRadius * 0.2, segs));
  const phase = R() * Math.PI * 2;
  for (let k = 0; k < cards; k++) {
    const t = (k + 0.5) / cards;
    const y = height * (1 / 3 + (2 / 3) * t) - r * 0.35 * t;
    const a = phase + k * GOLDEN + (R() - 0.5) * 0.5;
    const out = V(Math.cos(a), 0, Math.sin(a));
    const reach = r * (0.3 + 0.3 * R()) * (1 - 0.35 * t);
    const center = V(x, y, z).addScaledVector(out, reach);
    trunks.push(limb(V(x, y - reach * 0.6, z), center, 0.012, 0.006, 3));
    const size = r * (1.3 - 0.35 * t) * (0.85 + R() * 0.3) * scale;
    leaves.add({ center, normal: out.clone().setY(0.35), up: V(0, 1, 0).applyAxisAngle(out, (R() - 0.5) * 1.2), width: size, height: size, bendFrom: V(x, y - 0.2, z), bend: 0.7 });
  }
}

// Fotinia: arbusto de varios tallos que se abren hacia arriba, con hojas rojas en los 2/3 superiores (no una bola).
function photiniaShrub(trunks: THREE.BufferGeometry[], b: CardBuilder, x: number, z: number, height: number, cards: number, segs: number, scale: number, R: () => number) {
  const P = PHOTINIA;
  const phase = R() * Math.PI * 2;
  const stems = Array.from({ length: P.stems }, (_, i) => {
    const a = phase + (i / P.stems) * Math.PI * 2 + (R() - 0.5) * 0.4;
    const base = V(x + Math.cos(a) * 0.08, 0, z + Math.sin(a) * 0.08);
    const tip = V(x + Math.cos(a) * P.tipSpread, height * (0.88 + R() * 0.1), z + Math.sin(a) * P.tipSpread);
    trunks.push(limb(base, tip, P.stemRadius, P.stemRadius * 0.3, segs));
    return { base, tip };
  });
  for (let k = 0; k < cards; k++) {
    const { base, tip } = stems[k % P.stems];
    const t = P.foliageFrom + (1 - P.foliageFrom) * ((Math.floor(k / P.stems) + R()) / Math.ceil(cards / P.stems));
    const onStem = base.clone().lerp(tip, t);
    const a = Math.atan2(onStem.z - z, onStem.x - x) + (R() - 0.5) * 1.6;
    const out = V(Math.cos(a), 0, Math.sin(a));
    const center = onStem.clone().addScaledVector(out, 0.1 + R() * 0.3);
    const size = (1.15 + R() * 0.3) * scale;
    b.add({ center, normal: out.clone().setY(0.3), up: V(0, 1, 0).applyAxisAngle(out, (R() - 0.5) * 1.2), width: size, height: size * 1.1, bendFrom: V(x, center.y - 0.4, z), bend: 0.7 });
  }
}

// Vegetación del parque en 5 draw calls: troncos y ramas (un mesh), hojas de los árboles (un mesh de tarjetas), sauces
// (cúpula y falda de hebras colgantes), fotinia y formios. Fuera del muro no hay árboles.
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

    for (const s of v.saplings) sapling(trunks, leaves, s.x, s.z, s.height, s.height * SAPLING.crownRadius, C.sapling, C.trunk, C.scale, R);
    for (const t of v.tallSaplings) {
      const r = t.radius;
      const crown = V(t.x, t.height - r, t.z);
      const tr = SAPLING.trunkRadius * 1.6;
      trunks.push(limb(V(t.x, 0, t.z), V(t.x, crown.y + r * 0.3, t.z), tr, tr * 0.3, C.trunk));
      branches(trunks, t.x, t.z, crown.y - r * 0.9, crown, r * 0.55, C.branches + 1, tr * 0.5, C.trunk, R);
      addCrown(leaves, { center: crown, radii: V(r * 0.95, r * 1.2, r * 0.95), count: C.tall, size: r * 1.25 * C.scale, shell: 0.45 }, R);
    }
    for (const w of v.wallRow) {
      const top = POPLAR.lift + w.height;
      trunks.push(limb(V(w.x, 0, w.z), V(w.x, top * 0.8, w.z), 0.035, 0.012, C.trunk));
      addColumn(leaves, { base: V(w.x, 0, w.z), from: WALL_ROW.foliageFrom, to: top, radius: w.radius * WALL_ROW.reach, count: C.wallRow, size: w.radius * WALL_ROW.cardRatio }, R);
    }
    const J = rng(POPLAR.seed);
    for (const p of v.poplars) {
      const card = POPLAR.card * (1 - POPLAR.cardJitter + 2 * POPLAR.cardJitter * J());
      const h = p.height * (1 - POPLAR.heightJitter + 2 * POPLAR.heightJitter * J());
      // follaje desde ~0.4 m del pasto hasta la punta (columna), como los álamos de la foto
      const top = POPLAR.lift + h;
      trunks.push(limb(V(p.x, 0, p.z), V(p.x, POPLAR.lift + h * 0.7, p.z), 0.055, 0.02, C.trunk));
      // ovalada a lo largo del muro (z) para tocarse con las vecinas; la última no se mete en el muro del fondo
      const { rx, rz } = poplarFootprint(l, p.z);
      addColumn(leaves, { base: V(p.x, 0, p.z), from: POPLAR.foliageFrom, to: top, radius: rx, radiusZ: rz, count: C.poplar, size: card * 1.1 * C.scale }, R);
    }

    for (const t of v.willows) {
      const c = WILLOW.crown;
      const crown = V(t.x, c.y, t.z);
      trunks.push(limb(V(t.x, 0, t.z), V(t.x, c.y + c.ry * 0.3, t.z), WILLOW.trunkRadius, WILLOW.trunkRadius * 0.4, C.trunk));
      branches(trunks, t.x, t.z, WILLOW.trunkHeight, crown, c.rx * 0.6, C.branches, WILLOW.trunkRadius * 0.45, C.trunk, R);
      // cúpula y falda con la MISMA textura de hebras (un solo árbol, no hojas arriba y hebras abajo). Las tarjetas de
      // la cúpula quedan casi paradas (flatten bajo): desde arriba se ven hebras que caen, no una capa de paja acostada
      addCrown(willow, { center: crown, radii: V(c.rx, c.ry, c.rx), count: C.willowDome, size: 1.2 * C.scale, aspect: 1.2, shell: 0.55, minY: 0, flatten: 0.2 }, R);
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
          normal, up: V(-Math.cos(a) * 0.12, 1, -Math.sin(a) * 0.12), width: 0.95 * C.scale, height: hh, bendFrom: V(t.x, c.y - 0.6, t.z), bend: 0.6,
        });
      }
    }

    const ph = v.photinia;
    photiniaShrub(trunks, photinia, ph.x, ph.z, ph.height, C.photinia, C.trunk, C.scale, R);

    // formios: estrellas de tarjetas por planta en un solo mesh; cada una toma su variedad del atlas (bronce o
    // variegado), con alto y giro propios
    const F = rng(PHORMIUM.seed);
    const flax = new CardBuilder();
    v.phormiums.forEach((f, i) => {
      const h = PHORMIUM.min + F() * (PHORMIUM.max - PHORMIUM.min);
      const uv = PHORMIUM.variegated.includes(i) ? FLAX_ATLAS.variegated : FLAX_ATLAS.bronze;
      addStar(flax, V(f.x, 0, f.z), C.phormium, PHORMIUM.width, h, i * 2.1, 0.6, uv);
    });

    const g = new THREE.Group();
    g.add(
      new THREE.Mesh(mergeAll(trunks), materials("trunk")),
      new THREE.Mesh(leaves.geometry(), materials("leaves")),
      new THREE.Mesh(willow.geometry(), materials("willow")),
      new THREE.Mesh(photinia.geometry(), materials("photinia")),
      new THREE.Mesh(flax.geometry(), materials("phormium")),
    );
    return g;
  },
};
