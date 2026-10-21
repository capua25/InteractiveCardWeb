import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { rng } from "@/tour/engine/textures";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

const CROWN_RADIUS_RATIO = 0.25; // radio de la copa de fondo respecto de su altura
const POPLAR = { radius: 0.9, lift: 0.3 };
const CONIFER = { radius: 1.8, lift: 1 };
const SAPLING = { trunkRadius: 0.06, trunkRatio: 0.55, crownRadius: 0.28, crownY: 0.72 };
const WILLOW = { trunkRadius: 0.18, trunkHeight: 2.2, crown: { rx: 2.4, ry: 1.4, y: 4.3 }, skirt: { y: 0.9, height: 3.3, scale: 1.4 } };
const PHOTINIA = { trunkRadius: 0.1, trunkHeight: 1.4, crownRadius: 1.3, crownY: 2.9 };
const PHORMIUM = { min: 1.4, max: 2.2, seed: 11 };

export interface BackgroundTree { x: number; z: number; height: number; radius: number }

/**
 * Árboles altos fuera del lote: la mayoría detrás del muro del fondo y el resto a los costados. El radio de la
 * copa es una fracción de la altura y los rangos lo dejan siempre fuera del rectángulo del lote.
 */
export function backgroundTrees(l: BarbatosLayout): BackgroundTree[] {
  const { seed, count, minHeight, maxHeight } = l.vegetation.background;
  const { zBack, zFront, halfWidth: hw } = l.lot;
  const R = rng(seed);
  const between = (a: number, b: number) => a + R() * (b - a);
  const tree = (x: number, z: number): BackgroundTree => {
    const height = between(minHeight, maxHeight);
    return { x, z, height, radius: height * CROWN_RADIUS_RATIO };
  };
  const behind = count - 8;
  const out: BackgroundTree[] = [];
  for (let i = 0; i < behind; i++) out.push(tree(between(-26, 26), between(zBack - 10, zBack - 4)));
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) out.push(tree(side * between(hw + 4, hw + 9), between(zBack, zFront)));
  }
  return out;
}

type Scale3 = [number, number, number];

// Acumula instancias (posición + escala por eje) de una geometría unitaria.
class Batch {
  private readonly m = new THREE.Matrix4();
  private readonly list: THREE.Matrix4[] = [];
  constructor(private readonly geo: THREE.BufferGeometry) {}
  add(x: number, y: number, z: number, [sx, sy, sz]: Scale3) {
    this.list.push(this.m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz)).clone());
  }
  mesh(material: THREE.Material): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(this.geo, material, this.list.length);
    this.list.forEach((mat, i) => mesh.setMatrixAt(i, mat));
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }
}

const unitCylinder = () => new THREE.CylinderGeometry(1, 1, 1, 6).translate(0, 0.5, 0); // base en y=0
const unitCone = (segments: number, radius = 1) => new THREE.ConeGeometry(radius, 1, segments).translate(0, 0.5, 0);

// Vegetación del parque en pocos draw calls: troncos, copas claras, copas oscuras, faldas de sauce, formios,
// fotinia (instanciados por tipo) y los árboles de fondo en un único mesh fusionado.
export const vegetation: SceneElement<BarbatosLayout> = {
  id: "vegetation",
  build({ layout: l, materials }) {
    const v = l.vegetation;
    const trunks = new Batch(unitCylinder());
    const lightCrowns = new Batch(new THREE.IcosahedronGeometry(1, 0));
    const darkCones = new Batch(unitCone(7));
    const skirts = new Batch(new THREE.CylinderGeometry(1.2, 2.2, 1, 8, 1, true).translate(0, 0.5, 0));
    const phormiums = new Batch(unitCone(5, 0.4));
    const photiniaCrown = new Batch(new THREE.IcosahedronGeometry(1, 0));

    for (const s of v.saplings) {
      const trunkH = s.height * SAPLING.trunkRatio;
      trunks.add(s.x, 0, s.z, [SAPLING.trunkRadius, trunkH, SAPLING.trunkRadius]);
      const r = s.height * SAPLING.crownRadius;
      lightCrowns.add(s.x, s.height * SAPLING.crownY, s.z, [r, r, r]);
    }
    for (const p of v.poplars) darkCones.add(p.x, POPLAR.lift, p.z, [POPLAR.radius, p.height, POPLAR.radius]);

    for (const w of v.willows) {
      trunks.add(w.x, 0, w.z, [WILLOW.trunkRadius, WILLOW.trunkHeight, WILLOW.trunkRadius]);
      lightCrowns.add(w.x, WILLOW.crown.y, w.z, [WILLOW.crown.rx, WILLOW.crown.ry, WILLOW.crown.rx]);
      skirts.add(w.x, WILLOW.skirt.y, w.z, [WILLOW.skirt.scale, WILLOW.skirt.height, WILLOW.skirt.scale]);
    }

    const c = v.conifer;
    trunks.add(c.x, 0, c.z, [0.2, CONIFER.lift + 0.5, 0.2]);
    darkCones.add(c.x, CONIFER.lift, c.z, [CONIFER.radius, c.height - CONIFER.lift, CONIFER.radius]);

    const ph = v.photinia;
    trunks.add(ph.x, 0, ph.z, [PHOTINIA.trunkRadius, PHOTINIA.trunkHeight, PHOTINIA.trunkRadius]);
    photiniaCrown.add(ph.x, PHOTINIA.crownY, ph.z, [PHOTINIA.crownRadius, PHOTINIA.crownRadius * 1.15, PHOTINIA.crownRadius]);

    const R = rng(PHORMIUM.seed);
    for (const f of v.phormiums) phormiums.add(f.x, 0, f.z, [1, PHORMIUM.min + R() * (PHORMIUM.max - PHORMIUM.min), 1]);

    const g = new THREE.Group();
    g.add(
      trunks.mesh(materials("trunk")),
      lightCrowns.mesh(materials("crownLight")),
      skirts.mesh(materials("crownLight")),
      darkCones.mesh(materials("crownDark")),
      phormiums.mesh(materials("phormium")),
      photiniaCrown.mesh(materials("photinia")),
    );

    // Fondo: copas icosaédricas achatadas por árbol, fusionadas sin troncos.
    const blob = new THREE.IcosahedronGeometry(1, 0).toNonIndexed();
    const parts = backgroundTrees(l).map((t) => {
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(t.x, t.height * 0.55, t.z),
        new THREE.Quaternion(),
        new THREE.Vector3(t.radius, t.height * 0.45, t.radius),
      );
      return blob.clone().applyMatrix4(m);
    });
    const merged = mergeGeometries(parts, false);
    if (merged) g.add(new THREE.Mesh(merged, materials("crownDark")));
    return g;
  },
};
