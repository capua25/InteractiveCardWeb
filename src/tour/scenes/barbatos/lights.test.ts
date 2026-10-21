import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BARBATOS_LAYOUT } from "./layout";
import { createLights } from "./lights";

const lights = createLights(BARBATOS_LAYOUT, { pixelRatio: 1.5, shadowMapSize: 1024, antialias: true, maxAnisotropy: 4 });

describe("createLights", () => {
  it("hemisférica cálida del v6", () => {
    const h = lights.find((l) => l instanceof THREE.HemisphereLight) as THREE.HemisphereLight;
    expect(h.color.getHexString()).toBe("ffd2a8");
    expect(h.groundColor.getHexString()).toBe("5a4634");
    expect(h.intensity).toBe(1.25);
  });
  it("sol de atardecer desde el oeste con sombra del tamaño de la calidad", () => {
    const sun = lights.find((l) => l instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
    expect(sun.color.getHexString()).toBe("ffb36b");
    expect(sun.intensity).toBe(3);
    expect(sun.position.toArray()).toEqual([6, 10, -48]);
    expect(sun.castShadow).toBe(true);
    expect(sun.shadow.mapSize.toArray()).toEqual([1024, 1024]);
    expect(lights).toContain(sun.target);
    expect(sun.target.position.toArray()).toEqual([0, 0, -4]);
  });
  it("5 point lights cálidas sin sombra en las posiciones del layout", () => {
    const points = lights.filter((l) => l instanceof THREE.PointLight) as THREE.PointLight[];
    expect(points.map((p) => p.position.toArray())).toEqual(BARBATOS_LAYOUT.pointLights.map((p) => [...p]));
    expect(points.every((p) => p.color.getHexString() === "ffb466" && !p.castShadow)).toBe(true);
    expect(points.map((p) => [p.intensity, p.distance])).toEqual([[9, 9], [14, 16], [14, 16], [10, 8], [6, 12]]);
  });
});
