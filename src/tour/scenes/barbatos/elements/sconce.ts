import * as THREE from "three";
import type { Primitives } from "@/tour/engine/primitives";
import type { Vec3 } from "@/tour/types";

const FACING: Record<"+z" | "-z" | "+x" | "-x", [number, number]> = {
  "+z": [0, 1],
  "-z": [0, -1],
  "+x": [1, 0],
  "-x": [-1, 0],
};

// Aplique cubo: cuerpo negro de 0.1 pegado a la pared (`at` = punto de la pared a la altura del cuerpo)
// y emisor fino debajo que mira hacia `facing`.
export function sconce(P: Primitives, at: Vec3, facing: "+z" | "-z" | "+x" | "-x"): THREE.Group {
  const [dx, dz] = FACING[facing];
  const g = new THREE.Group();
  const off = 0.05;
  const cx = at[0] + dx * off;
  const cz = at[2] + dz * off;
  g.add(P.box(0.1, 0.1, 0.1, "metal", [cx, at[1], cz]));
  g.add(P.box(0.08, 0.02, 0.08, "sconce", [cx, at[1] - 0.06, cz], { noShadow: true }));
  return g;
}
