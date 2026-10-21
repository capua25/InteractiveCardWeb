import { describe, expect, it } from "vitest";
import { BARBATOS_DIMENSIONS, type BarbatosDimensions } from "./dimensions";
import { BARBATOS_LAYOUT, computeLayout, hexagonVertices, type BarbatosLayout } from "./layout";
import { treeCrowns } from "./elements/vegetation";

const L0 = BARBATOS_LAYOUT;
const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 4);

// Punto dentro de polígono (par-impar) y distancia mínima a una polilínea.
const inside = (p: { x: number; z: number }, poly: { x: number; z: number }[]) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.z > p.z !== b.z > p.z && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) c = !c;
  }
  return c;
};
const distToPolyline = (p: { x: number; z: number }, pts: { x: number; z: number }[]) => {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz)));
  }
  return best;
};

describe("pedregullo curvo del frente", () => {
  const check = (L: BarbatosLayout) => {
    const { hx, hz } = L.hall;
    const { outline, border, lavender } = L.forecourt;
    const { x0, x1 } = L.lot.entrance;
    const zW = L.lot.zFront;
    const closed = [...outline, outline[0]];
    // pasa por la entrada y toca la cara interior de ambos pilares
    expect(outline.some((p) => Math.abs(p.x - x0) < 1e-9 && Math.abs(p.z - zW) < 1e-9)).toBe(true);
    expect(outline.some((p) => Math.abs(p.x - x1) < 1e-9 && Math.abs(p.z - zW) < 1e-9)).toBe(true);
    expect(inside({ x: (x0 + x1) / 2, z: zW - 0.05 }, outline)).toBe(true);
    // arranca en el frente del edificio y no se mete detrás de él
    for (const p of outline) expect(p.z).toBeGreaterThanOrEqual(hz - 1e-9);
    expect(outline.filter((p) => Math.abs(p.z - hz) < 1e-9).map((p) => p.x).sort((a, b) => a - b)).toEqual([L.annex.x - L.annex.width / 2 - 2, hx]);
    // piedras sobre el contorno, fuera de la entrada y del edificio, dentro del lote
    expect(border.length).toBeGreaterThan(60);
    for (const s of border) {
      expect(distToPolyline(s, closed)).toBeLessThan(0.02);
      // ninguna contra el edificio (anexo + salón, de su borde -x al hastial +x)
      if (s.x > L.annex.x - L.annex.width / 2 - 0.3 && s.x < hx + 0.3) expect(s.z).toBeGreaterThan(hz + 0.3);
      expect(s.z).toBeGreaterThan(hz);
      expect(Math.abs(s.x)).toBeLessThan(L.lot.halfWidth);
      expect(s.size).toBeGreaterThanOrEqual(0.6);
      expect(s.size).toBeLessThanOrEqual(0.9);
    }
    // ninguna piedra (con su radio) toca el muro del frente ni los pilares (semiancho 0.275 + banda 0.02)
    for (const s of border) expect(zW - s.z - s.size / 2).toBeGreaterThan(0.295);
    // ni las veredas de cemento (perimetral: ±(hx+0.3), hz..hz+0.9; de la puerta: ±5 del eje, hasta pérgola+0.6)
    const rects = [
      { x0: -hx - 0.3, x1: hx + 0.3, z0: hz, z1: hz + 0.9 },
      { x0: L.frontDoor.x - 5, x1: L.frontDoor.x + 5, z0: hz, z1: L.pergola.z + 0.6 },
    ];
    for (const s of border) {
      for (const r of rects) {
        const dx = Math.max(r.x0 - s.x, 0, s.x - r.x1);
        const dz = Math.max(r.z0 - s.z, 0, s.z - r.z1);
        expect(Math.hypot(dx, dz)).toBeGreaterThan(s.size / 2);
      }
    }
    // separación pareja: vecinas entre 0.3 y 0.6 m
    for (let i = 1; i < border.length; i++) {
      const d = Math.hypot(border[i].x - border[i - 1].x, border[i].z - border[i - 1].z);
      if (d < 2) expect(d).toBeGreaterThan(0.3);
      if (d < 2) expect(d).toBeLessThan(0.6);
    }
    // lavandas fuera del pedregullo, delante de su borde, entre la entrada y el extremo del salón, dentro del lote
    expect(lavender.length).toBeGreaterThan(10);
    for (const p of lavender) {
      expect(inside(p, outline)).toBe(false);
      expect(distToPolyline(p, closed)).toBeGreaterThan(0.7);
      expect(p.z).toBeGreaterThan((hz + zW) / 2);
      expect(p.z).toBeLessThan(zW - 0.5);
      expect(p.x).toBeGreaterThan(x1);
      expect(p.x).toBeLessThan(hx);
    }
    return { outline, border, lavender };
  };

  it("contorno por la entrada, piedras en el borde y lavandas delante (medidas reales)", () => {
    const { outline, border, lavender } = check(L0);
    const xs = outline.map((p) => p.x);
    close(Math.min(...xs), -17);
    close(Math.max(...xs), L0.hall.hx + 3); // la esquina redonda sale 3 m más allá del hastial +x, como en el croquis
    close(Math.max(...outline.map((p) => p.z)), L0.lot.zFront + L0.lot.wallThickness / 2);
    expect(border).toHaveLength(97);
    expect(lavender).toHaveLength(16);
  });

  it("recorta un pedregullo más profundo que el lote y rechaza un lote sin lugar delante del salón", () => {
    const D = BARBATOS_DIMENSIONS;
    const room = L0.lot.zFront - L0.hall.hz;
    const deep = computeLayout({ ...D, forecourt: { ...D.forecourt, depth: room + 5 } });
    check(deep);
    // el borde delantero queda a 2 m del muro: el punto donde termina la curva del camino derecho
    const frontStart = deep.forecourt.outline.find((p) => Math.abs(p.x - (deep.lot.entrance.x1 + D.forecourt.driveTurn)) < 1e-9)!;
    close(frontStart.z, deep.lot.zFront - 2);
    check(computeLayout({ ...D, hall: { ...D.hall, width: 14 } })); // salón más ancho: menos lote delante, sigue entrando
    expect(() => computeLayout({ ...D, lot: { ...D.lot, length: 45 } })).toThrow(/pedregullo/);
  });

  it("sigue a las anclas cuando cambian las medidas (anexo, entrada, salón)", () => {
    const D = BARBATOS_DIMENSIONS;
    const L = computeLayout({
      ...D,
      hall: { ...D.hall, length: 20 },
      lot: { ...D.lot, entrance: { width: 5, centerFromAnnex: 0.5 } },
      forecourt: { ...D.forecourt, pastHall: 2 },
    });
    const { outline } = check(L);
    close(Math.max(...outline.map((p) => p.x)), 12);
  });
});

