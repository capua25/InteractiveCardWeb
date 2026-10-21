import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";
import { sconce } from "./sconce";

// Galería trasera: piso de cemento, postes, viga gruesa, rollos de cortina y apliques del muro del fondo.
export const gallery: SceneElement<BarbatosLayout> = {
  id: "gallery",
  build({ layout: l, primitives: P }) {
    const { hx } = l.hall;
    const { zInner, zPosts, depth, postHeight, fasciaHeight, postsX, curtains } = l.gallery;
    const { topY, rollRadius } = curtains;
    const g = new THREE.Group();
    g.add(P.box(2 * hx, 0.12, depth, "cement", [0, 0.06, zInner - depth / 2]));
    for (const x of postsX) g.add(P.box(0.12, postHeight, 0.12, "metal", [x, postHeight / 2, zPosts]));
    g.add(P.box(2 * hx, fasciaHeight, 0.16, "metal", [0, postHeight - fasciaHeight / 2, zPosts]));
    // Rollos de lona (estáticos): uno por tramo, con el eje a lo largo de x.
    for (const bay of curtains.bays) {
      const roll = P.cyl(rollRadius, bay.x1 - bay.x0, "canvas", [(bay.x0 + bay.x1) / 2, topY - rollRadius, curtains.z]);
      roll.rotation.z = Math.PI / 2;
      g.add(roll);
    }
    for (const x of l.backSconcesX) g.add(sconce(P, [x, l.backSconceY, zInner], "-z"));
    return g;
  },
};
