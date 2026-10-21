// Único archivo de tipos del recorrido que React puede importar: three solo como `import type`.
import type { Group, Object3D } from "three";
import type { MaterialFactory } from "./engine/materials";
import type { Primitives } from "./engine/primitives";
import type { Textures } from "./engine/textures";

export type Vec3 = readonly [number, number, number];
export type Bounds = { min: Vec3; max: Vec3 };

export type TourView = "out" | "in";

export type TourController = {
  setView(view: TourView): void;
  setRoofVisible(visible: boolean): void;
  // Cortinas de la galería: `open` = enrolladas. Sin cortinas en la escena, no hace nada.
  readonly hasCurtains: boolean;
  setCurtainsOpen(open: boolean, animate: boolean): void;
  dispose(): void;
};

export type MountOptions = { onContextLost(): void };

export type TourModule = { mount(container: HTMLElement, options: MountOptions): TourController };

export type CameraView = { pos: Vec3; target: Vec3 };

// Nivel de detalle de la geometría procedural (más segmentos en desktop, menos en celulares).
export type GeometryDetail = "high" | "low";

export type Quality = { pixelRatio: number; shadowMapSize: number; antialias: boolean; maxAnisotropy: number; detail: GeometryDetail };

export type EngineContext = { materials: MaterialFactory; textures: Textures; primitives: Primitives; detail?: GeometryDetail };

export type BuildContext<L> = EngineContext & { layout: L };

// Pieza de una escena. `group: "roof"` la cuelga del grupo que oculta "Sin techo".
export type SceneElement<L> = {
  id: string;
  group?: "root" | "roof";
  // Pieza animable por el controlador: el motor la expone en `curtains` y la excluye del merge.
  animates?: "curtains";
  build(ctx: BuildContext<L>): Object3D;
};

export type TourScene = {
  palette: { roof: string };
  build(ctx: EngineContext): { root: Group; roofGroup: Group; curtains: Object3D[] };
  lights(quality: Quality): Object3D[];
  views: Record<TourView, CameraView>;
  background: string;
  fog: { near: number; far: number };
  targetBounds: Bounds;
};
