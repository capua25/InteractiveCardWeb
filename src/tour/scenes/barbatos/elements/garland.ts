import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";
import { GALLERY_POST_HEIGHT } from "./gallery";

const POLE_HEIGHT = 3.3;
const HANG_Y = POLE_HEIGHT - 0.1; // altura de enganche en el poste

// Bombitas a lo largo de una curva con flecha `sag`, de `a` a `b`, en `steps` tramos.
function catenary(a: THREE.Vector3, b: THREE.Vector3, steps: number, sag: number, out: THREE.Vector3[]) {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    out.push(p);
  }
}

// Guirnalda del parque: postes + cables desde la viga de la galería y entre postes, bombitas instanciadas.
export const garland: SceneElement<BarbatosLayout> = {
  id: "garland",
  build({ layout: l, primitives: P, materials }) {
    const { z: poleZ, polesX } = l.park.garland;
    const g = new THREE.Group();
    const bulbs: THREE.Vector3[] = [];
    for (const x of polesX) {
      g.add(P.cyl(0.05, POLE_HEIGHT, "metal", [x, POLE_HEIGHT / 2, poleZ], 6));
      const a = new THREE.Vector3(x, GALLERY_POST_HEIGHT - 0.1, l.gallery.zPosts);
      catenary(a, new THREE.Vector3(x + 2.5, HANG_Y, poleZ), 16, 0.7, bulbs);
    }
    for (let i = 0; i < polesX.length - 1; i++) {
      catenary(new THREE.Vector3(polesX[i], HANG_Y, poleZ), new THREE.Vector3(polesX[i + 1], HANG_Y, poleZ), 14, 0.6, bulbs);
    }
    const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 6, 4), materials("bulb"), bulbs.length);
    mesh.userData.noShadow = true;
    const tmp = new THREE.Object3D();
    bulbs.forEach((p, i) => {
      tmp.position.copy(p);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    });
    g.add(mesh);
    return g;
  },
};
