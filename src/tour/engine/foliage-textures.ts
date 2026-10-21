import * as THREE from "three";
import type { GeometryDetail } from "../types";
import { rng } from "./textures";

// Texturas de follaje para tarjetas con alphaTest: dibujadas en canvas una sola vez por montaje (el viewer las crea
// junto con las demás texturas) y subidas como DataTexture. Fondo transparente; los píxeles vacíos heredan el color
// medio de las hojas ("bleed") para que el filtrado y los mipmaps no oscurezcan los bordes.

export type FoliageKey = "leaves" | "photiniaLeaves" | "willow" | "lavender" | "flax";

export const FOLIAGE_TEXTURE_SIZE: Record<GeometryDetail, number> = { high: 512, low: 256 };

type Draw = (g: CanvasRenderingContext2D, s: number) => void;

const TAU = Math.PI * 2;
const hsl = (h: number, s: number, l: number) => `hsl(${h.toFixed(1)},${s.toFixed(1)}%,${l.toFixed(1)}%)`;

// Copia la imagen del canvas (filas invertidas: fila 0 = abajo, como espera WebGL con uv v=1 arriba) y rellena
// el RGB de los píxeles transparentes con el promedio de los opacos.
function bleed(src: Uint8ClampedArray, s: number): Uint8Array {
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < src.length; i += 4) {
    if (src[i + 3] > 128) {
      r += src[i]; g += src[i + 1]; b += src[i + 2]; n++;
    }
  }
  const avg = n ? [r / n, g / n, b / n] : [0, 0, 0];
  const out = new Uint8Array(src.length);
  const row = s * 4;
  for (let y = 0; y < s; y++) {
    const from = (s - 1 - y) * row;
    for (let x = 0; x < row; x += 4) {
      const i = from + x, o = y * row + x;
      const a = src[i + 3];
      out[o] = a ? src[i] : avg[0];
      out[o + 1] = a ? src[i + 1] : avg[1];
      out[o + 2] = a ? src[i + 2] : avg[2];
      out[o + 3] = a;
    }
  }
  return out;
}

export function alphaTexture(size: number, draw: Draw, maxAnisotropy: number): THREE.DataTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  draw(g, size);
  const pixels = g.getImageData?.(0, 0, size, size)?.data;
  const data = pixels ? bleed(pixels, size) : new Uint8Array(size * size * 4);
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = maxAnisotropy;
  t.needsUpdate = true;
  return t;
}

function leaf(g: CanvasRenderingContext2D, x: number, y: number, len: number, width: number, angle: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(x + (Math.cos(angle) * len) / 2, y + (Math.sin(angle) * len) / 2, len / 2, width / 2, angle, 0, TAU);
  g.fill();
}

// Matas de hojitas con huecos: 9 racimos dentro de un círculo; las hojas del interior y de abajo más oscuras, las
// del borde y de arriba más claras (luz de cielo). `hue`/`sat`/`light` definen la especie (verde o rojo).
function leafClusters(seed: number, hue: number, sat: number, light: number, hueJitter: number): Draw {
  return (g, s) => {
    const R = rng(seed);
    const clumps = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * TAU + R() * 0.5;
      const d = i === 0 ? 0 : s * (0.13 + R() * 0.12);
      return { x: s / 2 + Math.cos(a) * d, y: s / 2 + Math.sin(a) * d, r: s * (0.1 + R() * 0.06) };
    });
    // twigs: ramitas finas del centro a cada racimo
    g.strokeStyle = "#4a3a28";
    g.lineWidth = Math.max(1, s / 256);
    for (const c of clumps) {
      g.beginPath();
      g.moveTo(s / 2, s * 0.62);
      g.lineTo(c.x, c.y);
      g.stroke();
    }
    const perClump = 150;
    for (let pass = 0; pass < 2; pass++) {
      for (const c of clumps) {
        for (let i = 0; i < perClump / 2; i++) {
          const a = R() * TAU;
          const d = Math.sqrt(R()) * c.r * (pass ? 1.05 : 0.8);
          const x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
          const fromCenter = Math.hypot(x - s / 2, y - s / 2) / (s / 2);
          if (fromCenter > 0.84) continue; // nada cerca del borde: la silueta de la tarjeta no se ve cuadrada
          const up = 1 - y / s;
          const l = light + (pass ? 5 : -6) + fromCenter * 6 + up * 5 + (R() - 0.5) * 8;
          const len = s * (0.035 + R() * 0.02);
          leaf(g, x, y, len, len * 0.5, a + (R() - 0.5) * 1.2, hsl(hue + (R() - 0.5) * hueJitter, sat + (R() - 0.5) * 12, l));
        }
      }
    }
  };
}

// Sauce: hebras largas que cuelgan desde arriba con hojas angostas a ambos lados.
const willow: Draw = (g, s) => {
  const R = rng(31);
  const strands = 34;
  for (let i = 0; i < strands; i++) {
    let x = s * (0.04 + 0.92 * R());
    let y = s * R() * 0.12;
    const len = s * (0.55 + R() * 0.43);
    const sway = (R() - 0.5) * 0.25;
    const steps = Math.round(len / (s * 0.022));
    const l0 = 34 + R() * 14;
    g.strokeStyle = "#556b2a";
    g.lineWidth = Math.max(1, s / 400);
    g.beginPath();
    g.moveTo(x, y);
    const pts: [number, number][] = [];
    for (let k = 0; k < steps; k++) {
      x += Math.sin(k * 0.3 + i) * s * 0.002 + sway * s * 0.01;
      y += s * 0.022;
      g.lineTo(x, y);
      pts.push([x, y]);
    }
    g.stroke();
    for (const [k, [px, py]] of pts.entries()) {
      const t = k / steps;
      for (const side of [-1, 1]) {
        const ang = Math.PI / 2 + side * (0.35 + R() * 0.35);
        const len = s * (0.045 + R() * 0.02) * (1 - 0.4 * t);
        leaf(g, px, py, len, len * 0.22, ang, hsl(78 + (R() - 0.5) * 14, 48 + R() * 14, l0 + (R() - 0.5) * 10 - t * 6));
      }
    }
  }
};

