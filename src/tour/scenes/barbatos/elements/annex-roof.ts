import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

const SLAB = 0.12;
const EDGE_H = 0.08;
const EDGE_W = 0.04;

// Techo plano sin vuelo, con borde de chapa en los 4 lados.
export const annexRoof: SceneElement<BarbatosLayout> = {
  id: "annex-roof",
  group: "roof",
  build({ layout: l, primitives: P }) {
    const a = l.annex;
    const depth = a.zFront - a.zBack;
    const cz = (a.zFront + a.zBack) / 2;
    const g = new THREE.Group();
    g.add(P.box(a.width, SLAB, depth, "roof", [a.x, a.height + SLAB / 2, cz]));
    const ey = a.height + SLAB + EDGE_H / 2;
    const dx = (a.width - EDGE_W) / 2;
    const dz = (depth - EDGE_W) / 2;
    for (const s of [-1, 1]) {
      g.add(P.box(EDGE_W, EDGE_H, depth, "metal", [a.x + s * dx, ey, cz]));
      g.add(P.box(a.width - 2 * EDGE_W, EDGE_H, EDGE_W, "metal", [a.x, ey, cz + s * dz]));
    }
    return g;
  },
};
