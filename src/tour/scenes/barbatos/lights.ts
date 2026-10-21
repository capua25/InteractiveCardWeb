import * as THREE from "three";
import type { Quality } from "../../types";
import type { BarbatosLayout } from "./layout";

// [intensidad, distancia] por point light, en el orden de layout.pointLights (frente, laterales, hogar, fondo).
const POINT_LIGHT_SPECS: readonly (readonly [number, number])[] = [[9, 9], [14, 16], [14, 16], [10, 8], [6, 12]];

export function createLights(layout: BarbatosLayout, quality: Quality): THREE.Object3D[] {
  const hemi = new THREE.HemisphereLight("#ffd2a8", "#5a4634", 1.25);

  // sol bajo desde el oeste (detrás del salón): el frente queda en contraluz
  const sun = new THREE.DirectionalLight("#ffb36b", 3);
  sun.position.set(6, 10, -48);
  sun.target.position.set(0, 0, -4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
  Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 18, bottom: -18, near: 5, far: 110 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;

  const points = layout.pointLights.map(([x, y, z], i) => {
    const [intensity, distance] = POINT_LIGHT_SPECS[i];
    const p = new THREE.PointLight("#ffb466", intensity, distance, 1.6);
    p.position.set(x, y, z);
    return p;
  });

  return [hemi, sun, sun.target, ...points];
}
