import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Geometría de follaje en tarjetas (quads con textura recortada por alphaTest). Cada tarjeta lleva las normales
// dobladas hacia afuera de un centro (la copa o la base de la mata): así la luz sombrea el conjunto como un
// volumen y no como planos sueltos.

const UP = new THREE.Vector3(0, 1, 0);

export type Card = {
  center: THREE.Vector3;
  normal: THREE.Vector3; // hacia dónde mira la tarjeta
  up: THREE.Vector3; // dirección "arriba" de la textura (se ortogonaliza contra `normal`)
  width: number;
  height: number;
  bendFrom: THREE.Vector3; // centro del volumen: las normales apuntan desde acá
  bend: number; // 0 = normal plana de la tarjeta, 1 = normal radial del volumen
};

export class CardBuilder {
  private readonly pos: number[] = [];
  private readonly nor: number[] = [];
  private readonly uv: number[] = [];
  private readonly idx: number[] = [];

  get cards(): number {
    return this.pos.length / 12;
  }

  add(c: Card): this {
    const n = c.normal.clone().normalize();
    const up = c.up.clone().addScaledVector(n, -c.up.dot(n));
    if (up.lengthSq() < 1e-6) up.set(1, 0, 0).addScaledVector(n, -n.x); // tarjeta horizontal: cualquier eje sirve
    up.normalize();
    const right = new THREE.Vector3().crossVectors(up, n).normalize();
    const base = this.pos.length / 3;
    const v = new THREE.Vector3();
    const radial = new THREE.Vector3();
    for (const [sx, sy, u, w] of [[-0.5, -0.5, 0, 0], [0.5, -0.5, 1, 0], [0.5, 0.5, 1, 1], [-0.5, 0.5, 0, 1]]) {
      v.copy(c.center).addScaledVector(right, sx * c.width).addScaledVector(up, sy * c.height);
      this.pos.push(v.x, v.y, v.z);
      radial.subVectors(v, c.bendFrom);
      if (radial.lengthSq() < 1e-8) radial.copy(n);
      radial.normalize().multiplyScalar(c.bend).addScaledVector(n, 1 - c.bend).normalize();
      this.nor.push(radial.x, radial.y, radial.z);
      this.uv.push(u, w);
    }
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    return this;
  }

  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

/** Puntos casi uniformes sobre la esfera unitaria (espiral de Fibonacci) con jitter determinista. */
export function shellDirections(count: number, R: () => number, jitter = 0.35): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const phase = R() * Math.PI * 2;
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count;
    const r = Math.sqrt(1 - y * y);
    const a = i * golden + phase;
    out.push(new THREE.Vector3(Math.cos(a) * r + (R() - 0.5) * jitter, y + (R() - 0.5) * jitter, Math.sin(a) * r + (R() - 0.5) * jitter).normalize());
  }
  return out;
}

export type Crown = {
  center: THREE.Vector3;
  radii: THREE.Vector3; // semiejes del elipsoide de la copa
  count: number;
  size: number; // lado de cada tarjeta
  aspect?: number; // alto / ancho de la tarjeta
  shell?: number; // fracción del radio donde se apoyan las tarjetas (0 = centro, 1 = borde)
  bend?: number;
  minY?: number; // dirección mínima (y) permitida: evita tarjetas que asomen por debajo de la copa
  flatten?: number; // factor sobre la componente vertical de la normal: <1 evita tarjetas acostadas (se ven de canto)
};

/** Copa de `count` tarjetas sobre un elipsoide, cada una mirando hacia afuera con un giro (roll) al azar. */
export function addCrown(b: CardBuilder, c: Crown, R: () => number): void {
  const shell = c.shell ?? 0.55;
  const aspect = c.aspect ?? 1;
  for (const d of shellDirections(c.count, R)) {
    if (c.minY !== undefined && d.y < c.minY) d.y = c.minY + (d.y - c.minY) * 0.2;
    d.normalize();
    const center = new THREE.Vector3(d.x * c.radii.x, d.y * c.radii.y, d.z * c.radii.z).multiplyScalar(shell * (0.85 + R() * 0.3)).add(c.center);
    const normal = d.clone().setY(d.y * (c.flatten ?? 0.6)).normalize();
    const roll = (R() - 0.5) * Math.PI * 2;
    // "arriba" de la textura: el vertical del mundo rotado `roll` alrededor de la normal (si no es casi vertical)
    const up = UP.clone().applyAxisAngle(normal, roll);
    const s = c.size * (0.85 + R() * 0.3);
    b.add({ center, normal, up, width: s, height: s * aspect, bendFrom: c.center, bend: c.bend ?? 0.75 });
  }
}

/** Mata en estrella: `count` tarjetas verticales cruzadas, apoyadas en `base`, con normales hacia arriba y afuera. */
export function addStar(b: CardBuilder, base: THREE.Vector3, count: number, width: number, height: number, yaw: number, bend = 0.6): void {
  const bendFrom = base.clone().add(new THREE.Vector3(0, -height * 0.4, 0));
  for (let i = 0; i < count; i++) {
    const a = yaw + (i / count) * Math.PI;
    const normal = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    b.add({ center: base.clone().add(new THREE.Vector3(0, height / 2, 0)), normal, up: UP, width, height, bendFrom, bend });
  }
}

/** Tronco o rama: cilindro abierto, afinado de `r0` (base) a `r1` (punta), de `from` a `to`. */
export function limb(from: THREE.Vector3, to: THREE.Vector3, r0: number, r1: number, segments: number): THREE.BufferGeometry {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, segments, 1, true).translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()));
  return g.translate(from.x, from.y, from.z);
}

export function mergeAll(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error("mergeAll: geometrías incompatibles");
  return merged;
}