// Lavanda: mata densa gris verdosa (cúpula de hojitas finas) y tallos que salen de ella en abanico con espigas
// violetas en la punta (como Lavandula stoechas: espiga gruesa con dos "orejas").
const lavender: Draw = (g, s) => {
  const R = rng(41);
  const bx = s / 2, by = s;
  g.lineCap = "round";
  // mata: hojitas en una media elipse (ancho 0.84 s, alto 0.5 s), apuntando hacia arriba y afuera
  for (let i = 0; i < 1400; i++) {
    const a = R() * Math.PI;
    const d = Math.sqrt(R());
    const x = bx + Math.cos(a) * d * s * 0.42;
    const y = by - Math.sin(a) * d * s * 0.5;
    const top = (by - y) / (s * 0.5);
    const ang = -Math.PI / 2 + (x - bx) / (s * 0.42) * 0.9 + (R() - 0.5) * 0.8;
    const len = s * (0.045 + R() * 0.03);
    leaf(g, x, y, len, len * 0.22, ang, hsl(100 + (R() - 0.5) * 24, 16 + R() * 12, 32 + top * 22 + (R() - 0.5) * 10));
  }
  // tallos florales: nacen dentro de la mata y terminan sobre una cúpula más alta
  for (let i = 0; i < 90; i++) {
    const u = (R() - 0.5) * 2;
    const x0 = bx + u * s * 0.3, y0 = by - s * (0.2 + R() * 0.15) * (1 - Math.abs(u) * 0.5);
    const ang = u * 0.75 + (R() - 0.5) * 0.3;
    const len = s * (0.3 + 0.2 * (1 - Math.abs(u)) * (0.6 + 0.4 * R()));
    const tx = x0 + Math.sin(ang) * len, ty = y0 - Math.cos(ang) * len;
    g.strokeStyle = hsl(85, 14, 42 + R() * 12);
    g.lineWidth = Math.max(1, s * 0.004);
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(tx, ty);
    g.stroke();
    const spike = s * 0.075;
    const dots = 6;
    const hue = 262 + (R() - 0.5) * 16;
    for (let k = 0; k < dots; k++) {
      const t = k / (dots - 1);
      const px = tx - Math.sin(ang) * spike * (1 - t), py = ty + Math.cos(ang) * spike * (1 - t);
      const w = s * (0.016 - t * 0.004);
      leaf(g, px - Math.sin(ang) * w * 0.6, py + Math.cos(ang) * w * 0.6, w * 1.4, w * 1.15, ang - Math.PI / 2, hsl(hue, 32 + R() * 14, 42 + R() * 12 + t * 6));
    }
    for (const side of [-1, 1]) leaf(g, tx, ty, s * 0.028, s * 0.013, ang - Math.PI / 2 + side * 0.45, hsl(hue + 6, 40, 58 + R() * 10));
  }
};

// Formio: hojas en espada, rojo bronce con márgenes rosados, que salen en abanico de la base y se arquean.
const flax: Draw = (g, s) => {
  const R = rng(51);
  const bx = s / 2, by = s;
  const n = 17;
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1) - 0.5) * 2; // -1..1
    const ang = u * 0.7 + (R() - 0.5) * 0.15;
    const len = s * (0.98 - Math.abs(u) * 0.35) * (0.85 + R() * 0.15);
    const droop = u * s * 0.12;
    const w0 = s * (0.03 + R() * 0.012);
    const pts = (side: number) => {
      const out: [number, number][] = [];
      for (let k = 0; k <= 16; k++) {
        const t = k / 16;
        const cx = bx + Math.sin(ang) * len * t + droop * t * t;
        const cy = by - Math.cos(ang) * len * t + Math.abs(droop) * t * t * 0.6;
        const w = w0 * Math.pow(1 - t, 0.8) * (0.4 + 0.6 * Math.sin(Math.min(1, t * 4 + 0.3) * Math.PI / 2));
        out.push([cx + side * w * Math.cos(ang), cy + side * w * Math.sin(ang)]);
      }
      return out;
    };
    const left = pts(-1), right = pts(1).reverse();
    const l = 24 + R() * 10;
    g.fillStyle = hsl(4 + R() * 10, 45 + R() * 15, l);
    g.beginPath();
    for (const [k, [x, y]] of [...left, ...right].entries()) {
      if (k) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.closePath();
    g.fill();
    // margen claro (rosado/anaranjado) sobre un borde
    g.strokeStyle = hsl(14 + R() * 12, 55, l + 18);
    g.lineWidth = Math.max(1, s * 0.004);
    g.beginPath();
    for (const [k, [x, y]] of left.entries()) {
      if (k) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
  }
};

export function makeFoliageTextures(detail: GeometryDetail, maxAnisotropy: number): Record<FoliageKey, THREE.DataTexture> {
  const size = FOLIAGE_TEXTURE_SIZE[detail];
  const tex = (draw: Draw) => alphaTexture(size, draw, maxAnisotropy);
  return {
    leaves: tex(leafClusters(61, 92, 46, 34, 16)),
    photiniaLeaves: tex(leafClusters(67, 4, 62, 30, 14)),
    willow: tex(willow),
    lavender: tex(lavender),
    flax: tex(flax),
  };
}
