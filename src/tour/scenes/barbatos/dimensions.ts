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
    pad: { h: number; margin: number }; // una losa por equipo, `margin` más grande que el equipo por lado
    unit: { w: number; h: number; d: number };
    z: number[];
  };
  // Desde el muro izquierdo interior hasta `frontGap` antes del frente de la chimenea.
  carpet: { width: number; fromLeftWall: number; chimneyGap: number };
  // A la izquierda del salón.
  // Ventana angosta del frente, ventana horizontal del fondo y zócalo del fondo (fracción del alto).
  annex: {
    width: number;
    heightRatio: number;
    setbackFromFront: number;
    frontWindow: { width: number; height: number };
    rearWindow: { width: number; height: number };
    rearPlinthRatio: number;
  };
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
    curtains: { skirtHeight: number; rollRadius: number; offset: number };
  };
  // Vegetación del parque; las posiciones absolutas salen del layout (z relativas al muro del fondo).
  vegetation: {
    saplings: { xs: number[]; heights: number[]; fromBackWall: number };
    poplars: { count: number; fromSideWall: number; zStart: number; endFromBackWall: number; baseHeight: number; heightStep: number; heightCycle: number };
    phormiums: { count: number; fromSideWall: number; zStart: number; endFromBackWall: number };
    willows: { x: number; z: number }[];
    willowHeight: number;
    conifer: { x: number; z: number; height: number };
    photinia: { x: number; z: number; height: number };
    background: { seed: number; count: number; minHeight: number; maxHeight: number };
  };
  // Guirnalda hexagonal: 6 postes en los vértices de la arena; `hangBelowTop` es el enganche bajo la punta del poste.
  garland: { poleHeight: number; hangBelowTop: number; sag: number; bulbSpacing: number };
  // Fogón sobre arena hexagonal: `fromGallery` detrás del borde del techo de la galería; `sandRadius` es el
  // circunradio (centro→vértice) del hexágono, alineado con los 6 postes de la guirnalda.
  firePit: { fromGallery: number; ringDiameter: number; ringHeight: number; basketDiameter: number; sandRadius: number };
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
    stack: { depth: 0.5, width: 2.8, heightRatio: 1 },
    flue: { radius: 0.22, capRadius: 0.28, aboveRidge: 1.9, offsetX: 0.03 },
  },
  acUnits: {
    pad: { h: 0.1, margin: 0.1 },
    unit: { w: 0.3, h: 0.55, d: 0.8 },
    z: [-2.1, 2.1], // uno a cada lado del bloque exterior
  },
  carpet: { width: 1.8, fromLeftWall: 0.2, chimneyGap: 0.3 },
  annex: {
    width: 6,
    heightRatio: 1.1,
    setbackFromFront: 0,
    frontWindow: { width: 0.7, height: 1.5 },
    rearWindow: { width: 2.6, height: 0.55 },
    rearPlinthRatio: 0.2,
  },
  pergola: { distanceFromFront: 3, height: 3.4, columnsFromAxis: 2.8 },
  gallery: { depth: 5, roofOverhang: 0.35, postInset: 0.1, postSpacing: 3, postCount: 6, postHeight: 3.3, fasciaHeight: 0.3, curtains: { skirtHeight: 0.9, rollRadius: 0.08, offset: 0.08 } },
  vegetation: {
    saplings: { xs: [-15, -9, -3, 3, 9, 15], heights: [2.5, 3.5, 2, 4, 3, 2.8], fromBackWall: 1.5 },
    poplars: { count: 22, fromSideWall: 1.2, zStart: -14, endFromBackWall: 1, baseHeight: 5, heightStep: 0.5, heightCycle: 3 },
    phormiums: { count: 8, fromSideWall: 2.2, zStart: -16, endFromBackWall: 3 },
    willows: [{ x: -8, z: -29 }, { x: 7, z: -36 }, { x: -5, z: -39 }, { x: 9, z: -28 }],
    willowHeight: 6,
    conifer: { x: 4, z: -40.5, height: 7 },
    photinia: { x: 16.5, z: -16, height: 4.5 },
    background: { seed: 21, count: 18, minHeight: 12, maxHeight: 15 },
  },
  garland: { poleHeight: 2.8, hangBelowTop: 0.05, sag: 0.5, bulbSpacing: 0.375 },
  firePit: { fromGallery: 22, ringDiameter: 2.4, ringHeight: 0.55, basketDiameter: 0.8, sandRadius: 3.5 },
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
