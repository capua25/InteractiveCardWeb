import { describe, expect, it } from "vitest";
import { BARBATOS_DIMENSIONS, type BarbatosDimensions } from "./dimensions";
import { BARBATOS_LAYOUT, computeLayout } from "./layout";

const L0 = BARBATOS_LAYOUT;
const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 4);

describe("layout de Barbato's reproduce el v6", () => {
  it("salón y aberturas del frente", () => {
    expect(L0.hall).toMatchObject({ hx: 12, hz: 6, wallHeight: 3.5, ridgeHeight: 7, wallThickness: 0.3 });
    close(L0.hall.slope, Math.atan2(3.5, 6));
    expect(L0.frontDoor).toEqual({ x: 0, width: 2.5, height: 2.7, sill: 0 });
    expect(L0.frontWindows.map((w) => w.x)).toEqual([-5.5, 4, 7, 10]);
    expect(L0.frontSconces).toEqual([{ x: -1.85, y: 2.9 }, { x: 1.85, y: 2.9 }, { x: -8.2, y: 2.6 }, { x: 5.5, y: 2.6 }, { x: 8.5, y: 2.6 }]);
  });
  it("las ventanas del frente quedan 1 a la izquierda y 3 a la derecha de la puerta", () => {
    expect(L0.frontWindows.filter((w) => w.x < L0.frontDoor.x)).toHaveLength(1);
    expect(L0.frontWindows.filter((w) => w.x > L0.frontDoor.x)).toHaveLength(3);
  });
  it("los 3 ventanales del fondo cubren ≈20 m con 2 pilares de 0,5 m", () => {
    const [a, , c] = L0.backWindows;
    close(a.x - a.width / 2, -10.05);
    close(c.x + c.width / 2, 10.05);
    close(a.width, (20.1 - 1) / 3);
    expect(L0.backWindows.map((w) => w.x)).toEqual([expect.closeTo(-6.8667, 3), 0, expect.closeTo(6.8667, 3)]);
    expect(L0.backWindowGrid).toEqual({ cols: 6, rows: 3 });
    expect(L0.backSconcesX).toEqual([-10.55, expect.closeTo(-3.4333, 3), expect.closeTo(3.4333, 3), 10.55]);
  });
  it("zócalo cortado en puerta y ventanales", () => {
    expect(L0.plinth.front).toEqual([{ x0: -12.06, x1: -1.25 }, { x0: 1.25, x1: 12.06 }]);
    expect(L0.plinth.back).toHaveLength(4);
  });
  it("hastial derecho, cerchas, chimenea, alfombra", () => {
    expect(L0.gableWindows.map((g) => g.z)).toEqual([-3.8, 3.8]);
    expect(L0.trussesX).toEqual([-8, -4, 0, 4, 8]);
    close(L0.chimney.x, 11.1);
    close(L0.chimney.hearthX, 10.48);
    expect(L0.chimney.flue).toMatchObject({ base: 5.6, top: 8.8, radius: 0.32 });
    expect(L0.carpet).toEqual({ x0: -11.5, x1: expect.closeTo(10.2, 4), width: 1.8 });
  });
  it("el caño queda sobre el hogar", () => { expect(L0.chimney.flue.x).toBe(L0.chimney.x); });
  it("anexo, pérgola y galería", () => {
    expect(L0.annex).toEqual({ x: -15, width: 6, height: 3.2, zFront: 4, zBack: -9.35 });
    expect(L0.pergola).toEqual({ z: 9, height: 3.4, columnsX: [-2.4, 2.4] });
    expect(L0.gallery).toMatchObject({ zInner: -6, zPosts: -9.1, zRoofOuter: -9.35, postsX: [-8, -4, 0, 4, 8, 12] });
  });
  it("el anexo llega al borde del techo de la galería", () => { expect(L0.annex.zBack).toBe(L0.gallery.zRoofOuter); });
  it("parque, patio, mesas, luces y caja del target", () => {
    expect(L0.park.wall).toEqual({ zStart: -9.4, z: -26, halfWidth: 21, height: 1.1 });
    expect(L0.park.trees).toEqual([[-15,-16,1.1],[-7,-21,1.3],[4,-22,1.2],[13,-15,1],[17,-21,1.2],[-18,-22,0.9],[-20,10,1.1],[20,12,1]].map(([x,z,scale]) => ({ x, z, scale })));
    expect(L0.park.garland).toEqual({ z: -17, polesX: [-9, -3, 3, 9] });
    expect(L0.patio).toEqual({ x: -2, z: 11, width: 30, depth: 10 });
    expect(L0.tables.map((t) => t.x)).toEqual([-9, -9, -5.5, -5.5, -2, -2, 1.5, 1.5, 5, 5]);
    expect(L0.tables.slice(0, 4).map((t) => [t.z, t.kind])).toEqual([[3.4, "round"], [-3.4, "rect"], [3.4, "rect"], [-3.4, "round"]]);
    expect(L0.pointLights).toEqual([[0, 2.6, 6.8], [-4, 3.2, 0], [4, 3.2, 0], [expect.closeTo(10.2, 4), 0.9, 0], [0, 2.6, -8]]);
    expect(L0.targetBounds).toEqual({ min: [-25, 0, -28], max: [25, 8, 16] });
  });
});

describe("anclaje: los elementos se mueven con su pared", () => {
  const withHall = (hall: Partial<BarbatosDimensions["hall"]>) =>
    computeLayout({ ...BARBATOS_DIMENSIONS, hall: { ...BARBATOS_DIMENSIONS.hall, ...hall } });
  it("alargar L corre el hogar, sus ventanas y el caño con el hastial derecho", () => {
    const L30 = withHall({ length: 30 });
    close(L30.chimney.x - L0.chimney.x, 3);
    close(L30.chimney.flue.x, L30.chimney.x);
    expect(L30.gableWindows.map((g) => g.z)).toEqual([-3.8, 3.8]);
  });
  it("alargar L conserva la distancia de cada ventana del frente a su esquina", () => {
    const L30 = withHall({ length: 30 });
    close(L30.frontWindows[0].x - -L30.hall.hx, 6.5);
    expect(L30.frontWindows.slice(1).map((w) => L30.hall.hx - w.x)).toEqual([8, 5, 2]);
    close(L30.backWindows[0].x - L30.backWindows[0].width / 2, -L30.hall.hx + 1.95);
  });
  it("ensanchar W corre pérgola, anexo y galería, y el anexo sigue llegando al techo de la galería", () => {
    const W14 = withHall({ width: 14 });
    expect(W14.pergola.z).toBe(10);
    expect(W14.annex.zFront).toBe(5);
    close(W14.gallery.zRoofOuter, -10.35);
    expect(W14.annex.zBack).toBe(W14.gallery.zRoofOuter);
  });
});
