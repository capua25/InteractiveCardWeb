import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

// Losa de cemento contra el zócalo del hastial +x con los equipos de aire acondicionado encima.
export const acUnits: SceneElement<BarbatosLayout> = {
  id: "ac-units",
  build({ layout: l, primitives: P }) {
    const { slab, units } = l.acUnits;
    const g = new THREE.Group();
    g.add(P.box(slab.w, slab.h, slab.d, "cement", [slab.x, slab.h / 2, slab.z]));
    for (const u of units) g.add(P.box(u.w, u.h, u.d, "acWhite", [u.x, u.y, u.z]));
    return g;
  },
};
