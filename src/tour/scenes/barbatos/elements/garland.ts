import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

const CABLE_RADIUS = 0.01;
const POLE_RADIUS = 0.05;

// Puntos de una curva con flecha `sag` de `a` a `b` en `steps` tramos. Incluye `a` y excluye `b`
// (el vértice siguiente abre el tramo vecino).
export function catenary(a: THREE.Vector3, b: THREE.Vector3, steps: number, sag: number, out: THREE.Vector3[]) {
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    out.push(p);
  }
}

// Guirnalda hexagonal alrededor del fogón: 6 postes en los vértices de la arena, un cable por lado
// (cerrando el hexágono) y bombitas instanciadas. Nada va hacia la galería.
export const garland: SceneElement<BarbatosLayout> = {
  id: "garland",
  build({ layout: l, primitives: P, materials }) {
    const { poles, poleHeight, hangY, sag, bulbSpacing } = l.park.garland;
    const g = new THREE.Group();
    for (const p of poles) g.add(P.cyl(POLE_RADIUS, poleHeight, "metal", [p.x, poleHeight / 2, p.z], 6));

    const bulbs: THREE.Vector3[] = [];
    const cable: THREE.Vector3[] = [];
    poles.forEach((p, k) => {
      const q = poles[(k + 1) % poles.length];
      const a = new THREE.Vector3(p.x, hangY, p.z);
      const b = new THREE.Vector3(q.x, hangY, q.z);
      const steps = Math.round(a.distanceTo(b) / bulbSpacing);
      catenary(a, b, steps, sag, bulbs);
      // cable: mismos puntos con el extremo incluido, para que el tubo cierre sobre el poste
      const seg: THREE.Vector3[] = [];
      catenary(a, b, steps, sag, seg);
      seg.push(b);
      cable.push(...seg.slice(k === 0 ? 0 : 1));
    });
    // un solo tubo continuo por todos los puntos (1 draw call, mergeable con el resto del metal)
    const curve = new THREE.CatmullRomCurve3(cable, false, "centripetal");
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, cable.length * 2, CABLE_RADIUS, 4, false), materials("metal")));

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
