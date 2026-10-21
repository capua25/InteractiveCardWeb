import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

// Hogar interior de piedra contra el hastial derecho (fuego y repisa) y, por fuera del hastial, el bloque
// exterior de piedra con tapa de cemento, el caño metálico y su sombrero.
export const chimney: SceneElement<BarbatosLayout> = {
  id: "chimney",
  build({ layout: l, primitives: P }) {
    const c = l.chimney;
    const s = c.stack;
    const f = c.flue;
    const g = new THREE.Group();
    g.add(P.box(c.depth, c.height, c.width, "stone", [c.x, c.height / 2, 0]));
    g.add(P.box(0.06, 1.0, 1.4, "hearth", [c.hearthX, 0.95, 0], { noShadow: true }));
    g.add(P.box(0.3, 0.35, 0.8, "fire", [c.hearthX + 0.17, 0.6, 0], { noShadow: true }));
    g.add(P.box(0.3, 0.12, 3.0, "wood", [c.hearthX - 0.08, 1.75, 0]));
    g.add(P.box(s.depth, s.height, s.width, "stone", [s.x, s.height / 2, 0]));
    g.add(P.box(s.depth + 0.06, 0.06, s.width + 0.06, "cement", [s.x, s.height + 0.03, 0])); // tapa
    g.add(P.cyl(f.radius, f.top - f.base, "metal", [f.x, (f.top + f.base) / 2, 0]));
    g.add(P.cyl(f.capRadius, 0.08, "metal", [f.x, f.top + 0.1, 0])); // sombrero
    return g;
  },
};
