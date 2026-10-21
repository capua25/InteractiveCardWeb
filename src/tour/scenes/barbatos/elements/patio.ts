import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

// Pedregullo + vereda hacia la pérgola + vereda a lo largo del frente.
export const patio: SceneElement<BarbatosLayout> = {
  id: "patio",
  build({ layout: l, primitives: P }) {
    const { hx, hz } = l.hall;
    const g = new THREE.Group();
    g.add(P.box(l.patio.width, 0.05, l.patio.depth, "gravel", [l.patio.x, 0.025, l.patio.z]));
    // vereda de la puerta: del frente hasta pasar la pérgola
    const walkDepth = l.pergola.z - hz + 0.6;
    g.add(P.box(10, 0.1, walkDepth, "cement", [l.frontDoor.x, 0.06, hz + walkDepth / 2]));
    // vereda perimetral del frente, vuela 0.3 a cada lado del salón
    g.add(P.box(2 * hx + 0.6, 0.1, 0.9, "cement", [0, 0.05, hz + 0.45]));
    return g;
  },
};
