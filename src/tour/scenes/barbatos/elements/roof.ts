import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";
import { slopePlanes } from "./slopes";

// Dos faldones de chapa (vuelan lo que diga `roof` en hastiales y aleros) + cielorraso.
export const roof: SceneElement<BarbatosLayout> = {
  id: "roof",
  group: "roof",
  build({ layout: l, primitives: P }) {
    const { hx, wallThickness: T, slopeLen } = l.hall;
    const { gableOverhang, eaveOverhang } = l.roof;
    const g = new THREE.Group();
    for (const { sz, rx, normal, center } of slopePlanes(l.hall)) {
      const sheet = P.box(2 * hx + 2 * gableOverhang, 0.1, slopeLen + 2 * eaveOverhang, "roof", [0, 0, 0], { rx });
      sheet.position.copy(center).addScaledVector(normal, 0.12).add(new THREE.Vector3(0, 0, sz * 0.12));
      g.add(sheet);
      const ceil = P.box(2 * hx - 2 * T, 0.04, slopeLen - 0.15, "ceiling", [0, 0, 0], { rx });
      ceil.position.copy(center).addScaledVector(normal, -0.22);
      g.add(ceil);
    }
    return g;
  },
};
