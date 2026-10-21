import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

// Anexo de piedra a la izquierda del salón + rectángulo oscuro (abertura) en su frente.
export const annex: SceneElement<BarbatosLayout> = {
  id: "annex",
  build({ layout: l, primitives: P }) {
    const a = l.annex;
    const depth = a.zFront - a.zBack;
    const g = new THREE.Group();
    g.add(P.box(a.width, a.height, depth, "stone", [a.x, a.height / 2, (a.zFront + a.zBack) / 2]));
    g.add(P.box(1.4, 1.2, 0.04, "hearth", [a.x, 1.8, a.zFront + 0.02]));
    return g;
  },
};
