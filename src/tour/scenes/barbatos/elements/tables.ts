import * as THREE from "three";
import { UNIT, type MaterialFactory, type MaterialKey } from "@/tour/engine/materials";
import { scaleBoxUV } from "@/tour/engine/primitives";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

const TOP_Y = 0.75;
const ROUND_RADIUS = 0.8;
const ROUND_SEATS = 6;
const ROUND_CHAIR_RADIUS = 1.15;
const RECT = { w: 2.0, d: 0.9, legX: 0.9, legZ: 0.35, chairDx: [-0.65, 0, 0.65], chairDz: 0.75 };

// Pieza repetida: geometría + material compartidos, una matriz por instancia.
type Piece = { geo: THREE.BufferGeometry; key: MaterialKey; matrices: THREE.Matrix4[] };

function boxPiece(w: number, h: number, d: number, key: MaterialKey): Piece {
  const geo = new THREE.BoxGeometry(w, h, d);
  scaleBoxUV(geo, w, h, d, UNIT[key] ?? 1);
  return { geo, key, matrices: [] };
}

function toInstanced(p: Piece, materials: MaterialFactory): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(p.geo, materials(p.key), p.matrices.length);
  p.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

// Mesas redondas (6 sillas en ronda) y rectangulares (3 sillas por lado), todo instanciado.
export const tables: SceneElement<BarbatosLayout> = {
  id: "tables",
  build({ layout: l, materials }) {
    const seat = boxPiece(0.42, 0.45, 0.42, "chair");
    const back = boxPiece(0.42, 0.5, 0.06, "chair");
    const roundTop = { geo: new THREE.CylinderGeometry(ROUND_RADIUS, ROUND_RADIUS, 0.05, 24), key: "wood", matrices: [] } as Piece;
    const pedestal = { geo: new THREE.CylinderGeometry(0.08, 0.08, 0.72, 8), key: "wood", matrices: [] } as Piece;
    const rectTop = boxPiece(RECT.w, 0.05, RECT.d, "wood");
    const leg = boxPiece(0.06, 0.72, 0.06, "wood");

    const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
    // Silla en (x, z) mirando hacia (faceX, faceZ): posición · rotación · offset local de cada pieza.
    const chair = (x: number, z: number, faceX: number, faceZ: number) => {
      const base = new THREE.Matrix4().makeRotationY(Math.atan2(faceX - x, faceZ - z)).setPosition(x, 0, z);
      seat.matrices.push(base.clone().multiply(at(0, 0.225, 0)));
      back.matrices.push(base.clone().multiply(at(0, 0.7, -0.19)));
    };

    for (const t of l.tables) {
      if (t.kind === "round") {
        roundTop.matrices.push(at(t.x, TOP_Y, t.z));
        pedestal.matrices.push(at(t.x, 0.37, t.z));
        for (let k = 0; k < ROUND_SEATS; k++) {
          const a = (k / ROUND_SEATS) * Math.PI * 2;
          chair(t.x + Math.cos(a) * ROUND_CHAIR_RADIUS, t.z + Math.sin(a) * ROUND_CHAIR_RADIUS, t.x, t.z);
        }
      } else {
        rectTop.matrices.push(at(t.x, TOP_Y, t.z));
        for (const lx of [-RECT.legX, RECT.legX]) for (const lz of [-RECT.legZ, RECT.legZ]) leg.matrices.push(at(t.x + lx, 0.37, t.z + lz));
        for (const dx of RECT.chairDx) {
          chair(t.x + dx, t.z + RECT.chairDz, t.x + dx, t.z);
          chair(t.x + dx, t.z - RECT.chairDz, t.x + dx, t.z);
        }
      }
    }

    const g = new THREE.Group();
    for (const p of [seat, back, roundTop, pedestal, rectTop, leg]) if (p.matrices.length) g.add(toInstanced(p, materials));
    return g;
  },
};
