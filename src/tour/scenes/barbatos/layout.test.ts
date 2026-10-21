import { describe, expect, it } from "vitest";
import { BARBATOS_DIMENSIONS, type BarbatosDimensions } from "./dimensions";
import { BARBATOS_LAYOUT, computeLayout, hexagonVertices } from "./layout";

const L0 = BARBATOS_LAYOUT;
const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 4);

describe("borde de piedras del patio", () => {
  const { hz } = L0.hall;
  const edge = (side: 1 | -1) => L0.patio.x + (side * L0.patio.width) / 2;
  it("25 piedras de borde en el lado de la chimenea dentro del lote", () => {
    const { border, lavender } = L0.forecourt;
    expect(border).toHaveLength(25);
    expect(lavender).toHaveLength(13);
    for (const s of border) {
      expect(s.x).toBeLessThan(L0.lot.halfWidth);
      expect(s.x).toBeGreaterThan(edge(1) - 2.1);
      expect(s.z).toBeGreaterThanOrEqual(hz);
      expect(s.z).toBeLessThanOrEqual(L0.lot.zFront);
      expect(s.size).toBeGreaterThanOrEqual(0.4);
      expect(s.size).toBeLessThanOrEqual(0.6);
    }
  });
  it("nada bloquea la entrada abierta del frente", () => {
    const { x0, x1 } = L0.lot.entrance;
    for (const s of [...L0.forecourt.border, ...L0.forecourt.lavender]) expect(s.x < x0 || s.x > x1).toBe(true);
  });
  it("side = -1 espeja el borde hacia el lado opuesto", () => {
    const L = computeLayout({ ...BARBATOS_DIMENSIONS, forecourt: { ...BARBATOS_DIMENSIONS.forecourt, side: -1 } });
    const { border, lavender } = L.forecourt;
    expect(border).toHaveLength(25);
    for (const s of border) {
      expect(s.x).toBeGreaterThan(-L.lot.halfWidth);
      expect(s.x).toBeLessThan(edge(-1) + 2.1);
    }
    close(border[0].x, edge(-1));
    close(lavender[0].x, edge(-1) - 0.9);
    close(L0.forecourt.border[0].x, edge(1));
    close(L0.forecourt.lavender[0].x, edge(1) + 0.9);
  });
});

