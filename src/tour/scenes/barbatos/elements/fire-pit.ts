import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

const SAND_Y = 0.02;
const HEARTH_RADIUS = 0.95;
const BASKET_HEIGHT = 0.35;
const LOG = { radius: 0.06, length: 0.7 };

// Fogón: arena hexagonal (los 6 vértices reciben los postes de la guirnalda), aro de piedra, disco de brasa,
// canasto de metal abierto con cuatro leños cruzados y brasas encendidas.
export const firePit: SceneElement<BarbatosLayout> = {
  id: "fire-pit",
  build({ layout, primitives: P, materials }) {
    const { x, z, ringRadius, ringHeight, basketRadius, sandRadius } = layout.firePit;
    const g = new THREE.Group();

    const sand = new THREE.Mesh(new THREE.CircleGeometry(sandRadius, 6), materials("sand"));
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(x, SAND_Y, z);
    sand.userData.noShadow = true;
    g.add(sand);

    g.add(P.cyl(ringRadius, ringHeight, "gabion", [x, ringHeight / 2, z], 20));

    const hearthY = ringHeight + 0.005;
    const hearth = new THREE.Mesh(new THREE.CircleGeometry(HEARTH_RADIUS, 20), materials("hearth"));
    hearth.rotation.x = -Math.PI / 2;
    hearth.position.set(x, hearthY, z);
    hearth.userData.noShadow = true;
    g.add(hearth);

    const basket = new THREE.Mesh(new THREE.CylinderGeometry(basketRadius, basketRadius, BASKET_HEIGHT, 8, 1, true), materials("metal"));
    basket.position.set(x, hearthY + BASKET_HEIGHT / 2, z);
    g.add(basket);

    // leños cruzados en dos capas: dos a lo largo de x y dos a lo largo de z
    const logY = hearthY + LOG.radius;
    for (const o of [-0.1, 0.1]) {
      const a = P.cyl(LOG.radius, LOG.length, "wood", [x, logY, z + o], 8);
      a.rotation.z = Math.PI / 2;
      const b = P.cyl(LOG.radius, LOG.length, "wood", [x + o, logY + 2 * LOG.radius, z], 8);
      b.rotation.x = Math.PI / 2;
      g.add(a, b);
    }

    const embers = P.box(0.3, 0.05, 0.3, "fire", [x, hearthY + 0.025, z], { noShadow: true });
    g.add(embers);
    return g;
  },
};
