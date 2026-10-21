import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { CURTAIN_ROLLED_SCALE } from "@/tour/engine/curtains";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

const BAY_GAP = 0.04; // separación entre paños contiguos

// Cortinas de la galería: un grupo cuyo origen es el eje de los rollos (borde superior del nylon).
// scale.y lo enrolla/desenrolla hacia arriba; arranca enrollado (galería abierta). Nylon y faldón de
// lona son un mesh cada uno (un draw call por material); sin sombras y sin merge (se anima).
export const galleryCurtains: SceneElement<BarbatosLayout> = {
  id: "gallery-curtains",
  animates: "curtains",
  build({ layout: l, materials }) {
    const { bays, end, z, topY, skirtHeight, rollRadius } = l.gallery.curtains;
    const rollY = topY - rollRadius;
    const nylonH = rollY - skirtHeight;

    // Un plano por tramo, con el borde superior en y = yTop, ya trasladado a su x y z.
    // Además de los tramos del lado largo (z = const), los del cierre del extremo +x (x = const).
    const panels = (height: number, yTop: number) =>
      mergeGeometries([
        ...bays.map((b) => {
          const geo = new THREE.PlaneGeometry(b.x1 - b.x0 - BAY_GAP, height);
          return geo.translate((b.x0 + b.x1) / 2, yTop - height / 2, z);
        }),
        ...end.bays.map((b) => {
          const geo = new THREE.PlaneGeometry(b.z0 - b.z1 - BAY_GAP, height);
          return geo.rotateY(Math.PI / 2).translate(end.x, yTop - height / 2, (b.z0 + b.z1) / 2);
        }),
      ])!;

    const nylon = new THREE.Mesh(panels(nylonH, 0), materials("nylon"));
    const canvas = new THREE.Mesh(panels(skirtHeight, -nylonH), materials("canvas"));
    nylon.userData.noShadow = true;
    canvas.userData.noShadow = true;

    const group = new THREE.Group();
    group.add(nylon, canvas);
    group.position.set(0, rollY, 0);
    group.scale.y = CURTAIN_ROLLED_SCALE;
    group.userData.noMerge = true;
    return group;
  },
};
