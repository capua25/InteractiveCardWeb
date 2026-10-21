import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BARBATOS_LAYOUT } from "./layout";
import { createLights } from "./lights";

const lights = createLights(BARBATOS_LAYOUT, { pixelRatio: 1.5, shadowMapSize: 1024, antialias: true, maxAnisotropy: 4, detail: "low" });

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
    const c = BARBATOS_LAYOUT.lot.centerZ;
    expect(sun.target.position.x).toBeCloseTo(0);
    expect(sun.target.position.y).toBeCloseTo(0);
    expect(sun.target.position.z).toBeCloseTo(c);
    expect(sun.position.x).toBeCloseTo(7.8);
    expect(sun.position.y).toBeCloseTo(13);
    expect(sun.position.z).toBeCloseTo(c - 57.2);
    expect(sun.castShadow).toBe(true);
    expect(sun.shadow.mapSize.toArray()).toEqual([1024, 1024]);
    expect(lights).toContain(sun.target);
  });
  it("la dirección del sol no cambió", () => {
    const sun = lights.find((l) => l instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
    const dir = sun.position.clone().sub(sun.target.position).normalize();
    const ref = new THREE.Vector3(6, 10, -44).normalize();
    expect(dir.distanceTo(ref)).toBeLessThan(1e-6);
  });
  it("la cámara de sombra cubre el lote", () => {
    const sun = lights.find((l) => l instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
    const cam = sun.shadow.camera as THREE.OrthographicCamera;
    expect(cam.right - cam.left).toBeGreaterThanOrEqual(2 * BARBATOS_LAYOUT.lot.halfWidth + 8);
    expect([cam.left, cam.right, cam.top, cam.bottom, cam.near, cam.far]).toEqual([-26, 26, 20, -16, 5, 140]);
  });
  it("5 point lights cálidas sin sombra en las posiciones del layout", () => {
    const points = lights.filter((l) => l instanceof THREE.PointLight) as THREE.PointLight[];
    expect(points.map((p) => p.position.toArray())).toEqual(BARBATOS_LAYOUT.pointLights.map((p) => [...p]));
    expect(points.every((p) => p.color.getHexString() === "ffb466" && !p.castShadow)).toBe(true);
    expect(points.map((p) => [p.intensity, p.distance])).toEqual([[9, 9], [14, 16], [14, 16], [10, 8], [6, 12]]);
  });
});
