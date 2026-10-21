import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";
import { annex } from "./annex";
import { annexRoof } from "./annex-roof";
import { backWall } from "./back-wall";
import { chimney } from "./chimney";
import { floor } from "./floor";
import { frontWall } from "./front-wall";
import { gables } from "./gables";
import { gallery } from "./gallery";
import { galleryRoof } from "./gallery-roof";
import { garland } from "./garland";
import { ground } from "./ground";
import { park } from "./park";
import { patio } from "./patio";
import { pergola } from "./pergola";
import { plinth } from "./plinth";
import { roof } from "./roof";
import { tables } from "./tables";
import { trusses } from "./trusses";

// Registro de la escena: agregar una pieza = un archivo nuevo + una línea acá.
export const ELEMENTS: readonly SceneElement<BarbatosLayout>[] = [
  ground,
  patio,
  frontWall,
  backWall,
  gables,
  plinth,
  floor,
  chimney,
  trusses,
  roof,
  annex,
  annexRoof,
  pergola,
  gallery,
  galleryRoof,
  park,
  garland,
  tables,
];
