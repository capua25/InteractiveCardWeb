import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";
import { addStar, CardBuilder } from "@/tour/engine/cards";
import { LAVENDER_ATLAS } from "@/tour/engine/foliage-textures";

const STONE_SQUASH = 0.6;
// Mata de lavanda: tarjetas verticales cruzadas (más en desktop) con la vista lateral de la textura y una tarjeta
// horizontal a media altura con la vista desde arriba, que tapa la "estrella" de las cruzadas vista desde lo alto.
export const LAVENDER = { width: 0.85, height: 0.8, cards: { high: 5, low: 4 }, top: { y: 0.55, width: 0.8 } } as const;

/** Geometría de una mata (compartida por el InstancedMesh), base en y=0: `cards` laterales + 1 horizontal. */
export function lavenderGeometry(detail: "high" | "low"): THREE.BufferGeometry {
  const { width: w, height: h, top } = LAVENDER;
  const b = new CardBuilder();
  addStar(b, new THREE.Vector3(), LAVENDER.cards[detail], w, h, 0, 0.6, LAVENDER_ATLAS.side);
  const s = w * top.width;
  b.add({
    center: new THREE.Vector3(0, h * top.y, 0), normal: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(1, 0, 0),
    width: s, height: s, bendFrom: new THREE.Vector3(0, -h * 0.3, 0), bend: 0.5, uv: LAVENDER_ATLAS.top,
  });
  return b.geometry();
}

function instanced(geo: THREE.BufferGeometry, material: THREE.Material, matrices: THREE.Matrix4[]): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, material, matrices.length);
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

// Borde de piedras (aplastadas, sobre el pedregullo) y lavandas (tarjetas cruzadas), todo instanciado: 2 draw calls.
export const forecourt: SceneElement<BarbatosLayout> = {
  id: "forecourt",
  build({ layout: l, materials, detail = "low" }) {
    const g = new THREE.Group();
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();

    // el pedregullo está en y=0.05; la base de la piedra queda ~0.06×size por debajo (centro 0.05 + 0.24×size, semialto 0.3×size)
    const stones = l.forecourt.border.map((s, i) =>
      m.compose(new THREE.Vector3(s.x, 0.05 + s.size * STONE_SQUASH * 0.4, s.z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 2.4), new THREE.Vector3(s.size, s.size * STONE_SQUASH, s.size)).clone(),
    );
    g.add(instanced(new THREE.IcosahedronGeometry(0.5, 0), materials("gabion"), stones));

    // variación de tamaño por mata (determinista por índice) para que no se vea una fila de clones
    const scaleOf = (i: number) => 0.8 + 0.45 * ((i * 0.618) % 1);
    const up = new THREE.Vector3(0, 1, 0);
    const bushes = l.forecourt.lavender.map((p, i) => m.compose(new THREE.Vector3(p.x, 0, p.z), q.setFromAxisAngle(up, i * 1.7), new THREE.Vector3(1, 1, 1).multiplyScalar(scaleOf(i))).clone());
    g.add(instanced(lavenderGeometry(detail), materials("lavender"), bushes));
    return g;
  },
};
