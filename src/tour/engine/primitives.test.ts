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
});
