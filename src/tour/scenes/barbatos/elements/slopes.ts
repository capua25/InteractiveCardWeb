import * as THREE from "three";
import type { BarbatosLayout } from "../layout";

// Plano de cada faldón (sz = +1 frente, -1 fondo): rotación, normal y centro a media pendiente.
export function slopePlanes(hall: BarbatosLayout["hall"]) {
  return [1, -1].map((sz) => ({
    sz,
    rx: sz * hall.slope,
    normal: new THREE.Vector3(0, Math.cos(hall.slope), sz * Math.sin(hall.slope)),
    center: new THREE.Vector3(0, (hall.ridgeHeight + hall.wallHeight) / 2, (sz * hall.hz) / 2),
  }));
}
