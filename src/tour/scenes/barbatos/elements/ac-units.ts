import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

// Equipos de aire acondicionado contra el zócalo del hastial +x, cada uno sobre su losa de cemento.
export const acUnits: SceneElement<BarbatosLayout> = {
  id: "ac-units",
  build({ layout: l, primitives: P }) {
    const { pads, units } = l.acUnits;
    const g = new THREE.Group();
    for (const p of pads) g.add(P.box(p.w, p.h, p.d, "cement", [p.x, p.h / 2, p.z]));
    for (const u of units) g.add(P.box(u.w, u.h, u.d, "acWhite", [u.x, u.y, u.z]));
    return g;
  },
};
