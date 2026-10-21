import * as THREE from "three";
import type { BuildContext, SceneElement } from "../types";

// Construye cada elemento registrado y lo cuelga de `root` o del grupo del techo (hijo de `root`).
export function assembleElements<L>(
  elements: readonly SceneElement<L>[],
  ctx: BuildContext<L>,
): { root: THREE.Group; roofGroup: THREE.Group; curtains: THREE.Object3D[] } {
  const root = new THREE.Group();
  const roofGroup = new THREE.Group();
  root.add(roofGroup);
  const curtains: THREE.Object3D[] = [];
  for (const element of elements) {
    const obj = element.build(ctx);
    obj.name ||= element.id;
    if (element.animates === "curtains") {
      obj.userData.noMerge = true;
      curtains.push(obj);
    }
    (element.group === "roof" ? roofGroup : root).add(obj);
  }
  return { root, roofGroup, curtains };
}
