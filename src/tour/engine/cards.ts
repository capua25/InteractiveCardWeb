import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Geometría de follaje en tarjetas (quads con textura recortada por alphaTest). Cada tarjeta lleva las normales
// dobladas hacia afuera de un centro (la copa o la base de la mata): así la luz sombrea el conjunto como un
// volumen y no como planos sueltos.

const UP = new THREE.Vector3(0, 1, 0);
const POLE = 0.8; // |y| máximo de la dirección de una tarjeta sobre el elipsoide
const MIN_ABOVE_GROUND = 0.02; // m: ninguna esquina de tarjeta de columna por debajo
const MIN_TILT = 1.2; // |horizontal| / |vertical| mínimo de la normal de una tarjeta de copa: normal a ≥ 50° de la vertical

export type Card = {
  center: THREE.Vector3;
  normal: THREE.Vector3; // hacia dónde mira la tarjeta
  up: THREE.Vector3; // dirección "arriba" de la textura (se ortogonaliza contra `normal`)
  width: number;
  height: number;
  bendFrom: THREE.Vector3; // centro del volumen: las normales apuntan desde acá
  bend: number; // 0 = normal plana de la tarjeta, 1 = normal radial del volumen
  uv?: UvRect; // región de la textura (atlas); por defecto la textura entera
};

/** Región [u0, v0, u1, v1] de una textura atlas (v = 0 abajo). */
export type UvRect = readonly [number, number, number, number];
const FULL: UvRect = [0, 0, 1, 1];

const CORNERS = [[-0.5, -0.5, 0, 0], [0.5, -0.5, 1, 0], [0.5, 0.5, 1, 1], [-0.5, 0.5, 0, 1]] as const;

/** Las 4 esquinas de una tarjeta (en el orden de sus uv: abajo-izq, abajo-der, arriba-der, arriba-izq) y su normal. */
export function cardCorners(c: Card): { corners: THREE.Vector3[]; normal: THREE.Vector3 } {
  const n = c.normal.clone().normalize();
  const up = c.up.clone().addScaledVector(n, -c.up.dot(n));
  if (up.lengthSq() < 1e-6) up.set(1, 0, 0).addScaledVector(n, -n.x); // tarjeta horizontal: cualquier eje sirve
  up.normalize();
  const right = new THREE.Vector3().crossVectors(up, n).normalize();
  const corners = CORNERS.map(([sx, sy]) => c.center.clone().addScaledVector(right, sx * c.width).addScaledVector(up, sy * c.height));
  return { corners, normal: n };
}

export class CardBuilder {
  private readonly pos: number[] = [];
  private readonly nor: number[] = [];
  private readonly uv: number[] = [];
  private readonly idx: number[] = [];

  get cards(): number {
    return this.pos.length / 12;
  }

