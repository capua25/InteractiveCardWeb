import * as THREE from "three";
import { UNIT } from "@/tour/engine/materials";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

const SIZE = 160; // plano de pasto que cubre todo el lote y el horizonte cercano

export const ground: SceneElement<BarbatosLayout> = {
  id: "ground",
  build({ layout: l, materials }) {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE);
    const uv = geo.attributes.uv;
    const unit = UNIT.grass ?? 1;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * SIZE) / unit, (uv.getY(i) * SIZE) / unit);
    const mesh = new THREE.Mesh(geo, materials("grass"));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.z = l.lot.centerZ;
    return mesh;
  },
};
