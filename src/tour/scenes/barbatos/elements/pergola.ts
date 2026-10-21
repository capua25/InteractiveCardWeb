import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

// Pérgola del frente: columnas de 8 listones, dos vigas paralelas al frente y lamas que corren hacia el muro.
export const pergola: SceneElement<BarbatosLayout> = {
  id: "pergola",
  build({ layout: l, primitives: P }) {
    const { hz } = l.hall;
    const { z: pz, height: ph, columnsX } = l.pergola;
    const midX = (columnsX[0] + columnsX[columnsX.length - 1]) / 2;
    const span = columnsX[columnsX.length - 1] - columnsX[0];
    const beamLength = span + 0.8;
    const g = new THREE.Group();
    for (const cx of columnsX) {
      for (let k = 0; k < 8; k++) g.add(P.box(0.05, ph, 0.1, "metal", [cx + (k - 3.5) * 0.09, ph / 2, pz]));
    }
    g.add(P.box(beamLength, 0.2, 0.12, "metal", [midX, ph + 0.1, hz + 0.15]));
    g.add(P.box(beamLength, 0.2, 0.12, "metal", [midX, ph + 0.1, pz]));
    const lamaZ0 = hz + 0.1;
    const lamaZ1 = pz + 0.1;
    const count = Math.floor(beamLength / 0.12) + 1;
    const x0 = midX - ((count - 1) * 0.12) / 2;
    for (let k = 0; k < count; k++) g.add(P.box(0.03, 0.1, lamaZ1 - lamaZ0, "metal", [x0 + k * 0.12, ph + 0.25, (lamaZ0 + lamaZ1) / 2]));
    return g;
  },
};
