import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";
import { GALLERY_POST_HEIGHT } from "./gallery";

// Techo de la galería: arranca contra el anexo (x = -hx), vuela 0.3 a la derecha, levemente inclinado.
export const galleryRoof: SceneElement<BarbatosLayout> = {
  id: "gallery-roof",
  group: "roof",
  build({ layout: l, primitives: P }) {
    const { hx } = l.hall;
    const { zInner, zRoofOuter } = l.gallery;
    const zIn = zInner + 0.05; // se mete 5 cm bajo el alero del salón
    return P.box(
      2 * hx + 0.3,
      0.14,
      zIn - zRoofOuter,
      "roof",
      [0.15, GALLERY_POST_HEIGHT + 0.05, (zIn + zRoofOuter) / 2],
      { rx: -0.05 },
    );
  },
};
