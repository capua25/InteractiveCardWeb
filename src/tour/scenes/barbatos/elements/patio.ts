import * as THREE from "three";
import { UNIT } from "@/tour/engine/materials";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

const GRAVEL_Y = 0.05; // misma cota que la cara superior del pedregullo anterior: 5 cm sobre el pasto, bajo el cemento

// Pedregullo (contorno curvo plano, UV en metros de mundo) + vereda hacia la pérgola + vereda a lo largo del frente.
export const patio: SceneElement<BarbatosLayout> = {
  id: "patio",
  build({ layout: l, materials, primitives: P }) {
    const { hx, hz } = l.hall;
    const g = new THREE.Group();
    // la forma vive en el plano XY con y = -z; rotada -π/2 en x queda acostada mirando a +y
    const shape = new THREE.Shape(l.forecourt.outline.map((p) => new THREE.Vector2(p.x, -p.z)));
    const geo = new THREE.ShapeGeometry(shape);
    const unit = UNIT.gravel ?? 1;
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / unit, uv.getY(i) / unit);
    const gravel = new THREE.Mesh(geo, materials("gravel"));
    gravel.rotation.x = -Math.PI / 2;
    gravel.position.y = GRAVEL_Y;
    g.add(gravel);
    // vereda de la puerta: del frente hasta pasar la pérgola
    const walkDepth = l.pergola.z - hz + 0.6;
    g.add(P.box(10, 0.1, walkDepth, "cement", [l.frontDoor.x, 0.06, hz + walkDepth / 2]));
    // vereda perimetral del frente, vuela 0.3 a cada lado del salón
    g.add(P.box(2 * hx + 0.6, 0.1, 0.9, "cement", [0, 0.05, hz + 0.45]));
    return g;
  },
};
