import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

// Piso interior de cemento + alfombra central.
export const floor: SceneElement<BarbatosLayout> = {
  id: "floor",
  build({ layout: l, primitives: P }) {
    const { hx, hz, wallThickness: T } = l.hall;
    const { x0, x1, width } = l.carpet;
    const g = new THREE.Group();
    g.add(P.box(2 * hx - 2 * T, 0.04, 2 * hz - 2 * T, "cement", [0, 0.02, 0]));
    g.add(P.box(x1 - x0, 0.03, width, "carpet", [(x0 + x1) / 2, 0.055, 0]));
    return g;
  },
};
