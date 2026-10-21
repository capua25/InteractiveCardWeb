import * as THREE from "three";
import type { Quality } from "../../types";
import type { BarbatosLayout } from "./layout";

// [intensidad, distancia] por point light, en el orden de layout.pointLights (frente, laterales, hogar, fondo).
const POINT_LIGHT_SPECS: readonly (readonly [number, number])[] = [[9, 9], [14, 16], [14, 16], [10, 8], [6, 12]];

const SUN_DIRECTION = new THREE.Vector3(6, 10, -44);

export function createLights(layout: BarbatosLayout, quality: Quality): THREE.Object3D[] {
  const hemi = new THREE.HemisphereLight("#ffd2a8", "#5a4634", 1.25);

  // sol bajo desde el oeste (detrás del salón): el frente queda en contraluz
  const sun = new THREE.DirectionalLight("#ffb36b", 3);
  // misma dirección de siempre (6, 10, -44) pero apuntando al centro del lote de 60 m
  const target = new THREE.Vector3(0, 0, layout.lot.centerZ);
  sun.target.position.copy(target);
  sun.position.copy(target).addScaledVector(SUN_DIRECTION, 1.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 20, bottom: -16, near: 5, far: 140 });
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
