import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";
import { acUnits } from "./ac-units";
import { annex } from "./annex";
import { annexRoof } from "./annex-roof";
import { backWall } from "./back-wall";
import { chimney } from "./chimney";
import { firePit } from "./fire-pit";
import { floor } from "./floor";
import { forecourt } from "./forecourt";
import { frontWall } from "./front-wall";
import { gables } from "./gables";
import { gallery } from "./gallery";
import { galleryCurtains } from "./gallery-curtains";
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
import { vegetation } from "./vegetation";

// Registro de la escena: agregar una pieza = un archivo nuevo + una línea acá.
export const ELEMENTS: readonly SceneElement<BarbatosLayout>[] = [
  ground,
  patio,
  forecourt,
  frontWall,
  backWall,
  gables,
  plinth,
  floor,
  chimney,
  acUnits,
  trusses,
  roof,
  annex,
  annexRoof,
  pergola,
  gallery,
  galleryRoof,
  galleryCurtains,
  park,
  firePit,
  vegetation,
  garland,
  tables,
];
