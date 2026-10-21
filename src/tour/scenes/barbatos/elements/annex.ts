import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";
import { sconce } from "./sconce";

const PLATE = 0.02; // revoque del fondo
const WALL = 0.06; // espesor de marco de las ventanas del anexo

// Anexo de piedra a la izquierda del salón: ventana angosta esmerilada al frente, revoque gris con
// zócalo de piedra, ventana horizontal de madera y dos apliques al fondo.
export const annex: SceneElement<BarbatosLayout> = {
  id: "annex",
  build({ layout: l, primitives: P }) {
    const a = l.annex;
    const depth = a.zFront - a.zBack;
    const g = new THREE.Group();
    g.add(P.box(a.width, a.height, depth, "stone", [a.x, a.height / 2, (a.zFront + a.zBack) / 2]));

    const fw = a.frontWindow;
    g.add(P.frame("z", fw.x, a.zFront, fw.sill, fw.width, fw.height, WALL, { cols: 1, rows: 3, frameKey: "frameGray", glassKey: "frostedGlass" }));

    g.add(P.box(a.width, a.height, PLATE, "greyStucco", [a.x, a.height / 2, a.zBack - PLATE / 2]));
    g.add(P.box(a.width, a.rearPlinth, 0.04, "stone", [a.x, a.rearPlinth / 2, a.zBack - 0.02]));
    const rw = a.rearWindow;
    g.add(P.frame("z", rw.x, a.zBack - PLATE, rw.sill, rw.width, rw.height, WALL, { cols: 1, rows: 1, frameKey: "wood", glassKey: "hearth" }));
    for (const s of a.rearSconces) g.add(sconce(P, [s.x, s.y, a.zBack - PLATE], "-z"));
    return g;
  },
};
