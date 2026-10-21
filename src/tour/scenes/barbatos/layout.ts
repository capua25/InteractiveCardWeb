import type { Bounds, Vec3 } from "@/tour/types";
import { BARBATOS_DIMENSIONS, type BarbatosDimensions } from "./dimensions";

export type { Bounds, Vec3 };

export type Opening = { x: number; width: number; height: number; sill: number; rows?: number };
export type Segment = { x0: number; x1: number };
export type TableSpot = { x: number; z: number; kind: "round" | "rect" };

export type BarbatosLayout = {
  hall: {
    hx: number;
    hz: number;
    wallHeight: number;
    ridgeHeight: number;
    wallThickness: number;
    slope: number;
    slopeLen: number;
  };
  frontDoor: Opening;
  frontWindows: Opening[];
  frontSconces: { x: number; y: number }[];
  backWindows: Opening[];
  backWindowGrid: { cols: number; rows: number };
  backSconcesX: number[];
  backSconceY: number;
  gableWindows: { z: number; width: number; height: number; sill: number }[];
  plinth: { height: number; thickness: number; front: Segment[]; back: Segment[] };
  trussesX: number[];
  roof: { gableOverhang: number; eaveOverhang: number };
  chimney: {
    x: number;
    width: number;
    depth: number;
    height: number;
    hearthX: number;
    stack: { x: number; width: number; depth: number; height: number };
    flue: { x: number; base: number; top: number; radius: number; capRadius: number };
  };
  acUnits: {
    slab: { x: number; z: number; w: number; d: number; h: number };
    units: { x: number; y: number; z: number; w: number; h: number; d: number }[];
  };
  carpet: { x0: number; x1: number; width: number };
  annex: { x: number; width: number; height: number; zFront: number; zBack: number };
  pergola: { z: number; height: number; columnsX: number[] };
  gallery: { zInner: number; zPosts: number; zRoofOuter: number; depth: number; postHeight: number; fasciaHeight: number; postsX: number[] };
  lot: {
    zBack: number;
    zFront: number;
    halfWidth: number;
    centerZ: number;
    wallHeight: number;
    wallThickness: number;
    entrance: Segment;
    frontSegments: Segment[];
  };
  park: {
    trees: { x: number; z: number; scale: number }[];
    garland: { z: number; polesX: number[] };
  };
  patio: { x: number; z: number; width: number; depth: number };
  tables: TableSpot[];
  pointLights: Vec3[];
  targetBounds: Bounds;
};

/**
 * Tramos de zócalo entre `min` y `max`, cortados por `cuts` (centro y ancho).
 * Los cortes deben venir ordenados por x; se descartan tramos de menos de 1 cm.
 */
export function plinthSegments(min: number, max: number, cuts: { x: number; width: number }[]): Segment[] {
  const out: Segment[] = [];
  let x = min;
  for (const c of [...cuts, { x: max + 1e3, width: 0 }]) {
    const end = Math.min(c.x - c.width / 2, max);
    if (end > x + 0.01) out.push({ x0: x, x1: end });
    x = c.x + c.width / 2;
  }
  return out;
}

const centered = (i: number, count: number, step: number) => (i - (count - 1) / 2) * step;

