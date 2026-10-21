import type { Bounds, Vec3 } from "@/tour/types";
import { rng } from "@/tour/engine/textures";
import { BARBATOS_DIMENSIONS, type BarbatosDimensions } from "./dimensions";

export type { Bounds, Vec3 };

export type Opening = { x: number; width: number; height: number; sill: number; rows?: number };
export type Segment = { x0: number; x1: number };
export type TableSpot = { x: number; z: number; kind: "round" | "rect" };
export type P2 = { x: number; z: number };

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
    pads: { x: number; z: number; w: number; d: number; h: number }[];
    units: { x: number; y: number; z: number; w: number; h: number; d: number }[];
  };
  carpet: { x0: number; x1: number; width: number };
  annex: {
    x: number;
    width: number;
    height: number;
    zFront: number;
    zBack: number;
    frontWindow: Opening;
    rearWindow: Opening;
    rearSconces: { x: number; y: number }[];
    rearPlinth: number;
  };
  pergola: { z: number; height: number; columnsX: number[] };
  gallery: { zInner: number; zPosts: number; zRoofOuter: number; depth: number; postHeight: number; fasciaHeight: number; postsX: number[]; curtains: { bays: Segment[]; z: number; topY: number; skirtHeight: number; rollRadius: number } };
  lot: {
    zBack: number;
    zFront: number;
    halfWidth: number;
    centerZ: number;
    wallHeight: number;
    frontWallHeight: number;
    wallThickness: number;
    entrance: Segment;
    frontSegments: Segment[];
  };
  park: {
    garland: { poles: { x: number; z: number }[]; poleHeight: number; hangY: number; sag: number; bulbSpacing: number };
  };
  vegetation: {
    saplings: { x: number; z: number; height: number }[];
    wallRow: { x: number; z: number; height: number; radius: number }[];
    tallSaplings: { x: number; z: number; height: number; radius: number }[];
    poplars: { x: number; z: number; height: number }[];
    phormiums: { x: number; z: number }[];
    willows: { x: number; z: number; height: number }[];
    photinia: { x: number; z: number; height: number };
  };
  firePit: { x: number; z: number; ringRadius: number; ringHeight: number; basketRadius: number; sandRadius: number; sandVertices: { x: number; z: number }[] };
  // `outline`: polígono cerrado del pedregullo (x, z), denso; arranca en la esquina -x sobre el frente del edificio.
  forecourt: { outline: P2[]; border: { x: number; z: number; size: number }[]; lavender: P2[] };
  tables: TableSpot[];
  pointLights: Vec3[];
  targetBounds: Bounds;
};

const FORECOURT_SEED = 15;
const MIN_DRIVE = 2; // mínimo entre el borde delantero del pedregullo y el muro del frente (entran las lavandas)
// Pilares de la entrada: semiancho 0.275 + banda 0.02 (park.ts); ninguna piedra se acerca más al eje del muro del frente.
const WALL_CLEAR = 0.3;
const MIN_DEPTH = 2; // fondo mínimo del pedregullo para que la esquina redonda no se dé vuelta
// Largo libre de piedras desde el edificio: la piedra más grande (radio 0.45) no toca la esquina de la vereda de cemento
// (hx + 0.3) ni el zócalo.
const BUILDING_CLEAR = 0.8;

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

/**
 * Vértices de un hexágono regular de circunradio `r` centrado en (cx, cz): θk = k·π/3, primer vértice en +x.
 * Coincide con `CircleGeometry(r, 6)` rotada −π/2 en x (de ahí el signo de z).
 */
export function hexagonVertices(cx: number, cz: number, r: number): { x: number; z: number }[] {
  return Array.from({ length: 6 }, (_, k) => {
    const theta = (k * Math.PI) / 3;
    return { x: cx + r * Math.cos(theta), z: cz - r * Math.sin(theta) };
  });
}

const CURVE_STEPS = 24;

/** Bézier cúbica muestreada en `CURVE_STEPS` tramos, sin el punto inicial (para encadenar tramos). */
export function cubicPoints(a: P2, b: P2, c: P2, d: P2, steps = CURVE_STEPS): P2[] {
  const at = (t: number, p: number, q: number, r: number, s: number) =>
    (1 - t) ** 3 * p + 3 * (1 - t) ** 2 * t * q + 3 * (1 - t) * t * t * r + t ** 3 * s;
  return Array.from({ length: steps }, (_, i) => {
    const t = (i + 1) / steps;
    return { x: at(t, a.x, b.x, c.x, d.x), z: at(t, a.z, b.z, c.z, d.z) };
  });
}

