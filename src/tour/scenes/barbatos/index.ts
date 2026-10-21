import { assembleElements } from "../../engine/assemble";
import { detectQuality } from "../../engine/quality";
import { createViewer } from "../../engine/viewer";
import type { MountOptions, TourController, TourScene } from "../../types";
import { ROOF_COLOR } from "./dimensions";
import { ELEMENTS } from "./elements";
import { BARBATOS_LAYOUT } from "./layout";
import { createLights } from "./lights";
import { BARBATOS_VIEWS } from "./views";

export const barbatosScene: TourScene = {
  palette: { roof: ROOF_COLOR },
  build: (ctx) => assembleElements(ELEMENTS, { ...ctx, layout: BARBATOS_LAYOUT }),
  lights: (quality) => createLights(BARBATOS_LAYOUT, quality),
  views: BARBATOS_VIEWS,
  background: "#e7a77a",
  fog: { near: 70, far: 190 },
  targetBounds: BARBATOS_LAYOUT.targetBounds,
};

export function mount(container: HTMLElement, options: MountOptions): TourController {
  return createViewer(container, barbatosScene, detectQuality(), options);
}