export function computeLayout(d: BarbatosDimensions): BarbatosLayout {
  // Salón: origen en el centro; hastiales en ±hx, muros largos en ±hz.
  const hx = d.hall.length / 2;
  const hz = d.hall.width / 2;
  const T = d.hall.wallThickness;
  const rise = d.hall.ridgeHeight - d.hall.wallHeight;
  const hall = {
    hx,
    hz,
    wallHeight: d.hall.wallHeight,
    ridgeHeight: d.hall.ridgeHeight,
    wallThickness: T,
    slope: Math.atan2(rise, hz),
    slopeLen: Math.hypot(hz, rise),
  };

  // Frente (+z): puerta a fromLeft de la esquina frente-izquierda; ventanas a offsets de la esquina frente-izquierda / frente-derecha.
  const frontDoor: Opening = {
    x: -hx + d.frontDoor.fromLeft,
    width: d.frontDoor.width,
    height: d.frontDoor.height,
    sill: 0,
    rows: d.frontDoor.rows,
  };
  const fw = d.frontWindows;
  const frontWindows: Opening[] = fw.centers.map((c) => ({
    x: c.from === "front-left" ? -hx + c.offset : hx - c.offset,
    width: fw.width,
    height: fw.height,
    sill: fw.sill,
  }));
  const leftWin = frontWindows.filter((w) => w.x < frontDoor.x);
  const rightWin = frontWindows.filter((w) => w.x > frontDoor.x);
  const doorSconceX = frontDoor.width / 2 + d.frontSconces.doorGap;
  const frontSconces = [
    { x: frontDoor.x - doorSconceX, y: d.frontSconces.doorHeight },
    { x: frontDoor.x + doorSconceX, y: d.frontSconces.doorHeight },
    // a la izquierda de la ventana izquierda (si las medidas no traen ninguna, no hay aplique)
    ...leftWin.slice(0, 1).map((w) => ({ x: w.x - d.frontSconces.leftOfLeftWindow, y: d.frontSconces.windowHeight })),
    // en el punto medio entre ventanas derechas consecutivas
    ...rightWin.slice(1).map((w, i) => ({ x: (rightWin[i].x + w.x) / 2, y: d.frontSconces.windowHeight })),
  ];

  // Fondo (-z): tramo a cornerInset de cada esquina del fondo, dividido en `count` ventanales con pilares.
  const bw = d.backWindows;
  const span0 = -hx + bw.cornerInset;
  const span1 = hx - bw.cornerInset;
  const bwWidth = (span1 - span0 - (bw.count - 1) * bw.pillar) / bw.count;
  const bwMid = (span0 + span1) / 2;
  const backWindows: Opening[] = Array.from({ length: bw.count }, (_, i) => ({
    x: bwMid + centered(i, bw.count, bwWidth + bw.pillar),
    width: bwWidth,
    height: bw.height,
    sill: bw.sill,
  }));
  const backSconcesX = [
    span0 - bw.sconceOutside,
    ...backWindows.slice(0, -1).map((w) => w.x + bwWidth / 2 + bw.pillar / 2), // centro de cada pilar
    span1 + bw.sconceOutside,
  ];

  // Hastial derecho (+x): ventanas a offsetFromAxis del eje del hogar (z = 0); alto y base = ventanas del frente.
  const gableWindows = [-1, 1].map((s) => ({
    z: s * d.gableWindows.offsetFromAxis,
    width: d.gableWindows.width,
    height: fw.height,
    sill: fw.sill,
  }));

  // Zócalo: de -hx-overhang a hx+overhang, cortado en la puerta (frente) y los ventanales (fondo).
  const p = d.plinth;
  const plinthMin = -hx - p.overhang;
  const plinthMax = hx + p.overhang;
  const plinth = {
    height: p.height,
    thickness: p.thickness,
    front: plinthSegments(plinthMin, plinthMax, [{ x: frontDoor.x, width: frontDoor.width }]),
    back: plinthSegments(
      plinthMin,
      plinthMax,
      backWindows.map((w) => ({ x: w.x, width: w.width })),
    ),
  };

  // Cerchas centradas en el salón.
  const trussesX = Array.from({ length: d.trusses.count }, (_, i) => centered(i, d.trusses.count, d.trusses.spacing));

  // Chimenea contra la cara interior del hastial derecho.
  const c = d.chimney;
  const chimneyX = hx - T - c.depth / 2;
  // Bloque exterior: su cara interior es el plano del hastial.
  const stackX = hx + c.stack.depth / 2;
  const stackHeight = c.stack.heightRatio * d.hall.wallHeight;
  const chimney = {
    x: chimneyX,
    width: c.width,
    depth: c.depth,
    height: c.height,
    hearthX: hx - T - c.hearthFromInnerWall,
    stack: { x: stackX, width: c.stack.width, depth: c.stack.depth, height: stackHeight },
    flue: {
      x: stackX + c.flue.offsetX,
      base: stackHeight,
      top: d.hall.ridgeHeight + c.flue.aboveRidge,
      radius: c.flue.radius,
      capRadius: c.flue.capRadius,
    },
  };

  // Equipos de aire: losa pegada al zócalo del hastial +x, equipos apoyados encima.
  const ac = d.acUnits;
  const slabX = hx + d.plinth.overhang + ac.slab.w / 2;
  const acUnits = {
    slab: { x: slabX, z: ac.slab.z, w: ac.slab.w, d: ac.slab.d, h: ac.slab.h },
    units: ac.z.map((z) => ({ x: slabX, y: ac.slab.h + ac.unit.h / 2, z, ...ac.unit })),
  };

  // Alfombra: desde el muro izquierdo interior hasta chimneyGap antes del frente de la chimenea.
  const carpet = {
    x0: -hx + T + d.carpet.fromLeftWall,
    x1: chimneyX - c.depth / 2 - d.carpet.chimneyGap,
    width: d.carpet.width,
  };

  // Galería trasera: medidas desde el fondo (-hz).
  const g = d.gallery;
  const gallery = {
    zInner: -hz,
    zPosts: -hz - g.depth - g.postInset,
    zRoofOuter: -hz - g.depth - g.roofOverhang,
    depth: g.depth,
    postHeight: g.postHeight,
    fasciaHeight: g.fasciaHeight,
    postsX: Array.from({ length: g.postCount }, (_, i) => -hx + (i + 1) * g.postSpacing),
  };

  // Anexo a la izquierda: retranqueado desde el frente, fondo anclado al borde exterior del techo de la galería.
  const annex = {
    x: -hx - d.annex.width / 2,
    width: d.annex.width,
    height: d.annex.heightRatio * d.hall.wallHeight,
    zFront: hz + d.plinth.overhang - d.annex.setbackFromFront,
    zBack: gallery.zRoofOuter,
  };

  // Pérgola desde el frente.
  const pergola = {
    z: hz + d.pergola.distanceFromFront,
    height: d.pergola.height,
    columnsX: [frontDoor.x - d.pergola.columnsFromAxis, frontDoor.x + d.pergola.columnsFromAxis],
  };

  // Lote: fondo a backWallFromGallery del borde del techo de la galería, frente a `length` del fondo;
  // la entrada del frente queda abierta y centrada respecto del anexo.
  const lt = d.lot;
  const zBack = gallery.zRoofOuter - lt.backWallFromGallery;
  const halfWidth = lt.width / 2;
  const entranceX = annex.x + lt.entrance.centerFromAnnex;
  const lot = {
    zBack,
    zFront: zBack + lt.length,
    halfWidth,
    centerZ: zBack + lt.length / 2,
    wallHeight: lt.wallHeight,
    wallThickness: lt.wallThickness,
    entrance: { x0: entranceX - lt.entrance.width / 2, x1: entranceX + lt.entrance.width / 2 },
    frontSegments: plinthSegments(-halfWidth, halfWidth, [{ x: entranceX, width: lt.entrance.width }]),
  };

  // Parque: guirnalda y árboles desde el fondo/frente del salón.
  const pk = d.park;
  const park = {
    trees: pk.trees.map((t) => ({ x: t.x, z: t.from === "back" ? -hz - t.offset : hz + t.offset, scale: t.scale })),
    garland: { z: -hz - pk.garlandFromBack, polesX: [...pk.garlandPolesX] },
  };

  // Pedregullo desde el frente.
  const patio = {
    x: d.patio.xOffset,
    z: hz + d.patio.depth / 2,
    width: d.patio.width,
    depth: d.patio.depth,
  };

  // Mesas: filas desde el muro izquierdo exterior, a fromLongWall de cada muro largo; frente primero.
  const tables: TableSpot[] = [];
  d.tables.rowsFromLeftWall.forEach((off, i) => {
    const x = -hx + off;
    const zOff = hz - d.tables.fromLongWall;
    tables.push({ x, z: zOff, kind: i % 2 === 0 ? "round" : "rect" });
    tables.push({ x, z: -zOff, kind: (i + 1) % 2 === 0 ? "round" : "rect" });
  });

  const pl = d.pointLights;
  const pointLights: Vec3[] = [
    [0, pl.frontY, hz + pl.frontAhead],
    ...pl.side.map((s): Vec3 => [s.x, s.y, 0]),
    [hx - T - pl.hearthAhead, pl.hearthY, 0],
    [0, pl.backY, -hz - pl.backBehind],
  ];

  // Caja del target: márgenes desde el muro del lote; frente = muro del frente.
  const targetBounds: Bounds = {
    min: [-(halfWidth + lt.marginX), 0, zBack - lt.marginBehindWall],
    max: [halfWidth + lt.marginX, d.hall.ridgeHeight + lt.topAboveRidge, lot.zFront],
  };

  return {
    hall,
    frontDoor,
    frontWindows,
    frontSconces,
    backWindows,
    backWindowGrid: { ...bw.grid },
    backSconcesX,
    backSconceY: bw.sconceHeight,
    gableWindows,
    plinth,
    trussesX,
    roof: { ...d.roof },
    chimney,
    acUnits,
    carpet,
    annex,
    pergola,
    gallery,
    lot,
    park,
    patio,
    tables,
    pointLights,
    targetBounds,
  };
}

export const BARBATOS_LAYOUT = computeLayout(BARBATOS_DIMENSIONS);
