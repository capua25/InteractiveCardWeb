import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

// Muro del fondo (-z): ventanales hacia la galería con marcos en cuadrícula.
export const backWall: SceneElement<BarbatosLayout> = {
  id: "back-wall",
  build({ layout: l, primitives: P }) {
    const { hx, hz, wallHeight: WH, wallThickness: T } = l.hall;
    const g = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(-hx, 0);
    s.lineTo(hx, 0);
    s.lineTo(hx, WH);
    s.lineTo(-hx, WH);
    s.closePath();
    for (const w of l.backWindows) s.holes.push(P.rectHole(w.x - w.width / 2, w.sill, w.x + w.width / 2, w.sill + w.height));
    const wall = P.extrudeWall(s, T, "plaster");
    wall.position.z = -hz;
    g.add(wall);
    const { cols, rows } = l.backWindowGrid;
    for (const w of l.backWindows) g.add(P.frame("z", w.x, -hz + T / 2, w.sill, w.width, w.height, T, { cols, rows }));
    return g;
  },
};
