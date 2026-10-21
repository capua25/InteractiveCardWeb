import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

// Pérgola del frente: columnas de 5 listones, vigas hasta el muro, viga transversal y travesaños.
export const pergola: SceneElement<BarbatosLayout> = {
  id: "pergola",
  build({ layout: l, primitives: P }) {
    const { hz } = l.hall;
    const { z: pz, height: ph, columnsX } = l.pergola;
    const midX = (columnsX[0] + columnsX[columnsX.length - 1]) / 2;
    const span = columnsX[columnsX.length - 1] - columnsX[0];
    const g = new THREE.Group();
    // vigas longitudinales: de 0.1 dentro del muro hasta 0.3 pasada la columna
    const beamZ0 = hz - 0.1;
    const beamZ1 = pz + 0.3;
    for (const cx of columnsX) {
      for (let k = 0; k < 5; k++) g.add(P.box(0.06, ph, 0.3, "metal", [cx - 0.24 + k * 0.12, ph / 2, pz]));
      g.add(P.box(0.16, 0.26, beamZ1 - beamZ0, "metal", [cx, ph + 0.13, (beamZ0 + beamZ1) / 2]));
    }
    g.add(P.box(span + 0.8, 0.22, 0.16, "metal", [midX, ph + 0.11, pz]));
    for (let k = 0; k < 7; k++) g.add(P.box(span + 0.4, 0.08, 0.08, "metal", [midX, ph + 0.3, hz + 0.3 + k * 0.48]));
    return g;
  },
};
