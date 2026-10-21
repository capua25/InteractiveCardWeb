import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

// Muro del frente (+z): contorno con muesca de puerta, huecos de ventanas, marcos y apliques.
export const frontWall: SceneElement<BarbatosLayout> = {
  id: "front-wall",
  build({ layout: l, primitives: P }) {
    const { hx, hz, wallHeight: WH, wallThickness: T } = l.hall;
    const d = l.frontDoor;
    const g = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(-hx, 0);
    s.lineTo(d.x - d.width / 2, 0);
    s.lineTo(d.x - d.width / 2, d.height);
    s.lineTo(d.x + d.width / 2, d.height);
    s.lineTo(d.x + d.width / 2, 0);
    s.lineTo(hx, 0);
    s.lineTo(hx, WH);
    s.lineTo(-hx, WH);
    s.closePath();
    for (const w of l.frontWindows) s.holes.push(P.rectHole(w.x - w.width / 2, w.sill, w.x + w.width / 2, w.sill + w.height));
    const wall = P.extrudeWall(s, T, "plaster");
    wall.position.z = hz - T;
    g.add(wall);
    for (const w of l.frontWindows) g.add(P.frame("z", w.x, hz - T / 2, w.sill, w.width, w.height, T));
    g.add(P.frame("z", d.x, hz - T / 2, d.sill, d.width, d.height, T, { door: true }));
    for (const sc of l.frontSconces) g.add(P.box(0.18, 0.28, 0.12, "sconce", [sc.x, sc.y, hz + 0.06], { noShadow: true }));
    return g;
  },
};