describe("layout de Barbato's con medidas reales", () => {
  it("salón y aberturas del frente", () => {
    expect(L0.hall).toMatchObject({ hx: 9, hz: 5, wallHeight: 3.5, ridgeHeight: 6.4, wallThickness: 0.3 });
    close(L0.hall.slope, Math.atan2(2.9, 5));
    expect(L0.frontDoor).toEqual({ x: -1.5, width: 2.3, height: 2.7, sill: 0, rows: 4 });
    const xs = L0.frontWindows.map((w) => w.x);
    [-5.5, 1.85, 4.45, 7.05].forEach((x, i) => close(xs[i], x));
    close(9 - (xs[3] + 0.75), 1.2);
    expect(L0.frontSconces).toEqual([
      { x: -3.25, y: 2.9 },
      { x: 0.25, y: 2.9 },
      { x: -8.2, y: 2.6 },
      { x: expect.closeTo(3.15, 4), y: 2.6 },
      { x: expect.closeTo(5.75, 4), y: 2.6 },
    ]);
  });
  it("las ventanas del frente quedan 1 a la izquierda y 3 a la derecha de la puerta", () => {
    expect(L0.frontWindows.filter((w) => w.x < L0.frontDoor.x)).toHaveLength(1);
    expect(L0.frontWindows.filter((w) => w.x > L0.frontDoor.x)).toHaveLength(3);
  });
  it("la puerta no pisa ninguna ventana del frente", () => {
    for (const w of L0.frontWindows)
      expect(Math.abs(w.x - L0.frontDoor.x)).toBeGreaterThanOrEqual((w.width + L0.frontDoor.width) / 2 + 0.5);
  });
  it("los 3 ventanales del fondo con 2 pilares de 0,5 m", () => {
    close(L0.backWindows[0].width, 4.3667);
    expect(L0.backWindows.map((w) => w.x)).toEqual([expect.closeTo(-4.8667, 3), 0, expect.closeTo(4.8667, 3)]);
    expect(L0.backWindowGrid).toEqual({ cols: 6, rows: 3 });
    expect(L0.backSconcesX).toEqual([expect.closeTo(-7.55, 3), expect.closeTo(-2.4333, 3), expect.closeTo(2.4333, 3), expect.closeTo(7.55, 3)]);
    expect(L0.backSconceY).toBe(2.6);
  });
  it("zócalo cortado en puerta y ventanales", () => {
    expect(L0.plinth.front).toHaveLength(2);
    expect(L0.plinth.front[0].x1).toBeCloseTo(-1.5 - 1.15, 4);
    expect(L0.plinth.front[1].x0).toBeCloseTo(-1.5 + 1.15, 4);
    expect(L0.plinth.back).toHaveLength(4);
  });
  it("hastial derecho, cerchas, chimenea, alfombra", () => {
    expect(L0.gableWindows.map((g) => g.z)).toEqual([-3.2, 3.2]);
    expect(L0.gableWindows.every((g) => g.height === 1.75 && g.sill === 1.05)).toBe(true);
    expect(L0.trussesX).toEqual([-7.2, -3.6, 0, 3.6, 7.2]);
    close(L0.chimney.x, 8.1);
    close(L0.chimney.hearthX, 7.48);
    expect(L0.carpet).toEqual({ x0: expect.closeTo(-8.5, 4), x1: expect.closeTo(7.2, 4), width: 1.8 });
  });
  it("la chimenea exterior sale del hastial +x", () => {
    const { stack, flue } = L0.chimney;
    close(stack.x - stack.depth / 2, L0.hall.hx);
    close(stack.height, 3.5);
    close(flue.top, 8.3);
    close(flue.base, stack.height);
    close(flue.x, stack.x + 0.03);
    expect(flue.x - flue.radius).toBeGreaterThan(L0.hall.hx + BARBATOS_DIMENSIONS.roof.gableOverhang);
  });
  it("el hogar interior queda bajo el cielorraso", () => {
    const { hz, wallHeight, slope } = L0.hall;
    expect(L0.chimney.height).toBeLessThan(wallHeight + (hz - L0.chimney.width / 2) * Math.tan(slope) - 0.2);
  });
  it("los equipos de aire quedan uno a cada lado del bloque, cada uno sobre su losa pegada al zócalo", () => {
    const { pads, units } = L0.acUnits;
    const { unit, pad } = BARBATOS_DIMENSIONS.acUnits;
    expect(units.map((u) => u.z)).toEqual([-2.1, 2.1]);
    expect(pads).toHaveLength(2);
    units.forEach((u, i) => {
      const p = pads[i];
      close(p.x - p.w / 2, L0.hall.hx + BARBATOS_DIMENSIONS.plinth.overhang);
      close(u.x, p.x);
      close(u.z, p.z);
      close(u.y, pad.h + unit.h / 2);
      expect(p.w).toBeGreaterThan(u.w);
      expect(p.d).toBeGreaterThan(u.d);
      // fuera del bloque exterior
      expect(Math.abs(u.z) - u.d / 2).toBeGreaterThan(L0.chimney.stack.width / 2);
    });
  });
  it("anexo, pérgola y galería", () => {
    expect(L0.annex).toMatchObject({ x: -12, width: 6, height: expect.closeTo(3.85, 4), zFront: expect.closeTo(5.06, 4), zBack: expect.closeTo(-10.35, 4) });
    expect(L0.pergola).toEqual({ z: 8, height: 3.4, columnsX: [expect.closeTo(-4.3, 4), expect.closeTo(1.3, 4)] });
    expect(L0.gallery).toMatchObject({ zInner: -5, zPosts: expect.closeTo(-10.1, 4), zRoofOuter: expect.closeTo(-10.35, 4), postHeight: 3.3, fasciaHeight: 0.3, postsX: [-6, -3, 0, 3, 6, 9] });
  });
  it("6 tramos de cortina cubren la galería sin huecos", () => {
    const { bays, z, topY, skirtHeight, rollRadius } = L0.gallery.curtains;
    expect(bays).toHaveLength(6);
    expect(bays[0].x0).toBe(-L0.hall.hx);
    expect(bays.at(-1)!.x1).toBe(L0.hall.hx);
    bays.slice(1).forEach((b, i) => expect(b.x0).toBe(bays[i].x1));
    expect(z).toBeCloseTo(L0.gallery.zPosts - 0.08, 6);
    expect(topY).toBeCloseTo(3.0, 6);
    expect(skirtHeight).toBe(0.9);
    expect(rollRadius).toBe(0.08);
  });
  it("ventanas del anexo", () => {
    const h = L0.annex.height;
    expect(L0.annex.frontWindow).toEqual({ x: -12, width: 0.7, height: 1.5, sill: L0.frontWindows[0].sill });
    expect(L0.annex.rearWindow).toEqual({ x: -12, width: 2.6, height: 0.55, sill: expect.closeTo(h / 2 - 0.275, 6) });
    expect(L0.annex.rearSconces).toEqual([
      { x: expect.closeTo(-12.9, 6), y: expect.closeTo(h / 2 - 0.275 + 0.55 + 0.4, 6) },
      { x: expect.closeTo(-11.1, 6), y: expect.closeTo(h / 2 - 0.275 + 0.55 + 0.4, 6) },
    ]);
    close(L0.annex.rearPlinth, 0.2 * h);
  });
  it("el anexo llega al borde del techo de la galería", () => { expect(L0.annex.zBack).toBe(L0.gallery.zRoofOuter); });
  it("lote de 60×38 anclado a la galería", () => {
    expect(L0.lot).toMatchObject({ zBack: expect.closeTo(-42.35, 4), zFront: expect.closeTo(17.65, 4), halfWidth: 19, centerZ: expect.closeTo(-12.35, 4), wallHeight: 2, frontWallHeight: 1.5, wallThickness: 0.2 });
    close(L0.lot.zBack, L0.gallery.zRoofOuter - 32);
    close(L0.lot.zFront - L0.lot.zBack, 60);
    close(L0.lot.zFront - L0.hall.hz, 12.65);
    expect(L0.targetBounds).toEqual({ min: [-23, 0, expect.closeTo(-44.35, 4)], max: [23, 7.4, expect.closeTo(17.65, 4)] });
  });
  it("la entrada del frente mide 4.5 y queda frente al anexo", () => {
    expect(L0.lot.entrance).toEqual({ x0: -14.25, x1: -9.75 });
    close((L0.lot.entrance.x0 + L0.lot.entrance.x1) / 2, L0.annex.x);
    expect(L0.lot.frontSegments).toEqual([{ x0: -19, x1: -14.25 }, { x0: -9.75, x1: 19 }]);
  });
  it("hexagonVertices da 6 vértices a radio r con lados iguales a r", () => {
    const v = hexagonVertices(2, -5, 3.5);
    expect(v).toHaveLength(6);
    expect(v[0].x).toBeCloseTo(2 + 3.5, 6);
    expect(v[0].z).toBeCloseTo(-5, 6);
    v.forEach((p, i) => {
      close(Math.hypot(p.x - 2, p.z + 5), 3.5);
      const n = v[(i + 1) % 6];
      close(Math.hypot(n.x - p.x, n.z - p.z), 3.5);
    });
  });
  it("el fogón está en x=-9 y a 7 del muro del fondo, con arena de circunradio 5", () => {
    const f = L0.firePit;
    close(f.z, -35.35);
    close(f.z - L0.lot.zBack, 7);
    expect(f).toMatchObject({ x: -9, ringRadius: 1.2, ringHeight: 0.55, basketRadius: 0.4, sandRadius: 5 });
    expect(f.sandVertices).toEqual(hexagonVertices(f.x, f.z, 5));
  });
  it("los postes de la guirnalda son los vértices de la arena", () => {
    expect(L0.park.garland).toEqual({ poles: L0.firePit.sandVertices, poleHeight: 2.8, hangY: 2.75, sag: 0.5, bulbSpacing: 0.375 });
  });
  it("el lote ya no cuelga el muro de park", () => { expect("wall" in L0.park).toBe(false); });
  it("parque, patio, mesas y luces", () => {
    expect("trees" in L0.park).toBe(false);
    expect(L0.patio).toEqual({ x: -2, z: 10, width: 30, depth: 10 });
    expect(L0.tables.slice(0, 4).map((t) => [t.z, t.kind])).toEqual([[2.4, "round"], [-2.4, "rect"], [2.4, "rect"], [-2.4, "round"]]);
    expect(L0.pointLights).toEqual([[expect.closeTo(-1.5, 4), 2.6, 5.8], [-4, 3.2, 0], [4, 3.2, 0], [expect.closeTo(7.2, 4), 0.9, 0], [0, 2.6, -7]]);
  });
  it("vegetación: plantines, álamos, formios, sauces, conífera y fotinia en coordenadas absolutas", () => {
    const v = L0.vegetation;
    const zb = L0.lot.zBack;
    expect(v.saplings.map((s) => [s.x, s.height])).toEqual([[-3, 2.5], [1.5, 2.2], [6, 3.0], [10.5, 2.4], [15, 2.8]]);
    for (const s of v.saplings) close(s.z, zb + 1.2);
    expect(v.wallRow.map((w) => w.x)).toEqual([-0.8, 3.8, 8.3, 12.8, 17.2]);
    for (const w of v.wallRow) { close(w.z, zb + 0.8); expect([w.height, w.radius]).toEqual([3.2, 0.25]); }
    expect(v.tallSaplings).toEqual([{ x: 5, z: -31, height: 6, radius: 1.2 }, { x: -8, z: -25, height: 5.5, radius: 1.2 }]);
    expect(v.poplars).toHaveLength(22);
    close(v.poplars[0].z, -14);
    close(v.poplars[21].z, zb + 1);
    expect(v.poplars.every((p) => Math.abs(p.x - (-19 + 1.2)) < 1e-9)).toBe(true);
    expect(v.poplars.slice(0, 4).map((p) => p.height)).toEqual([4.5, 4.9, 5.3, 4.5]);
    expect(v.phormiums).toHaveLength(8);
    close(v.phormiums[0].z, -16);
    close(v.phormiums[7].z, zb + 3);
    expect(v.phormiums.every((p) => Math.abs(p.x - (-19 + 2.2)) < 1e-9)).toBe(true);
    expect(v.willows).toEqual([{ x: -15.3, z: -32.8, height: 3.2 }, { x: -14.5, z: -39.5, height: 3.2 }, { x: -16, z: -36.2, height: 3.2 }, { x: -2.5, z: -38, height: 3.2 }]);
    expect(v.conifer).toEqual({ x: 15, z: 0, height: 6 });
    expect(v.photinia).toEqual({ x: 16.5, z: -16, height: 4.5 });
    expect(v.background).toEqual({ seed: 21, count: 18, minHeight: 6, maxHeight: 10 });
  });
  it("la vegetación respeta lote, edificio y arena", () => {
    const { lot, vegetation: v } = L0;
    const trees = [...v.saplings, ...v.poplars, ...v.phormiums, ...v.willows, v.conifer, v.photinia];
    for (const t of trees) {
      expect(Math.abs(t.x), `x ${t.x}`).toBeLessThan(lot.halfWidth);
      expect(t.z).toBeGreaterThan(lot.zBack);
      expect(t.z).toBeLessThan(lot.zFront);
      const inBuilding = t.x >= -15 && t.x <= 9.5 && t.z >= -10.35 && t.z <= 5.06;
      expect(inBuilding, `edificio ${t.x},${t.z}`).toBe(false);
    }
  });
  it("la luz del frente cuelga entre los apliques de la puerta", () => {
    expect(L0.pointLights[0][0]).toBeCloseTo((L0.frontSconces[0].x + L0.frontSconces[1].x) / 2, 6);
  });
  it("mesas", () => {
    expect(L0.tables.map((t) => t.x)).toEqual([-6.5, -6.5, -3.5, -3.5, -0.5, -0.5, 2.5, 2.5, 5.5, 5.5]);
    expect(L0.tables.every((t) => Math.abs(Math.abs(t.z) - 2.4) < 1e-9)).toBe(true);
  });
  it("las mesas no tocan el hogar", () => {
    expect(Math.max(...L0.tables.map((t) => t.x)) + 1.36).toBeLessThan(L0.chimney.x - L0.chimney.depth / 2);
  });
});

