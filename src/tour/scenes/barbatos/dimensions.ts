// Medidas de Barbato's como medidas base y offsets desde su pared o esquina de
// referencia. Pasar a medidas láser = copiar números acá; layout.ts deriva todo.
// Convención de ejes: x a lo largo del salón (hastial izquierdo -x, derecho +x),
// z de fondo (-z) a frente (+z), y hacia arriba. Origen en el centro del salón.

export type CornerRef = "front-left" | "front-right";

export const ROOF_COLOR = "#6b6e75";

export type BarbatosDimensions = {
  // Salón: largo en x, ancho en z.
  hall: { length: number; width: number; wallHeight: number; ridgeHeight: number; wallThickness: number };
  // Puerta a `fromLeft` de la esquina frente-izquierda (centro de la puerta).
  frontDoor: { width: number; height: number; fromLeft: number; rows: number };
  // Ventanas del frente: centro a `offset` de la esquina indicada.
  frontWindows: {
    width: number;
    height: number;
    sill: number;
    centers: { from: CornerRef; offset: number }[];
  };
  frontSconces: {
    doorGap: number; // distancia a cada jamba de la puerta
    doorHeight: number;
    windowHeight: number;
    leftOfLeftWindow: number; // a la izquierda de la ventana izquierda
  };
  // Tramo de ventanales del fondo, a `cornerInset` de cada esquina del fondo.
  backWindows: {
    cornerInset: number;
    count: number;
    pillar: number;
    height: number;
    sill: number;
    grid: { cols: number; rows: number };
    sconceOutside: number; // por fuera de cada extremo del tramo
    sconceHeight: number;
  };
  // Hastial derecho: ventanas a `offsetFromAxis` a cada lado del eje del hogar.
  gableWindows: { width: number; offsetFromAxis: number };
  plinth: { height: number; thickness: number; overhang: number };
  trusses: { count: number; spacing: number };
  // Vuelo de los faldones de chapa en los hastiales y en los aleros.
  roof: { gableOverhang: number; eaveOverhang: number };
  // Hogar interior contra el hastial derecho; bloque exterior (`stack`, altura = heightRatio * muro) y
  // caño que sube por fuera del hastial (`offsetX` desde el eje del bloque).
  chimney: {
    depth: number;
    height: number;
    width: number;
    hearthFromInnerWall: number;
    stack: { depth: number; width: number; heightRatio: number };
    flue: { radius: number; capRadius: number; aboveRidge: number; offsetX: number };
  };
  // Losa de cemento contra el zócalo del hastial +x y equipos encima (z de cada uno).
  acUnits: {
    slab: { w: number; d: number; h: number; z: number };
    unit: { w: number; h: number; d: number };
    z: number[];
  };
  // Desde el muro izquierdo interior hasta `frontGap` antes del frente de la chimenea.
  carpet: { width: number; fromLeftWall: number; chimneyGap: number };
  // A la izquierda del salón.
  annex: { width: number; heightRatio: number; setbackFromFront: number };
  // Desde el frente.
  pergola: { distanceFromFront: number; height: number; columnsFromAxis: number };
  // Desde el fondo.
  gallery: {
    depth: number;
    roofOverhang: number;
    postInset: number;
    postSpacing: number;
    postCount: number; // postes desde la esquina izquierda, sin contar la esquina
    postHeight: number;
    fasciaHeight: number;
  };
  park: {
    garlandFromBack: number;
    garlandPolesX: number[];
    trees: { x: number; from: "back" | "front"; offset: number; scale: number }[];
  };
  // Pedregullo desde el frente.
  patio: { width: number; depth: number; xOffset: number };
  // Filas desde el muro izquierdo exterior; mesas a `fromLongWall` de cada muro largo.
  tables: { rowsFromLeftWall: number[]; fromLongWall: number };
  pointLights: {
    frontAhead: number; // delante del frente
    side: { x: number; y: number }[]; // x desde el centro, z = 0
    hearthAhead: number; // delante del muro interior derecho
    hearthY: number;
    backBehind: number; // detrás del fondo
    frontY: number;
    backY: number;
  };
  // Lote: `length` en z y `width` en x; el fondo queda a `backWallFromGallery` del borde del techo de la
  // galería. Muro perimetral de bloques; la entrada del frente va centrada a `centerFromAnnex` del eje
  // del anexo. Los márgenes arman la caja del target.
  lot: {
    length: number;
    width: number;
    backWallFromGallery: number;
    wallHeight: number; // laterales y fondo
    frontWallHeight: number;
    wallThickness: number;
    entrance: { width: number; centerFromAnnex: number };
    marginX: number;
    marginBehindWall: number;
    topAboveRidge: number;
  };
};

