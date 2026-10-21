import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";
import { slopePlanes } from "./slopes";

// Cerchas metálicas: pares inclinados bajo cada faldón, tirante y pendolón. Quedan visibles con "Sin techo".
export const trusses: SceneElement<BarbatosLayout> = {
  id: "trusses",
  build({ layout: l, primitives: P }) {
    const { hz, wallHeight: WH, ridgeHeight: RH, wallThickness: T, slopeLen } = l.hall;
    const g = new THREE.Group();
    for (const { rx, normal, center } of slopePlanes(l.hall)) {
      for (const x of l.trussesX) {
        const b = P.box(0.14, 0.22, slopeLen - 0.4, "metal", [0, 0, 0], { rx });
        b.position.copy(center).addScaledVector(normal, -0.42);
        b.position.x = x;
        g.add(b);
      }
    }
    const kingPost = RH - WH - 0.6;
    for (const x of l.trussesX) {
      g.add(P.box(0.14, 0.2, 2 * hz - 2 * T, "metal", [x, WH - 0.1, 0]));
      g.add(P.box(0.14, kingPost, 0.14, "metal", [x, WH + kingPost / 2, 0]));
    }
    return g;
  },
};
