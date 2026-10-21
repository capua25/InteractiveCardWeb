import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout, Segment } from "../layout";

// Zócalo de piedra: frente y fondo (cortados en puerta y ventanales) y hastial derecho.
export const plinth: SceneElement<BarbatosLayout> = {
  id: "plinth",
  build({ layout: l, primitives: P }) {
    const { hx, hz } = l.hall;
    const { height: zh, thickness: zt, front, back } = l.plinth;
    // cuánto sobresale el zócalo del muro: lo que pasa de la esquina el último tramo del frente
    const overhang = front[front.length - 1].x1 - hx;
    const g = new THREE.Group();
    const run = (segments: Segment[], z: number) => {
      for (const s of segments) g.add(P.box(s.x1 - s.x0, zh, zt, "stone", [(s.x0 + s.x1) / 2, zh / 2, z]));
    };
    run(front, hz - zt / 2 + overhang);
    run(back, -hz + zt / 2 - overhang);
    g.add(P.box(zt, zh, 2 * hz + 2 * overhang, "stone", [hx - zt / 2 + overhang, zh / 2, 0]));
    return g;
  },
};