export const BARBATOS_DIMENSIONS: BarbatosDimensions = {
  hall: { length: 18, width: 10, wallHeight: 3.5, ridgeHeight: 6.4, wallThickness: 0.3 },
  frontDoor: { width: 2.3, height: 2.7, fromLeft: 7.5, rows: 4 },
  frontWindows: {
    width: 1.5,
    height: 1.75,
    sill: 1.05,
    centers: [
      { from: "front-left", offset: 3.5 },
      { from: "front-right", offset: 7.15 },
      { from: "front-right", offset: 4.55 },
      { from: "front-right", offset: 1.95 },
    ],
  },
  frontSconces: { doorGap: 0.6, doorHeight: 2.9, windowHeight: 2.6, leftOfLeftWindow: 2.7 },
  backWindows: {
    cornerInset: 1.95,
    count: 3,
    pillar: 0.5,
    height: 2.8,
    sill: 0.1,
    grid: { cols: 6, rows: 3 },
    sconceOutside: 0.5,
    sconceHeight: 2.6,
  },
  gableWindows: { width: 1.4, offsetFromAxis: 3.2 },
  plinth: { height: 0.6, thickness: 0.42, overhang: 0.06 },
  trusses: { count: 5, spacing: 3.6 },
  roof: { gableOverhang: 0.05, eaveOverhang: 0.25 },
  chimney: {
    depth: 1.2,
    height: 5.2,
    width: 2.8,
    hearthFromInnerWall: 1.22,
    stack: { depth: 0.5, width: 2.8, heightRatio: 0.75 },
    flue: { radius: 0.22, capRadius: 0.28, aboveRidge: 1.9, offsetX: 0.03 },
  },
  acUnits: {
    slab: { w: 0.8, d: 2.5, h: 0.1, z: -3.6 },
    unit: { w: 0.3, h: 0.55, d: 0.8 },
    z: [-4.3, -2.9],
  },
  carpet: { width: 1.8, fromLeftWall: 0.2, chimneyGap: 0.3 },
  annex: { width: 6, heightRatio: 1.1, setbackFromFront: 0 },
  pergola: { distanceFromFront: 3, height: 3.4, columnsFromAxis: 2.4 },
  gallery: { depth: 5, roofOverhang: 0.35, postInset: 0.1, postSpacing: 3, postCount: 6, postHeight: 3.3, fasciaHeight: 0.3 },
  park: {
    garlandFromBack: 11,
    garlandPolesX: [-9, -3, 3, 9],
    trees: [
      { x: -15, from: "back", offset: 10, scale: 1.1 },
      { x: -7, from: "back", offset: 15, scale: 1.3 },
      { x: 4, from: "back", offset: 16, scale: 1.2 },
      { x: 13, from: "back", offset: 9, scale: 1 },
      { x: 17, from: "back", offset: 15, scale: 1.2 },
      { x: -18, from: "back", offset: 16, scale: 0.9 },
      { x: -20, from: "front", offset: 4, scale: 1.1 },
      { x: 20, from: "front", offset: 6, scale: 1 },
    ],
  },
  patio: { width: 30, depth: 10, xOffset: -2 },
  tables: { rowsFromLeftWall: [2.5, 5.5, 8.5, 11.5, 14.5], fromLongWall: 2.6 },
  pointLights: {
    frontAhead: 0.8,
    side: [
      { x: -4, y: 3.2 },
      { x: 4, y: 3.2 },
    ],
    hearthAhead: 1.5,
    hearthY: 0.9,
    backBehind: 2,
    frontY: 2.6,
    backY: 2.6,
  },
  lot: {
    length: 60,
    width: 38,
    backWallFromGallery: 32,
    wallHeight: 2,
    frontWallHeight: 1.5,
    wallThickness: 0.2,
    entrance: { width: 4.5, centerFromAnnex: 0 },
    marginX: 4,
    marginBehindWall: 2,
    topAboveRidge: 1,
  },
};
