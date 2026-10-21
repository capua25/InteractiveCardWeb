import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

export const GALLERY_POST_HEIGHT = 3;
const POST_INSET = 0.1; // el poste queda a 0.1 por fuera del borde del piso
const SCONCE_Y = 2.6;

// Galería trasera: piso de cemento, postes, viga y apliques del muro del fondo.
export const gallery: SceneElement<BarbatosLayout> = {
  id: "gallery",
  build({ layout: l, primitives: P }) {
    const { hx } = l.hall;
    const { zInner, zPosts, postsX } = l.gallery;
    const depth = zInner - zPosts - POST_INSET;
    const g = new THREE.Group();
    g.add(P.box(2 * hx, 0.12, depth, "cement", [0, 0.06, zInner - depth / 2]));
    for (const x of postsX) g.add(P.box(0.12, GALLERY_POST_HEIGHT, 0.12, "metal", [x, GALLERY_POST_HEIGHT / 2, zPosts]));
    g.add(P.box(2 * hx, 0.18, 0.14, "metal", [0, GALLERY_POST_HEIGHT - 0.05, zPosts]));
    for (const x of l.backSconcesX) g.add(P.box(0.16, 0.24, 0.1, "sconce", [x, SCONCE_Y, zInner - 0.06], { noShadow: true }));
    return g;
  },
};
