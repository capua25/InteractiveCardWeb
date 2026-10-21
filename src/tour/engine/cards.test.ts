import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { addColumn, addCrown, CardBuilder } from "./cards";
import { rng } from "./textures";

const quads = (g: THREE.BufferGeometry) => {
  const pos = g.getAttribute("position"), nor = g.getAttribute("normal");
  return Array.from({ length: pos.count / 4 }, (_, c) => {
    const vs = [0, 1, 2, 3].map((k) => new THREE.Vector3().fromBufferAttribute(pos, c * 4 + k));
    const ns = [0, 1, 2, 3].map((k) => new THREE.Vector3().fromBufferAttribute(nor, c * 4 + k));
    const center = vs.reduce((a, v) => a.add(v), new THREE.Vector3()).multiplyScalar(0.25);
    const plane = new THREE.Vector3().crossVectors(vs[1].clone().sub(vs[0]), vs[3].clone().sub(vs[0])).normalize();
    return { vs, ns, center, plane };
  });
};

describe("cards", () => {
  it("una tarjeta mapea la región del atlas pedida (v = 0 abajo)", () => {
    const b = new CardBuilder().add({
      center: new THREE.Vector3(), normal: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0),
      width: 1, height: 2, bendFrom: new THREE.Vector3(0, 0, -1), bend: 0, uv: [0.5, 0, 1, 1],
    });
    const g = b.geometry();
    const uv = g.getAttribute("uv"), pos = g.getAttribute("position");
    for (let k = 0; k < 4; k++) {
      expect(uv.getX(k)).toBeCloseTo(pos.getX(k) > 0 ? 1 : 0.5, 6);
      expect(uv.getY(k)).toBeCloseTo(pos.getY(k) > 0 ? 1 : 0, 6);
    }
  });

  it("copa: normales hacia afuera del centro y ninguna tarjeta acostada (ni en los polos)", () => {
    const b = new CardBuilder();
    const center = new THREE.Vector3(3, 2, -1);
    addCrown(b, { center, radii: new THREE.Vector3(1, 1.5, 1), count: 40, size: 0.8, flatten: 1 }, rng(3));
    for (const q of quads(b.geometry())) {
      for (const [k, n] of q.ns.entries()) expect(n.dot(q.vs[k].clone().sub(center))).toBeGreaterThan(0);
      // plano de la tarjeta a más de ~30° de la horizontal: |normal.y| < cos(30°)
      expect(Math.abs(q.plane.y)).toBeLessThan(Math.cos(Math.PI / 6));
    }
  });

  it("columna: tarjetas verticales que cubren exactamente de `from` a `to`, más angosta arriba", () => {
    const b = new CardBuilder();
    addColumn(b, { base: new THREE.Vector3(1, 0, 1), from: 0.4, to: 5, radius: 0.6, count: 20, size: 0.8 }, rng(5));
    const qs = quads(b.geometry());
    const ys = qs.flatMap((q) => q.vs.map((v) => v.y));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0.4 - 0.05);
    expect(Math.min(...ys)).toBeLessThan(0.5);
    expect(Math.max(...ys)).toBeLessThanOrEqual(5 + 0.05);
    expect(Math.max(...ys)).toBeGreaterThan(4.6);
    for (const q of qs) expect(Math.abs(q.plane.y)).toBeLessThan(0.3);
    const width = (q: (typeof qs)[number]) => q.vs[0].distanceTo(q.vs[1]);
    expect(width(qs[qs.length - 1])).toBeLessThan(width(qs[0]));
  });
});
