import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

// Hastiales en ±hx; el derecho (+x) con las ventanas a los lados del hogar.
export const gables: SceneElement<BarbatosLayout> = {
  id: "gables",
  build({ layout: l, primitives: P }) {
    const { hx, hz, wallHeight: WH, ridgeHeight: RH, wallThickness: T } = l.hall;
    const g = new THREE.Group();
    for (const sx of [1, -1]) {
      const s = new THREE.Shape();
      s.moveTo(-hz, 0);
      s.lineTo(hz, 0);
      s.lineTo(hz, WH);
      s.lineTo(0, RH);
      s.lineTo(-hz, WH);
      s.closePath();
      if (sx > 0) {
        for (const w of l.gableWindows) s.holes.push(P.rectHole(w.z - w.width / 2, w.sill, w.z + w.width / 2, w.sill + w.height));
      }
      const m = P.extrudeWall(s, T, "plaster");
      m.rotation.y = Math.PI / 2;
      m.position.set(sx > 0 ? hx - T : -hx, 0, 0);
      g.add(m);
    }
    for (const w of l.gableWindows) g.add(P.frame("x", w.z, hx - T / 2, w.sill, w.width, w.height, T));
    return g;
  },
};
