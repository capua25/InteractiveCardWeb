import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

// Chimenea de piedra contra el hastial derecho: hogar, fuego, repisa y caño metálico con sombrero y babeta.
export const chimney: SceneElement<BarbatosLayout> = {
  id: "chimney",
  build({ layout: l, primitives: P }) {
    const c = l.chimney;
    const f = c.flue;
    const g = new THREE.Group();
    g.add(P.box(c.depth, c.height, c.width, "stone", [c.x, c.height / 2, 0]));
    g.add(P.box(0.06, 1.0, 1.4, "hearth", [c.hearthX, 0.95, 0], { noShadow: true }));
    g.add(P.box(0.3, 0.35, 0.8, "fire", [c.hearthX + 0.17, 0.6, 0], { noShadow: true }));
    g.add(P.box(0.3, 0.12, 3.0, "wood", [c.hearthX - 0.08, 1.75, 0]));
    g.add(P.cyl(f.radius, f.top - f.base, "metal", [f.x, (f.top + f.base) / 2, 0]));
    g.add(P.cyl(f.radius + 0.18, 0.08, "metal", [f.x, f.top + 0.15, 0])); // sombrero
    g.add(P.cyl(f.radius + 0.02, 0.3, "metal", [f.x, f.top + 0.35, 0]));
    g.add(P.cyl(f.radius + 0.28, 0.06, "metal", [f.x, l.hall.ridgeHeight + 0.25, 0])); // babeta sobre la cumbrera
    return g;
  },
};