  add(c: Card): this {
    const { corners, normal: n } = cardCorners(c);
    const base = this.pos.length / 3;
    const radial = new THREE.Vector3();
    for (const [k, [, , u, w]] of CORNERS.entries()) {
      const v = corners[k];
      this.pos.push(v.x, v.y, v.z);
      radial.subVectors(v, c.bendFrom);
      if (radial.lengthSq() < 1e-8) radial.copy(n);
      radial.normalize().multiplyScalar(c.bend).addScaledVector(n, 1 - c.bend).normalize();
      this.nor.push(radial.x, radial.y, radial.z);
      const [u0, v0, u1, v1] = c.uv ?? FULL;
      this.uv.push(u0 + (u1 - u0) * u, v0 + (v1 - v0) * w);
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
function shellDirections(count: number, R: () => number, jitter = 0.35): THREE.Vector3[] {
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
    // sin tarjetas en los polos: la de la punta quedaba suelta por encima de la copa
    d.y = THREE.MathUtils.clamp(d.y, -POLE, POLE);
    d.normalize();
    const center = new THREE.Vector3(d.x * c.radii.x, d.y * c.radii.y, d.z * c.radii.z).multiplyScalar(shell * (0.85 + R() * 0.3)).add(c.center);
    const normal = d.clone().setY(d.y * (c.flatten ?? 0.6));
    // ninguna tarjeta acostada: si la normal queda casi vertical (copa de arriba/abajo), se inclina hacia un costado
    const flat = Math.hypot(normal.x, normal.z);
    if (flat < MIN_TILT * Math.abs(normal.y)) {
      const a = flat > 1e-6 ? Math.atan2(normal.z, normal.x) : R() * Math.PI * 2;
      normal.set(Math.cos(a) * MIN_TILT * Math.abs(normal.y), normal.y, Math.sin(a) * MIN_TILT * Math.abs(normal.y));
    }
    normal.normalize();
    const roll = (R() - 0.5) * Math.PI * 2;
    // "arriba" de la textura: el vertical del mundo rotado `roll` alrededor de la normal (si no es casi vertical)
    const up = UP.clone().applyAxisAngle(normal, roll);
    const s = c.size * (0.85 + R() * 0.3);
    b.add({ center, normal, up, width: s, height: s * aspect, bendFrom: c.center, bend: c.bend ?? 0.75 });
  }
}

export type Column = {
  base: THREE.Vector3; // pie del árbol (x, 0, z)
  from: number; // altura donde empieza el follaje
  to: number; // altura de la punta
  radius: number; // semieje en x de la huella: ninguna esquina de tarjeta sale de la elipse (radius, radiusZ)
  radiusZ?: number; // semieje en z si la columna es ovalada (álamos estirados a lo largo del muro); por defecto `radius`
  count: number;
  size: number;
  aspect?: number;
  baseFill?: { height: number; count: number }; // tarjetas extra, anchas y hacia afuera, en el tramo de abajo
};

/** Copa columnar (álamo): tarjetas apiladas en espiral de `from` a `to`, verticales y mirando hacia afuera, con la
 * columna afinándose arriba. El follaje cubre exactamente ese tramo (sin tarjetas sueltas en la punta) y su huella en
 * planta es exactamente la elipse (radius, radiusZ): las tarjetas que se pasarían se acercan al tronco. */
export function addColumn(b: CardBuilder, c: Column, R: () => number): void {
  const aspect = c.aspect ?? 1.3;
  const rx = c.radius, rz = c.radiusZ ?? c.radius;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const phase = R() * Math.PI * 2;
  const inside = (cc: Card) => cardCorners(cc).corners.every((p) => ((p.x - c.base.x) / rx) ** 2 + ((p.z - c.base.z) / rz) ** 2 <= 1 + 1e-9);
  // una tarjeta a altura y, con dirección a y alcance relativo `reach` (0..1 del semieje); si alguna esquina sale de
  // la huella primero se acerca al tronco y, si ni pegada al tronco entra, se achica
  const place = (y: number, width: number, height: number, a: number, reach: number) => {
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const up = UP.clone().applyAxisAngle(out, (R() - 0.5) * 0.8);
    const card = (r: number, scale: number): Card => ({
      center: new THREE.Vector3(c.base.x + out.x * r * rx, y, c.base.z + out.z * r * rz),
      normal: out.clone().setY(0.15), up, width: width * scale, height: height * scale,
      bendFrom: new THREE.Vector3(c.base.x, y - 0.3, c.base.z), bend: 0.7,
    });
    let scale = 1;
    while (!inside(card(reach, scale))) {
      if (reach > 1e-3) reach = Math.max(0, reach - 0.05);
      else scale *= 0.9;
    }
    // una tarjeta girada (roll) baja una esquina: que nunca se meta en el pasto
    const final = card(reach, scale);
    const low = Math.min(...cardCorners(final).corners.map((p) => p.y));
    if (low < MIN_ABOVE_GROUND) final.center.y += MIN_ABOVE_GROUND - low;
    b.add(final);
  };
  for (let k = 0; k < c.count; k++) {
    const t = (k + 0.5) / c.count;
    const width = c.size * (1 - 0.35 * t) * (0.9 + R() * 0.2);
    const height = width * aspect;
    const y = c.from + height / 2 + t * (c.to - c.from - height);
    // centros hacia afuera (sesgo √): la columna se ve llena hasta el borde, no un anillo hueco
    const reach = (0.15 + 0.45 * Math.sqrt(R())) * Math.sin(Math.PI * (0.25 + 0.75 * t)) ** 0.5;
    place(y, width, height, phase + k * golden + (R() - 0.5) * 0.4, reach);
  }
  // relleno del pie: tarjetas más anchas que altas, cerca del borde, para que entre columnas vecinas no se vean
  // troncos ni huecos en el primer tramo
  const fill = c.baseFill;
  for (let k = 0; fill && k < fill.count; k++) {
    const width = c.size * (1.05 + R() * 0.2);
    const height = width * 0.85;
    const y = c.from + height / 2 + ((k + R()) / fill.count) * Math.max(0, fill.height - height);
    place(y, width, height, phase + (k + 0.5) * golden * 1.7 + (R() - 0.5) * 0.4, 0.35 + 0.3 * Math.sqrt(R()));
  }
}

/** Mata en estrella: `count` tarjetas verticales cruzadas, apoyadas en `base`, con normales hacia arriba y afuera. */
export function addStar(b: CardBuilder, base: THREE.Vector3, count: number, width: number, height: number, yaw: number, bend = 0.6, uv?: UvRect): void {
  const bendFrom = base.clone().add(new THREE.Vector3(0, -height * 0.4, 0));
  for (let i = 0; i < count; i++) {
    const a = yaw + (i / count) * Math.PI;
    const normal = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    b.add({ center: base.clone().add(new THREE.Vector3(0, height / 2, 0)), normal, up: UP, width, height, bendFrom, bend, uv });
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