/**
 * Puntos cada ~`spacing` (paso exacto = largo útil / tramos) sobre la polilínea abierta `pts`, dejando libres
 * `trimStart` y `trimEnd` de largo en cada punta. Devuelve posición y tangente unitaria.
 */
export function alongPolyline(pts: P2[], spacing: number, trimStart: number, trimEnd: number): { p: P2; t: P2 }[] {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  const total = cum[cum.length - 1];
  const usable = total - trimStart - trimEnd;
  if (usable < 0) return [];
  const n = Math.max(1, Math.round(usable / spacing));
  const out: { p: P2; t: P2 }[] = [];
  let k = 1;
  for (let i = 0; i <= n; i++) {
    const s = trimStart + (usable * i) / n;
    while (k < pts.length - 1 && cum[k] < s) k++;
    const a = pts[k - 1];
    const b = pts[k];
    const len = cum[k] - cum[k - 1] || 1;
    const f = (s - cum[k - 1]) / len;
    out.push({ p: { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f }, t: { x: (b.x - a.x) / len, z: (b.z - a.z) / len } });
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
  const rightWin = frontWindows.filter((w) => w.x > frontDoor.x);
  const doorSconceX = frontDoor.width / 2 + d.frontSconces.doorGap;
  const frontSconces = [
    { x: frontDoor.x - doorSconceX, y: d.frontSconces.doorHeight },
    { x: frontDoor.x + doorSconceX, y: d.frontSconces.doorHeight },
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

  // Equipos de aire: una losa por equipo pegada al zócalo del hastial +x, equipo apoyado encima.
  const ac = d.acUnits;
  const padW = ac.unit.w + 2 * ac.pad.margin;
  const padD = ac.unit.d + 2 * ac.pad.margin;
  const padX = hx + d.plinth.overhang + padW / 2; // borde de la losa pegado al zócalo
  const acUnits = {
    pads: ac.z.map((z) => ({ x: padX, z, w: padW, d: padD, h: ac.pad.h })),
    units: ac.z.map((z) => ({ x: padX, y: ac.pad.h + ac.unit.h / 2, z, ...ac.unit })),
  };

  // Alfombra: desde el muro izquierdo interior hasta chimneyGap antes del frente de la chimenea.
  const carpet = {
    x0: -hx + T + d.carpet.fromLeftWall,
    x1: chimneyX - c.depth / 2 - d.carpet.chimneyGap,
    width: d.carpet.width,
  };

  // Galería trasera: medidas desde el fondo (-hz).
  const g = d.gallery;
  const zPosts = -hz - g.depth - g.postInset;
  const postsX = Array.from({ length: g.postCount }, (_, i) => -hx + (i + 1) * g.postSpacing);
  const gallery = {
    zInner: -hz,
    zPosts,
    zRoofOuter: -hz - g.depth - g.roofOverhang,
    depth: g.depth,
    postHeight: g.postHeight,
    fasciaHeight: g.fasciaHeight,
    postsX,
    // Un tramo de cortina entre cada par de postes consecutivos (el primero arranca en la esquina -hx).
    curtains: {
      bays: postsX.map((x1, i) => ({ x0: i === 0 ? -hx : postsX[i - 1], x1 })),
      z: zPosts - g.curtains.offset,
      topY: g.postHeight - g.fasciaHeight,
      skirtHeight: g.curtains.skirtHeight,
      rollRadius: g.curtains.rollRadius,
    },
  };

  // Anexo a la izquierda: retranqueado desde el frente, fondo anclado al borde exterior del techo de la galería.
  const an = d.annex;
  const annexX = -hx - an.width / 2;
  const annexHeight = an.heightRatio * d.hall.wallHeight;
  const rearSill = annexHeight / 2 - an.rearWindow.height / 2;
  const annex = {
    x: annexX,
    width: an.width,
    height: annexHeight,
    zFront: hz + d.plinth.overhang - an.setbackFromFront,
    zBack: gallery.zRoofOuter,
    frontWindow: { x: annexX, ...an.frontWindow, sill: fw.sill },
    rearWindow: { x: annexX, ...an.rearWindow, sill: rearSill },
    rearSconces: [-0.9, 0.9].map((dx) => ({ x: annexX + dx, y: rearSill + an.rearWindow.height + 0.4 })),
    rearPlinth: an.rearPlinthRatio * annexHeight,
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
    frontWallHeight: lt.frontWallHeight,
    wallThickness: lt.wallThickness,
    entrance: { x0: entranceX - lt.entrance.width / 2, x1: entranceX + lt.entrance.width / 2 },
    frontSegments: plinthSegments(-halfWidth, halfWidth, [{ x: entranceX, width: lt.entrance.width }]),
  };

  // Fogón en la junción galería/anexo (borde -x del salón), a `fromBackWall` del muro del fondo del lote.
  const fp = d.firePit;
  const firePitX = -hx + fp.fromHallLeft;
  const firePitZ = zBack + fp.fromBackWall;
  const firePit = {
    x: firePitX,
    z: firePitZ,
    ringRadius: fp.ringDiameter / 2,
    ringHeight: fp.ringHeight,
    basketRadius: fp.basketDiameter / 2,
    sandRadius: fp.sandRadius,
    sandVertices: hexagonVertices(firePitX, firePitZ, fp.sandRadius),
  };

  // Vegetación: plantines contra el muro del fondo, álamos y formios contra el muro izquierdo.
  const vg = d.vegetation;
  const along = (i: number, n: number, z0: number, z1: number) => z0 + ((z1 - z0) * i) / (n - 1);
  const vegetation = {
    saplings: vg.saplings.xs.map((x, i) => ({ x, z: zBack + vg.saplings.fromBackWall, height: vg.saplings.heights[i] })),
    wallRow: vg.wallRow.xs.map((x) => ({ x, z: zBack + vg.wallRow.fromBackWall, height: vg.wallRow.height, radius: vg.wallRow.radius })),
    tallSaplings: vg.tallSaplings.map((t) => ({ x: firePit.x + t.fromPit.dx, z: firePit.z + t.fromPit.dz, height: t.height, radius: vg.tallCrownRadius })),
    poplars: Array.from({ length: vg.poplars.count }, (_, i) => ({
      x: -halfWidth + vg.poplars.fromSideWall,
      z: along(i, vg.poplars.count, vg.poplars.zStart, zBack + vg.poplars.endFromBackWall),
      height: vg.poplars.baseHeight + (i % vg.poplars.heightCycle) * vg.poplars.heightStep,
    })),
    phormiums: Array.from({ length: vg.phormiums.count }, (_, i) => ({
      x: -halfWidth + vg.phormiums.fromSideWall,
      z: along(i, vg.phormiums.count, vg.phormiums.zStart, zBack + vg.phormiums.endFromBackWall),
    })),
    willows: vg.willows.map((w) => ({ x: firePit.x + w.dx, z: firePit.z + w.dz, height: vg.willowHeight })),
    photinia: { x: halfWidth - vg.photinia.fromSideWall, z: gallery.zRoofOuter - vg.photinia.behindGallery, height: vg.photinia.height },
  };

  // Guirnalda: un poste por vértice de la arena; el cable cuelga 5 cm bajo la punta.
  const gl = d.garland;
  const garland = { poles: firePit.sandVertices, poleHeight: gl.poleHeight, hangY: gl.poleHeight - gl.hangBelowTop, sag: gl.sag, bulbSpacing: gl.bulbSpacing };

  // Pedregullo del frente (ver `dimensions.forecourt`): contorno anclado al anexo, a la entrada del lote y al extremo
  // +x del salón. Tramos encadenados: lado -x → curva al pilar izquierdo │ entrada │ curva desde el pilar derecho →
  // borde delantero → esquina redonda +x → vuelta al frente del salón; cierra por el frente del edificio.
  const fc = d.forecourt;
  const xL = annex.x - annex.width / 2 - fc.leftFromAnnex;
  // si el lote no da para `depth`, el borde delantero se recorta para dejar MIN_DRIVE de camino hasta el muro
  const zF = Math.min(hz + fc.depth, lot.zFront - MIN_DRIVE);
  if (zF - hz < MIN_DEPTH) {
    throw new Error(`el pedregullo queda con ${(zF - hz).toFixed(2)} m de fondo entre el salón y el muro del frente; hacen falta al menos ${MIN_DEPTH + MIN_DRIVE} m de lote delante del salón`);
  }
  const xR = hx + fc.pastHall;
  const { x0: gx0, x1: gx1 } = lot.entrance;
  const zW = lot.zFront;
  const zOut = zW + lt.wallThickness / 2; // el pedregullo pasa la entrada hasta la cara exterior del muro
  const drive = (zW - zF) / 2;
  const leftRun: P2[] = [
    { x: xL, z: hz },
    { x: xL, z: zF - fc.driveBend },
    ...cubicPoints({ x: xL, z: zF - fc.driveBend }, { x: xL, z: zF }, { x: gx0, z: zW - drive }, { x: gx0, z: zW }),
  ];
  const frontStart = { x: gx1 + fc.driveTurn, z: zF };
  const frontEnd = { x: hx, z: zF - fc.frontRecede };
  const cornerMid = { x: xR, z: (hz + frontEnd.z) / 2 };
  const reach = 0.6 * fc.pastHall;
  const bend = 0.3 * (frontEnd.z - hz);
  const driveCurve = cubicPoints({ x: gx1, z: zW }, { x: gx1, z: zW - drive }, { x: gx1 + 0.4 * fc.driveTurn, z: zF }, frontStart);
  const frontEdge = cubicPoints(
    frontStart,
    { x: frontStart.x + (frontEnd.x - frontStart.x) / 3, z: frontStart.z + fc.frontBow },
    { x: frontStart.x + (2 * (frontEnd.x - frontStart.x)) / 3, z: frontEnd.z + fc.frontBow },
    frontEnd,
  );
  const corner = [
    ...cubicPoints(frontEnd, { x: hx + reach, z: frontEnd.z }, { x: xR, z: frontEnd.z - bend }, cornerMid),
    ...cubicPoints(cornerMid, { x: xR, z: hz + bend }, { x: hx + reach, z: hz }, { x: hx, z: hz }),
  ];
  const rightRun: P2[] = [{ x: gx1, z: zW }, ...driveCurve, ...frontEdge, ...corner];
  const outline: P2[] = [
    ...leftRun,
    { x: gx0, z: zOut },
    { x: gx1, z: zOut },
    ...rightRun,
  ];
  // Piedras sobre el contorno (sin el frente del edificio ni la entrada); tamaño sorteado con semilla fija.
  const R = rng(FORECOURT_SEED);
  const border = [
    ...alongPolyline(leftRun, fc.stoneSpacing, BUILDING_CLEAR, fc.gapClear),
    ...alongPolyline(rightRun, fc.stoneSpacing, fc.gapClear, BUILDING_CLEAR),
  ]
    .map(({ p }) => ({ x: p.x, z: p.z, size: fc.stoneSize[0] + (fc.stoneSize[1] - fc.stoneSize[0]) * R() }))
    // con un camino corto (pedregullo recortado) las curvas del camino rozan el muro: fuera las que tocarían pilar o muro
    .filter((s) => zW - s.z - s.size / 2 > WALL_CLEAR);
  // Lavandas: paralelas al borde delantero, corridas hacia afuera (normal con z > 0), sin las puntas curvas.
  const lavender = alongPolyline([frontStart, ...frontEdge], fc.lavenderSpacing, fc.lavenderSpacing / 2, fc.lavenderSpacing / 2).map(({ p, t }) => {
    const nz = Math.abs(t.x);
    const nx = -Math.sign(t.x) * t.z;
    return { x: p.x + nx * fc.lavenderOffset, z: p.z + nz * fc.lavenderOffset };
  });
  const forecourt = { outline, border, lavender };

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
    // la luz del frente cuelga entre los dos apliques de la puerta (eje de la puerta)
    [(frontSconces[0].x + frontSconces[1].x) / 2, pl.frontY, hz + pl.frontAhead],
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
    park: { garland },
    firePit,
    vegetation,
    forecourt,
    tables,
    pointLights,
    targetBounds,
  };
}

export const BARBATOS_LAYOUT = computeLayout(BARBATOS_DIMENSIONS);
