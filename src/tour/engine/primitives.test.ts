import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { scaleBoxUV } from "./primitives";
import { createTestEngineContext } from "./test-context";

const { materials: M, primitives: P } = createTestEngineContext();

describe("primitives", () => {
  it("scaleBoxUV escala la cara frontal por ancho/alto sobre la unidad", () => {
    const g = new THREE.BoxGeometry(4, 2, 1);
    scaleBoxUV(g, 4, 2, 1, 2);
    const uv = g.attributes.uv;
    const xs = [16, 17, 18, 19].map((k) => uv.getX(k));
    const ys = [16, 17, 18, 19].map((k) => uv.getY(k));
    expect(Math.max(...xs)).toBe(2);
    expect(Math.max(...ys)).toBe(1);
  });

  it("box crea un mesh posicionado con su material y marca noShadow", () => {
    const m = P.box(1, 2, 3, "stone", [1, 2, 3], { noShadow: true });
    expect(m.position.toArray()).toEqual([1, 2, 3]);
    expect(m.material).toBe(M("stone"));
    expect(m.userData.noShadow).toBe(true);
    expect(m.parent).toBeNull();
  });

  it("frame arma ventana 3×3, ventanal 6×3 y puerta doble con vidrio", () => {
    expect(P.frame("z", 0, 0, 1.2, 1.7, 1.7, 0.3).children).toHaveLength(9);
    expect(
      P.frame("z", 0, 0, 0.1, 6.37, 2.8, 0.3, { cols: 6, rows: 3 }).children,
    ).toHaveLength(12);
    const door = P.frame("z", 0, 0, 0, 2.5, 2.7, 0.3, { door: true });
    expect(door.children).toHaveLength(6);
    expect(
      door.children.filter((c) => (c as THREE.Mesh).material === M("glass")),
    ).toHaveLength(1);
  });

  it("frame usa frameKey y glassKey", () => {
    const f = P.frame("z", 0, 0, 0, 1, 1, 0.3, { frameKey: "wood", glassKey: "hearth" });
    const mats = f.children.map((c) => (c as THREE.Mesh).material);
    expect(mats).not.toContain(M("metal"));
    expect(mats).toContain(M("hearth"));
  });

  it("una puerta con rows=4 tiene 3 travesaños y no barral", () => {
    const w = 2.5;
    const h = 2.7;
    const door = P.frame("z", 0, 0, 0, w, h, 0.3, { door: true, rows: 4 });
    const size = (c: THREE.Object3D) => {
      const g = (c as THREE.Mesh).geometry as THREE.BoxGeometry;
      return g.parameters;
    };
    expect(door.children.filter((c) => size(c).height === 0.05)).toHaveLength(0);
    const bars = door.children.filter((c) => size(c).width === w && size(c).height === 0.04);
    expect(bars.map((c) => c.position.y).sort((a, b) => a - b)).toEqual(
      [h / 4, h / 2, (3 * h) / 4].map((y) => expect.closeTo(y, 5)),
    );
  });

  it("cyl escala la UV de las claves con UNIT", () => {
    const maxU = (m: THREE.Mesh) => {
      const uv = m.geometry.attributes.uv;
      let mx = 0;
      for (let i = 0; i < uv.count; i++) mx = Math.max(mx, uv.getX(i));
      return mx;
    };
    expect(maxU(P.cyl(1.2, 0.55, "stone", [0, 0, 0]))).toBeCloseTo((2 * Math.PI * 1.2) / 1.6, 5);
    expect(maxU(P.cyl(1, 1, "metal", [0, 0, 0]))).toBeCloseTo(1, 5);
  });
});
