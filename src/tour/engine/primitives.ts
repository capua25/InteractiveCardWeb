import * as THREE from "three";
import type { Vec3 } from "../types";
import { UNIT, type MaterialFactory, type MaterialKey } from "./materials";

export function scaleBoxUV(
  geo: THREE.BoxGeometry,
  w: number,
  h: number,
  d: number,
  unit: number,
): void {
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, (uv.getX(k) * dims[f][0]) / unit, (uv.getY(k) * dims[f][1]) / unit);
    }
  }
}

export type BoxOpts = { rx?: number; ry?: number; noShadow?: boolean };

export type Primitives = {
  box(w: number, h: number, d: number, key: MaterialKey, at: Vec3, opts?: BoxOpts): THREE.Mesh;
  cyl(r: number, h: number, key: MaterialKey, at: Vec3, segments?: number): THREE.Mesh;
  extrudeWall(shape: THREE.Shape, depth: number, key: MaterialKey): THREE.Mesh;
  rectHole(x0: number, y0: number, x1: number, y1: number): THREE.Path;
  frame(
    axis: "z" | "x",
    center: number,
    wallMid: number,
    y0: number,
    w: number,
    h: number,
    wallThickness: number,
    opts?: { door?: boolean; cols?: number; rows?: number },
  ): THREE.Group;
};

export function createPrimitives(M: MaterialFactory): Primitives {
  const box: Primitives["box"] = (w, h, d, key, at, opts = {}) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    scaleBoxUV(geo, w, h, d, UNIT[key] ?? 1);
    const m = new THREE.Mesh(geo, M(key));
    m.position.set(at[0], at[1], at[2]);
    if (opts.rx) m.rotation.x = opts.rx;
    if (opts.ry) m.rotation.y = opts.ry;
    if (opts.noShadow) m.userData.noShadow = true;
    return m;
  };

  const cyl: Primitives["cyl"] = (r, h, key, at, segments = 16) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segments), M(key));
    m.position.set(at[0], at[1], at[2]);
    return m;
  };

  const extrudeWall: Primitives["extrudeWall"] = (shape, depth, key) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    const unit = UNIT[key] ?? 1;
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / unit, uv.getY(i) / unit);
    return new THREE.Mesh(g, M(key));
  };

  const rectHole: Primitives["rectHole"] = (x0, y0, x1, y1) => {
    const p = new THREE.Path();
    p.moveTo(x0, y0);
    p.lineTo(x0, y1);
    p.lineTo(x1, y1);
    p.lineTo(x1, y0);
    p.closePath();
    return p;
  };

  // Marco (atraviesa el muro, visible de ambos lados) + vidrio al medio.
  // axis 'z': pared en plano XY (frente/fondo); axis 'x': pared en plano ZY (hastial).
  const frame: Primitives["frame"] = (axis, c, wallMid, y0, w, h, wallThickness, opts = {}) => {
    const ft = 0.07;
    const fd = wallThickness + 0.06;
    const group = new THREE.Group();
    const put = (a: number, y: number, sa: number, sy: number, key: MaterialKey = "metal", depth = fd) => {
      group.add(
        axis === "z"
          ? box(sa, sy, depth, key, [a, y, wallMid])
          : box(depth, sy, sa, key, [wallMid, y, a]),
      );
    };
    const yc = y0 + h / 2;
    put(c - w / 2 + ft / 2, yc, ft, h); // jambas
    put(c + w / 2 - ft / 2, yc, ft, h);
    put(c, y0 + h - ft / 2, w, ft); // dintel
    if (!opts.door) put(c, y0 + ft / 2, w, ft); // alféizar
    if (opts.door) {
      put(c, yc, ft, h); // parante central (puerta doble)
      put(c, y0 + 1.0, w, 0.05, "metal", 0.1); // barral
    } else {
      const cols = opts.cols || 3;
      const rows = opts.rows || 3; // cuadrícula
      for (let k = 1; k < cols; k++) put(c - w / 2 + (k * w) / cols, yc, 0.04, h, "metal", 0.06);
      for (let k = 1; k < rows; k++) put(c, y0 + (k * h) / rows, w, 0.04, "metal", 0.06);
    }
    put(c, yc, w - 2 * ft, h - (opts.door ? ft : 2 * ft), "glass", 0.02);
    return group;
  };

  return { box, cyl, extrudeWall, rectHole, frame };
}
