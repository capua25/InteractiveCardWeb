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
  // Apliques del frente: en el punto medio de cada paño entre aberturas vecinas (puerta–ventana y ventana–ventana).
  frontSconces: {
    doorGap: number; // solo si no hay ventana de ese lado de la puerta: distancia a la jamba
    height: number;
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
  // Vegetación del parque; las posiciones absolutas salen del layout. Todo es relativo a un ancla: muro del fondo,
  // fogón (`fromPit`: dx/dz desde el centro del fogón), muro lateral, techo de la galería o extremo +x del salón.
  vegetation: {
    saplings: { xs: number[]; heights: number[]; fromBackWall: number };
    wallRow: { xs: number[]; height: number; radius: number; fromBackWall: number };
    tallSaplings: { fromPit: { dx: number; dz: number }; height: number }[];
    tallCrownRadius: number;
    poplars: { count: number; fromSideWall: number; zStart: number; endFromBackWall: number; baseHeight: number; heightStep: number; heightCycle: number };
    phormiums: { count: number; fromSideWall: number; zStart: number; endFromBackWall: number };
    willows: { dx: number; dz: number }[];
    willowHeight: number;
    photinia: { fromSideWall: number; behindGallery: number; height: number }; // contra el muro +x; detrás del borde del techo de la galería
  };
  // Guirnalda hexagonal: 6 postes en los vértices de la arena; `hangBelowTop` es el enganche bajo la punta del poste.
  garland: { poleHeight: number; hangBelowTop: number; sag: number; bulbSpacing: number };
  // Fogón sobre arena hexagonal: `fromHallLeft` desde el borde -x del salón (cruce galería/anexo; 0 = justo ahí) y `fromBackWall` desde el muro del fondo; `sandRadius` es el
  // circunradio (centro→vértice) del hexágono, alineado con los 6 postes de la guirnalda.
  firePit: { fromHallLeft: number; fromBackWall: number; ringDiameter: number; ringHeight: number; basketDiameter: number; sandRadius: number };
  // Pedregullo del frente: contorno curvo anclado al edificio y a la entrada del lote. Borde -x a `leftFromAnnex`
  // del lado -x del anexo, recto hasta `driveBend` antes del frente del pedregullo y curvando hasta el pilar izquierdo;
  // desde el pilar derecho dobla (`driveTurn` en x) hasta el frente del pedregullo, a `depth` del frente del salón;
  // el frente retrocede `frontRecede` hacia +x (abombado `frontBow`) y cierra con una esquina redonda que sale
  // `pastHall` más allá del hastial +x y vuelve al frente del salón en su extremo +x.
  // Piedras sueltas cada `stoneSpacing` por todo el contorno salvo el edificio y la entrada (`gapClear` libre junto a
  // cada pilar); lavandas cada `lavenderSpacing` sobre el borde delantero, corridas `lavenderOffset` hacia afuera.
  forecourt: {
    leftFromAnnex: number;
    depth: number;
    driveBend: number;
    driveTurn: number;
    frontRecede: number;
    frontBow: number;
    pastHall: number;
    stoneSpacing: number;
    stoneSize: [number, number];
    gapClear: number;
    lavenderSpacing: number;
    lavenderOffset: number;
  };
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
  frontDoor: { width: 2.6, height: 2.7, fromLeft: 6, rows: 4 },
  frontWindows: {
    width: 1.6,
    height: 1.75,
    sill: 0.9,
    centers: [
      { from: "front-left", offset: 1.4 },
      { from: "front-right", offset: 7.35 },
      { from: "front-right", offset: 4.4 },
      { from: "front-right", offset: 1.45 },
    ],
  },
  frontSconces: { doorGap: 1.27, height: 2.4 },
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
    saplings: { xs: [-3, 1.5, 6, 10.5, 15], heights: [2.5, 2.2, 3.0, 2.4, 2.8], fromBackWall: 1.2 },
    wallRow: { xs: [-0.8, 3.8, 8.3, 12.8, 17.2], height: 3.2, radius: 0.25, fromBackWall: 0.8 },
    tallSaplings: [{ fromPit: { dx: 14, dz: 4.35 }, height: 6 }, { fromPit: { dx: 1, dz: 10.35 }, height: 5.5 }],
    tallCrownRadius: 1.2,
    poplars: { count: 22, fromSideWall: 1.2, zStart: -14, endFromBackWall: 1, baseHeight: 4.5, heightStep: 0.4, heightCycle: 3 },
    phormiums: { count: 8, fromSideWall: 2.2, zStart: -16, endFromBackWall: 3 },
    willows: [{ dx: -6.3, dz: 2.55 }, { dx: -5.5, dz: -4.15 }, { dx: -6.45, dz: -1.9 }, { dx: 6.5, dz: -2.65 }],
    willowHeight: 3.2,
    photinia: { fromSideWall: 2.5, behindGallery: 5.65, height: 4.5 },
  },
  garland: { poleHeight: 2.8, hangBelowTop: 0.05, sag: 0.5, bulbSpacing: 0.375 },
  firePit: { fromHallLeft: 0, fromBackWall: 7, ringDiameter: 2.4, ringHeight: 0.55, basketDiameter: 0.8, sandRadius: 5 },
  forecourt: {
    leftFromAnnex: 2,
    depth: 10,
    driveBend: 2,
    driveTurn: 4.5,
    frontRecede: 0.6,
    frontBow: 0.25,
    pastHall: 3,
    stoneSpacing: 0.45,
    stoneSize: [0.6, 0.9],
    gapClear: 0.8,
    lavenderSpacing: 0.9,
    lavenderOffset: 0.9,
  },
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