describe("anclaje: los elementos se mueven con su pared", () => {
  const withHall = (hall: Partial<BarbatosDimensions["hall"]>) =>
    computeLayout({ ...BARBATOS_DIMENSIONS, hall: { ...BARBATOS_DIMENSIONS.hall, ...hall } });
  it("alargar L corre el hogar, sus ventanas y el caño con el hastial derecho", () => {
    const L30 = withHall({ length: 30 });
    close(L30.chimney.x - L0.chimney.x, 6);
    close(L30.chimney.stack.x - L0.chimney.stack.x, 6);
    close(L30.chimney.flue.x - L0.chimney.flue.x, 6);
    close(L30.acUnits.pads[0].x - L0.acUnits.pads[0].x, 6);
    expect(L30.gableWindows.map((g) => g.z)).toEqual([-3.2, 3.2]);
  });
  it("alargar L conserva la distancia de cada ventana del frente a su esquina", () => {
    const L30 = withHall({ length: 30 });
    close(L30.frontWindows[0].x - -L30.hall.hx, 3.5);
    expect(L30.frontWindows.slice(1).map((w) => L30.hall.hx - w.x)).toEqual([7.15, 4.55, 1.95].map((v) => expect.closeTo(v, 4)));
    close(L30.backWindows[0].x - L30.backWindows[0].width / 2, -L30.hall.hx + 1.95);
  });
  it("ensanchar W corre pérgola, anexo y galería, y el anexo sigue llegando al techo de la galería", () => {
    const W14 = withHall({ width: 14 });
    expect(W14.pergola.z).toBe(10);
    expect(W14.annex.zFront).toBeCloseTo(7.06, 4);
    close(W14.gallery.zRoofOuter, -12.35);
    expect(W14.annex.zBack).toBe(W14.gallery.zRoofOuter);
  });
});

describe("medidas editables sin ventana a la izquierda de la puerta", () => {
  it("no tira y los apliques del frente se calculan con lo que haya", () => {
    const d = structuredClone(BARBATOS_DIMENSIONS);
    d.frontWindows.centers = d.frontWindows.centers.filter((c) => c.from !== "front-left");
    const L = computeLayout(d);
    expect(L.frontWindows).toHaveLength(3);
    expect(L.frontSconces.slice(0, 2)).toEqual([{ x: -3.25, y: 2.9 }, { x: 0.25, y: 2.9 }]);
    expect(L.frontSconces).toHaveLength(4);
  });
});