describe("layout de Barbato's con medidas reales", () => {
  it("salón y aberturas del frente", () => {
    expect(L0.hall).toMatchObject({ hx: 9, hz: 5, wallHeight: 3.5, ridgeHeight: 6.4, wallThickness: 0.3 });
    close(L0.hall.slope, Math.atan2(2.9, 5));
    expect(L0.frontDoor).toEqual({ x: -3, width: 2.6, height: 2.7, sill: 0, rows: 4 });
    const xs = L0.frontWindows.map((w) => w.x);
    [-7.6, 1.65, 4.6, 7.55].forEach((x, i) => close(xs[i], x));
    close(9 - (xs[3] + 0.8), 0.65);
    expect(L0.frontSconces).toEqual([
      { x: expect.closeTo(-5.55, 4), y: 2.4 },
      { x: expect.closeTo(-0.425, 4), y: 2.4 },
      { x: expect.closeTo(3.125, 4), y: 2.4 },
      { x: expect.closeTo(6.075, 4), y: 2.4 },
    ]);
  });
  it("cada aplique del frente queda en el punto medio del paño entre dos aberturas vecinas", () => {
    const openings = [L0.frontDoor, ...L0.frontWindows].sort((a, b) => a.x - b.x);
    const mids = openings.slice(1).map((o, i) => {
      const prev = openings[i];
      return (prev.x + prev.width / 2 + o.x - o.width / 2) / 2;
    });
    const xs = L0.frontSconces.map((s) => s.x).sort((a, b) => a - b);
    expect(xs).toHaveLength(4);
    xs.forEach((x, i) => close(x, mids[i]));
    // ninguno fuera de las ventanas extremas
    expect(xs[0]).toBeGreaterThan(L0.frontWindows[0].x);
    expect(xs[3]).toBeLessThan(L0.frontWindows[3].x);
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
    expect(L0.plinth.front[0].x1).toBeCloseTo(-3 - 1.3, 4);
    expect(L0.plinth.front[1].x0).toBeCloseTo(-3 + 1.3, 4);
    expect(L0.plinth.back).toHaveLength(4);
  });
  it("hastial derecho, cerchas, chimenea, alfombra", () => {
    expect(L0.gableWindows.map((g) => g.z)).toEqual([-3.2, 3.2]);
    expect(L0.gableWindows.every((g) => g.height === 1.75 && g.sill === 0.9)).toBe(true);
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
    expect(L0.pergola).toEqual({ z: 8, height: 3.4, columnsX: [expect.closeTo(-5.8, 4), expect.closeTo(-0.2, 4)] });
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
  it("el cierre norte cubre la galería en z, pegado al extremo +x", () => {
    const { end, z } = L0.gallery.curtains;
    expect(end.x).toBeCloseTo(L0.hall.hx + 0.08, 6);
    expect(end.bays).toHaveLength(2);
    expect(end.bays[0].z0).toBeCloseTo(-L0.hall.hz, 6);
    expect(end.bays.at(-1)!.z1).toBeCloseTo(z, 6);
    end.bays.slice(1).forEach((b, i) => expect(b.z0).toBeCloseTo(end.bays[i].z1, 6));
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
    expect(L0.tables.slice(0, 4).map((t) => [t.z, t.kind])).toEqual([[2.4, "round"], [-2.4, "rect"], [2.4, "rect"], [-2.4, "round"]]);
    expect(L0.pointLights).toEqual([[expect.closeTo(-3, 4), 2.6, 5.8], [-4, 3.2, 0], [4, 3.2, 0], [expect.closeTo(7.2, 4), 0.9, 0], [0, 2.6, -7]]);
  });
  it("vegetación: plantines, álamos, formios, sauces, conífera y fotinia en coordenadas absolutas", () => {
    const v = L0.vegetation;
    const zb = L0.lot.zBack;
    expect(v.saplings.map((s) => [s.x, s.height])).toEqual([[-3, 2.5], [1.5, 2.2], [6, 3.0], [10.5, 2.4], [15, 2.8]]);
    for (const s of v.saplings) close(s.z, zb + 1.2);
    expect(v.wallRow.map((w) => w.x)).toEqual([-0.8, 3.8, 8.3, 12.8, 17.2]);
    for (const w of v.wallRow) { close(w.z, zb + 0.8); expect([w.height, w.radius]).toEqual([3.2, 0.5]); }
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
    expect(v.willows.map((w) => [w.x, w.z, w.height])).toEqual(
      [[-15.3, -32.8, 3.2], [-14.5, -39.5, 3.2], [-15.25, -37.3, 3.2], [-2.5, -38, 3.2]].map((r) => r.map((n) => expect.closeTo(n, 6))),
    );
    expect(v.tallSaplings.map((t) => [t.x, t.z, t.height])).toEqual([[5, -31, 6], [-8, -25, 5.5]].map((r) => r.map((n) => expect.closeTo(n, 6))));
    close(v.photinia.x, 16.5);
    close(v.photinia.z, -16);
    expect(v.photinia.height).toBe(4.5);
    expect("conifer" in v).toBe(false);
    expect("background" in v).toBe(false);
  });
  it("la vegetación respeta lote, edificio y arena", () => expectParkClear(L0));
  it("los sauces no pisan la columna de álamos", () => {
    const crowns = treeCrowns(L0);
    const poplars = crowns.filter((c) => c.kind === "poplar");
    expect(poplars).toHaveLength(L0.vegetation.poplars.length);
    // columnas anchas: 1 m hacia el pasto y 1.3 m a lo largo del muro (se tocan con las vecinas, a 1.3 m)
    expect(poplars[0]).toMatchObject({ rx: 1, rz: 1.3 });
    // distancia del centro del sauce al borde de cada elipse de álamo ≥ radio del sauce
    const gapToEllipse = (px: number, pz: number, e: { x: number; z: number; rx: number; rz: number }) =>
      Math.min(...Array.from({ length: 720 }, (_, k) => (k / 720) * Math.PI * 2).map((a) => Math.hypot(px - e.x - Math.cos(a) * e.rx, pz - e.z - Math.sin(a) * e.rz)));
    for (const w of L0.vegetation.willows) {
      const willowR = crowns.find((c) => c.x === w.x && c.z === w.z)!.radius;
      for (const p of poplars) expect(gapToEllipse(w.x, w.z, p), `sauce ${w.x},${w.z}`).toBeGreaterThanOrEqual(willowR);
    }
  });
  it("la luz del frente cuelga en el eje de la puerta, entre sus dos apliques", () => {
    expect(L0.pointLights[0][0]).toBeCloseTo(L0.frontDoor.x, 6);
    expect(L0.pointLights[0][0]).toBeGreaterThan(L0.frontSconces[0].x);
    expect(L0.pointLights[0][0]).toBeLessThan(L0.frontSconces[1].x);
  });
  it("mesas", () => {
    expect(L0.tables.map((t) => t.x)).toEqual([-6.5, -6.5, -3.5, -3.5, -0.5, -0.5, 2.5, 2.5, 5.5, 5.5]);
    expect(L0.tables.every((t) => Math.abs(Math.abs(t.z) - 2.4) < 1e-9)).toBe(true);
  });
  it("las mesas no tocan el hogar", () => {
    expect(Math.max(...L0.tables.map((t) => t.x)) + 1.36).toBeLessThan(L0.chimney.x - L0.chimney.depth / 2);
  });
});

// Rectángulo del edificio derivado del layout: del anexo a las losas de aire, de la galería al frente del anexo.
const buildingRect = (L: BarbatosLayout) => ({
  x0: L.annex.x - L.annex.width / 2,
  x1: Math.max(...L.acUnits.pads.map((p) => p.x + p.w / 2)),
  z0: L.gallery.zRoofOuter,
  z1: L.annex.zFront,
});
const segDist = (px: number, pz: number, a: { x: number; z: number }, b: { x: number; z: number }) => {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (a.x + t * dx), pz - (a.z + t * dz));
};
// Ninguna copa sale del lote, toca el edificio ni se acerca a la arena/postes (≥0.5 m).
function expectParkClear(L: BarbatosLayout) {
  const { lot, firePit } = L;
  const r = buildingRect(L);
  const hex = firePit.sandVertices;
  for (const c of treeCrowns(L)) {
    const tag = `${c.x.toFixed(2)},${c.z.toFixed(2)}`;
    // dentro de la cara interior de los muros (huella elíptica: semieje x hacia los laterales, z hacia el fondo)
    expect(Math.abs(c.x) + c.rx, `lote x ${tag}`).toBeLessThan(lot.halfWidth - lot.wallThickness / 2);
    expect(c.z - c.rz, `fondo ${tag}`).toBeGreaterThan(lot.zBack + lot.wallThickness / 2);
    expect(c.z, `frente ${tag}`).toBeLessThan(lot.zFront);
    const dx = Math.max(r.x0 - c.x, 0, c.x - r.x1);
    const dz = Math.max(r.z0 - c.z, 0, c.z - r.z1);
    expect(Math.hypot(dx, dz) - c.radius, `edificio ${tag}`).toBeGreaterThanOrEqual(0);
    expect(Math.hypot(c.x - firePit.x, c.z - firePit.z), `centro en arena ${tag}`).toBeGreaterThan(firePit.sandRadius * Math.cos(Math.PI / 6));
    for (let k = 0; k < 6; k++) {
      expect(segDist(c.x, c.z, hex[k], hex[(k + 1) % 6]) - c.radius, `arena ${tag}`).toBeGreaterThanOrEqual(0.5);
      expect(Math.hypot(c.x - hex[k].x, c.z - hex[k].z) - c.radius, `poste ${tag}`).toBeGreaterThanOrEqual(0.5);
    }
  }
}

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
    close(L30.frontWindows[0].x - -L30.hall.hx, 1.4);
    expect(L30.frontWindows.slice(1).map((w) => L30.hall.hx - w.x)).toEqual([7.35, 4.4, 1.45].map((v) => expect.closeTo(v, 4)));
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

describe("parque con medidas cambiadas", () => {
  it("fondo a 25 m de la galería y salón de 16 m: el fogón y los árboles siguen sus anclas", () => {
    const d = structuredClone(BARBATOS_DIMENSIONS);
    d.lot.backWallFromGallery = 25;
    d.hall.length = 16;
    const L = computeLayout(d);
    close(L.firePit.x, -L.hall.hx);
    close(L.firePit.z, L.lot.zBack + 7);
    close(L.vegetation.photinia.x, L.lot.halfWidth - 2.5);
    close(L.vegetation.willows[0].z - L.firePit.z, 2.55);
    expectParkClear(L);
  });
});

describe("medidas editables sin ventana a la izquierda de la puerta", () => {
  it("no tira y los apliques del frente se calculan con lo que haya", () => {
    const d = structuredClone(BARBATOS_DIMENSIONS);
    d.frontWindows.centers = d.frontWindows.centers.filter((c) => c.from !== "front-left");
    const L = computeLayout(d);
    expect(L.frontWindows).toHaveLength(3);
    // sin ventana a la izquierda: a doorGap de la jamba; a la derecha sigue el punto medio hasta la ventana
    expect(L.frontSconces.slice(0, 2)).toEqual([{ x: expect.closeTo(-4.3 - 1.27, 4), y: 2.4 }, { x: expect.closeTo(-0.425, 4), y: 2.4 }]);
    expect(L.frontSconces).toHaveLength(4);
  });
});
