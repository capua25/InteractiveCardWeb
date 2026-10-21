import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

// Muro perimetral del parque (fondo + laterales) y árboles con una copa compartida.
export const park: SceneElement<BarbatosLayout> = {
  id: "park",
  build({ layout: l, primitives: P, materials }) {
    const { zStart, z, halfWidth: yx, height: h } = l.park.wall;
    const g = new THREE.Group();
    g.add(P.box(2 * yx, h, 0.25, "wallLow", [0, h / 2, z]));
    for (const sx of [-1, 1]) g.add(P.box(0.25, h, zStart - z, "wallLow", [sx * yx, h / 2, (zStart + z) / 2]));
    const crownGeo = new THREE.IcosahedronGeometry(1.6, 0);
    for (const t of l.park.trees) {
      const s = t.scale;
      g.add(P.cyl(0.18 * s, 2.4 * s, "trunk", [t.x, 1.2 * s, t.z], 8));
      const crown = new THREE.Mesh(crownGeo, materials("crown"));
      crown.position.set(t.x, 3.5 * s, t.z);
      crown.scale.setScalar(s);
      g.add(crown);
    }
    return g;
  },
};
