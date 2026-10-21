import { describe, expect, it } from "vitest";
import { pickQuality } from "./quality";

describe("pickQuality", () => {
  it("mobile por pointer coarse: pixel ratio 1,5 y sombras 1024", () => {
    expect(pickQuality({ coarsePointer: true, width: 1200, dpr: 3 })).toMatchObject({ pixelRatio: 1.5, shadowMapSize: 1024 });
  });
  it("mobile por ancho < 768", () => {
    expect(pickQuality({ coarsePointer: false, width: 767, dpr: 2 })).toMatchObject({ pixelRatio: 1.5, shadowMapSize: 1024 });
  });
  it("desktop: pixel ratio hasta 2 y sombras 2048", () => {
    expect(pickQuality({ coarsePointer: false, width: 1440, dpr: 3 })).toMatchObject({ pixelRatio: 2, shadowMapSize: 2048 });
  });
  it("no sube el pixel ratio por encima del dpr real", () => {
    expect(pickQuality({ coarsePointer: true, width: 400, dpr: 1 }).pixelRatio).toBe(1);
  });
  it("detalle de geometría: alto en desktop, bajo en mobile", () => {
    expect(pickQuality({ coarsePointer: false, width: 1440, dpr: 1 }).detail).toBe("high");
    expect(pickQuality({ coarsePointer: true, width: 400, dpr: 1 }).detail).toBe("low");
  });
  it("tope de anisotropía 4 y antialias activo", () => {
    expect(pickQuality({ coarsePointer: false, width: 1440, dpr: 1 })).toMatchObject({ maxAnisotropy: 4, antialias: true });
  });
});
