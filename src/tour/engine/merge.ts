import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Junta en un solo mesh los meshes estáticos de `group` que comparten material (un draw call por
// material en vez de uno por pieza). Los `noShadow` se juntan en baldes propios (el mesh resultante
// conserva `noShadow`). Quedan aparte: instanciados, transparentes, multi-material, morph, ocultos,
// el subárbol `skip` (p. ej. el techo, que se oculta por separado) y los subárboles `noMerge`.
export function mergeByMaterial(group: THREE.Object3D, skip?: THREE.Object3D): void {
  group.updateMatrixWorld(true);
  const toLocal = group.matrixWorld.clone().invert();
  const buckets = new Map<string, THREE.Mesh[]>();

  const walk = (node: THREE.Object3D) => {
    if (node === skip || !node.visible || node.userData.noMerge) return;
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh && isMergeable(mesh)) {
      const ns = mesh.userData.noShadow ? "|ns" : "";
      const key = `${(mesh.material as THREE.Material).uuid}|${signature(mesh.geometry)}${ns}`;
      const list = buckets.get(key);
      if (list) list.push(mesh);
      else buckets.set(key, [mesh]);
    }
    for (const child of node.children) walk(child);
  };
  walk(group);

  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const geometries = list.map((m) => {
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      return g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toLocal, m.matrixWorld));
    });
    const merged = mergeGeometries(geometries, false);
    for (const g of geometries) g.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, list[0].material);
    mesh.name = "merged";
    if (list[0].userData.noShadow) mesh.userData.noShadow = true;
    for (const m of list) {
      m.removeFromParent();
      m.geometry.dispose();
    }
    group.add(mesh);
  }
}

function isMergeable(mesh: THREE.Mesh): boolean {
  const mat = mesh.material;
  return (
    !(mesh as THREE.InstancedMesh).isInstancedMesh &&
    !Array.isArray(mat) &&
    !mat.transparent &&
    mat.opacity === 1 &&
    Object.keys(mesh.geometry.morphAttributes).length === 0
  );
}

// Los geometries solo se pueden juntar si tienen los mismos atributos.
function signature(geo: THREE.BufferGeometry): string {
  return Object.entries(geo.attributes)
    .map(([name, attr]) => `${name}:${attr.itemSize}:${attr.normalized}`)
    .sort()
    .join(",");
}
