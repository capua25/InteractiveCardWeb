import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

const PILLAR = { size: 0.55, height: 1.9 };
const BAND = { height: 0.1, proud: 0.02, ys: [0.4, 0.85, 1.3] };

// Muro perimetral de bloques del lote (fondo, laterales y frente con la entrada abierta), dos pilares de
// piedra con hiladas de ladrillo flanqueando la entrada, y árboles con una copa compartida.
export const park: SceneElement<BarbatosLayout> = {
  id: "park",
  build({ layout: l, primitives: P, materials }) {
    const { zBack, zFront, halfWidth: hw, wallHeight: h, frontWallHeight: fh, wallThickness: t, entrance, frontSegments } = l.lot;
    const g = new THREE.Group();
    g.add(P.box(2 * hw + t, h, t, "wallLow", [0, h / 2, zBack]));
    for (const sx of [-1, 1]) g.add(P.box(t, h, zFront - zBack, "wallLow", [sx * hw, h / 2, (zBack + zFront) / 2]));
    for (const s of frontSegments) g.add(P.box(s.x1 - s.x0, fh, t, "wallLow", [(s.x0 + s.x1) / 2, fh / 2, zFront]));
    // pilares junto a la entrada: piedra gris oscura con hiladas de ladrillo (material plaster, terracota)
    for (const x of [entrance.x0 - PILLAR.size / 2, entrance.x1 + PILLAR.size / 2]) {
      g.add(P.box(PILLAR.size, PILLAR.height, PILLAR.size, "stone", [x, PILLAR.height / 2, zFront]));
      for (const y of BAND.ys) {
        const w = PILLAR.size + 2 * BAND.proud;
        g.add(P.box(w, BAND.height, w, "plaster", [x, y, zFront]));
      }
    }
    const crownGeo = new THREE.IcosahedronGeometry(1.6, 0);
    for (const tr of l.park.trees) {
      const s = tr.scale;
      g.add(P.cyl(0.18 * s, 2.4 * s, "trunk", [tr.x, 1.2 * s, tr.z], 8));
      const crown = new THREE.Mesh(crownGeo, materials("crown"));
      crown.position.set(tr.x, 3.5 * s, tr.z);
      crown.scale.setScalar(s);
      g.add(crown);
    }
    return g;
  },
};
