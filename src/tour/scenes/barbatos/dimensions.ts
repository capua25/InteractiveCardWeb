// Medidas de Barbato's como medidas base y offsets desde su pared o esquina de
// referencia. Pasar a medidas láser = copiar números acá; layout.ts deriva todo.
// Convención de ejes: x a lo largo del salón (hastial izquierdo -x, derecho +x),
// z de fondo (-z) a frente (+z), y hacia arriba. Origen en el centro del salón.

export type CornerRef = "front-left" | "front-right";

export const ROOF_COLOR = "#3b4f66";

export type BarbatosDimensions = {
  // Salón: largo en x, ancho en z.
  hall: { length: number; width: number; wallHeight: number; ridgeHeight: number; wallThickness: number };
  // Puerta centrada en el frente.
  frontDoor: { width: number; height: number };
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
  // Contra el hastial derecho.
  chimney: {
    depth: number;
    height: number;
    width: number;
    hearthFromInnerWall: number;
    flue: { radius: number; base: number; aboveRidge: number };
  };
  // Desde el muro izquierdo interior hasta `frontGap` antes del frente de la chimenea.
  carpet: { width: number; fromLeftWall: number; chimneyGap: number };
  // A la izquierda del salón.
  annex: { width: number; height: number; setbackFromFront: number };
  // Desde el frente.
  pergola: { distanceFromFront: number; height: number; columnsFromAxis: number };
  // Desde el fondo.
  gallery: {
    depth: number;
    roofDepth: number;
    roofOverhang: number;
    postInset: number;
    postSpacing: number;
    postCount: number; // postes desde la esquina izquierda, sin contar la esquina
  };
  park: {
    wallHeight: number;
    wallDistanceFromBack: number;
    wallHalfWidth: number;
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
  // Caja del target: márgenes desde el muro del parque y el borde del pedregullo.
  lot: { marginX: number; marginBehindWall: number; topAboveRidge: number };
};

export const BARBATOS_DIMENSIONS: BarbatosDimensions = {
  hall: { length: 24, width: 12, wallHeight: 3.5, ridgeHeight: 7, wallThickness: 0.3 },
  frontDoor: { width: 2.5, height: 2.7 },
  frontWindows: {
    width: 1.7,
    height: 1.7,
    sill: 1.2,
    centers: [
      { from: "front-left", offset: 6.5 },
      { from: "front-right", offset: 8 },
      { from: "front-right", offset: 5 },
      { from: "front-right", offset: 2 },
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
  gableWindows: { width: 1.4, offsetFromAxis: 3.8 },
  plinth: { height: 0.8, thickness: 0.42, overhang: 0.06 },
  trusses: { count: 5, spacing: 4 },
  chimney: {
    depth: 1.2,
    height: 5.8,
    width: 2.8,
    hearthFromInnerWall: 1.22,
    flue: { radius: 0.32, base: 5.6, aboveRidge: 1.8 },
  },
  carpet: { width: 1.8, fromLeftWall: 0.2, chimneyGap: 0.3 },
  annex: { width: 6, height: 3.2, setbackFromFront: 2 },
  pergola: { distanceFromFront: 3, height: 3.4, columnsFromAxis: 2.4 },
  gallery: { depth: 3, roofDepth: 3.4, roofOverhang: 0.35, postInset: 0.1, postSpacing: 4, postCount: 6 },
  park: {
    wallHeight: 1.1,
    wallDistanceFromBack: 20,
    wallHalfWidth: 21,
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
  tables: { rowsFromLeftWall: [3, 6.5, 10, 13.5, 17], fromLongWall: 2.6 },
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
  lot: { marginX: 4, marginBehindWall: 2, topAboveRidge: 1 },
};
