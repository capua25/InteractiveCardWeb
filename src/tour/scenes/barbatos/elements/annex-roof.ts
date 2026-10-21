import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

const OVERHANG = 0.25; // vuela al frente y al lado izquierdo; al ras atrás y contra el salón

export const annexRoof: SceneElement<BarbatosLayout> = {
  id: "annex-roof",
  group: "roof",
  build({ layout: l, primitives: P }) {
    const a = l.annex;
    const depth = a.zFront - a.zBack;
    return P.box(a.width + OVERHANG, 0.22, depth + OVERHANG, "roof", [
      a.x - OVERHANG / 2,
      a.height + 0.1,
      (a.zFront + OVERHANG + a.zBack) / 2,
    ]);
  },
};
