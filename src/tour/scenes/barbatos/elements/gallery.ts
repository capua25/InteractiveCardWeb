import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

// Galería trasera: piso de cemento, postes, viga y apliques del muro del fondo.
export const gallery: SceneElement<BarbatosLayout> = {
  id: "gallery",
  build({ layout: l, primitives: P }) {
    const { hx } = l.hall;
    const { zInner, zPosts, depth, postHeight, postsX } = l.gallery;
    const g = new THREE.Group();
    g.add(P.box(2 * hx, 0.12, depth, "cement", [0, 0.06, zInner - depth / 2]));
    for (const x of postsX) g.add(P.box(0.12, postHeight, 0.12, "metal", [x, postHeight / 2, zPosts]));
    g.add(P.box(2 * hx, 0.18, 0.14, "metal", [0, postHeight - 0.05, zPosts]));
    for (const x of l.backSconcesX) g.add(P.box(0.16, 0.24, 0.1, "sconce", [x, l.backSconceY, zInner - 0.06], { noShadow: true }));
    return g;
  },
};
