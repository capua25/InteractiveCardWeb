import * as THREE from "three";
import type { SceneElement } from "@/tour/types";
import type { BarbatosLayout } from "../layout";

const STONE_SQUASH = 0.6;
const FLOWER_LIFT = 0.3;

function instanced(geo: THREE.BufferGeometry, material: THREE.Material, matrices: THREE.Matrix4[]): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, material, matrices.length);
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

// Borde de piedras (aplastadas, sobre el pedregullo) y lavandas (mata + flor), todo instanciado: 3 draw calls.
export const forecourt: SceneElement<BarbatosLayout> = {
  id: "forecourt",
  build({ layout: l, materials }) {
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
    const bushes = l.forecourt.lavender.map((p, i) => m.compose(new THREE.Vector3(p.x, 0.35 * scaleOf(i), p.z), q.identity(), new THREE.Vector3(1, 1, 1).multiplyScalar(scaleOf(i))).clone());
    const flowers = l.forecourt.lavender.map((p, i) => m.compose(new THREE.Vector3(p.x, 0.35 * scaleOf(i) + FLOWER_LIFT * scaleOf(i), p.z), q.identity(), new THREE.Vector3(1, 1, 1).multiplyScalar(scaleOf(i))).clone());
    g.add(instanced(new THREE.SphereGeometry(0.35, 6, 4), materials("lavender"), bushes));
    g.add(instanced(new THREE.SphereGeometry(0.2, 5, 3), materials("lavenderFlower"), flowers));
    return g;
  },
};
