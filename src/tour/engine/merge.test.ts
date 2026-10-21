import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { barbatosScene } from "../scenes/barbatos";
import { mergeByMaterial } from "./merge";
import { createTestEngineContext } from "./test-context";

const meshes = (o: THREE.Object3D, skip?: THREE.Object3D) => {
  const out: THREE.Mesh[] = [];
  const walk = (n: THREE.Object3D) => {
    if (n === skip) return;
    if ((n as THREE.Mesh).isMesh) out.push(n as THREE.Mesh);
    n.children.forEach(walk);
  };
  walk(o);
  return out;
};

const mergeable = (m: THREE.Mesh) =>
  !(m as THREE.InstancedMesh).isInstancedMesh &&
  !m.userData.noShadow &&
  !Array.isArray(m.material) &&
  !(m.material as THREE.Material).transparent;

describe("mergeByMaterial", () => {
  it("junta dos meshes con el mismo material en uno, respetando su posición", () => {
    const mat = new THREE.MeshStandardMaterial();
    const root = new THREE.Group();
    const a = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
    const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
    b.position.set(10, 0, 0);
    const sub = new THREE.Group();
    sub.add(b);
    root.add(a, sub);
    mergeByMaterial(root);
    const ms = meshes(root);
    expect(ms).toHaveLength(1);
    expect(ms[0].material).toBe(mat);
    ms[0].geometry.computeBoundingBox();
    expect(ms[0].geometry.boundingBox!.max.x).toBeCloseTo(10.5, 6);
  });

  it("deja aparte instanciados, noShadow, transparentes y el subárbol excluido", () => {
    const mat = new THREE.MeshStandardMaterial();
    const glass = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.2 });
    const root = new THREE.Group();
    const skip = new THREE.Group();
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(), mat, 2);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(), mat);
    lamp.userData.noShadow = true;
    const g1 = new THREE.Mesh(new THREE.BoxGeometry(), glass);
    const g2 = new THREE.Mesh(new THREE.BoxGeometry(), glass);
    const r1 = new THREE.Mesh(new THREE.BoxGeometry(), mat);
    const r2 = new THREE.Mesh(new THREE.BoxGeometry(), mat);
    skip.add(r1, r2);
    root.add(skip, inst, lamp, g1, g2);
    mergeByMaterial(root, skip);
    expect(meshes(root, skip)).toEqual(expect.arrayContaining([inst, lamp, g1, g2]));
    expect(meshes(root, skip)).toHaveLength(4);
    expect(meshes(skip)).toEqual([r1, r2]);
  });

  it("en la escena de Barbato's deja un mesh por material en root y en el techo", () => {
    const { root, roofGroup } = barbatosScene.build(createTestEngineContext());
    const before = meshes(root, roofGroup).filter(mergeable).length + meshes(roofGroup).filter(mergeable).length;
    mergeByMaterial(root, roofGroup);
    mergeByMaterial(roofGroup);
    for (const group of [meshes(root, roofGroup), meshes(roofGroup)]) {
      const merged = group.filter(mergeable);
      const materials = new Set(merged.map((m) => m.material));
      expect(merged.length).toBe(materials.size);
    }
    const after = meshes(root, roofGroup).filter(mergeable).length + meshes(roofGroup).filter(mergeable).length;
    expect(after).toBeLessThan(before / 5);
    expect(roofGroup.parent).toBe(root);
  });
});
