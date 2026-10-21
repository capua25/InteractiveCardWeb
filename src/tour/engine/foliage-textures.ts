import * as THREE from "three";
import type { GeometryDetail } from "../types";
import { rng } from "./textures";

// Texturas de follaje para tarjetas con alphaTest: dibujadas en canvas una sola vez por montaje (el viewer las crea
// junto con las demás texturas) y subidas como DataTexture con mipmaps propios. Fondo transparente; los píxeles
// vacíos heredan el color medio de las hojas ("bleed") para que el filtrado no oscurezca los bordes, y cada mipmap
// conserva la cobertura del corte de alphaTest (si no, hebras y tallos finos desaparecen a la distancia).

export type FoliageKey = "leaves" | "photiniaLeaves" | "willow" | "lavender" | "flax";

export const FOLIAGE_TEXTURE_SIZE: Record<GeometryDetail, number> = { high: 512, low: 256 };

type Draw = (g: CanvasRenderingContext2D, s: number) => void;

const TAU = Math.PI * 2;
const hsl = (h: number, s: number, l: number) => `hsl(${h.toFixed(1)},${s.toFixed(1)}%,${l.toFixed(1)}%)`;

/** Corte de alphaTest (0.5) en bytes. */
export const ALPHA_CUT = 128;

/** Copia la imagen del canvas (filas invertidas: fila 0 = abajo, como espera WebGL con uv v=1 arriba) y rellena
 * el RGB de los píxeles transparentes con el promedio de los opacos. */
export function bleed(src: Uint8ClampedArray, s: number): Uint8Array {
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

export type MipLevel = { data: Uint8Array; width: number; height: number };

const coverage = (alpha: (i: number) => number, n: number) => {
  let c = 0;
  for (let i = 0; i < n; i++) if (alpha(i) >= ALPHA_CUT) c++;
  return c / n;
};

/**
 * Cadena completa de mipmaps (2×2 → 1, color promediado por alfa) que conserva la cobertura del alphaTest
 * (Castaño 2010): en cada nivel se escala el alfa para que la fracción de texels ≥ corte sea la del nivel 0. Sin
 * esto el promedio baja el alfa de los trazos finos por debajo de 0.5 en uno o dos niveles y el follaje se borra.
 */
export function coverageMips(base: Uint8Array, size: number): MipLevel[] {
  const target = coverage((i) => base[i * 4 + 3], size * size);
  const levels: MipLevel[] = [{ data: base, width: size, height: size }];
  let raw = base; // nivel anterior sin escalar: se promedia siempre desde el alfa "real"
  for (let s = size >> 1; s >= 1; s >>= 1) {
    const src = s * 2;
    const next = new Uint8Array(s * s * 4);
    const hist = new Uint32Array(256);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        const i0 = (y * 2 * src + x * 2) * 4;
        for (const i of [i0, i0 + 4, i0 + src * 4, i0 + src * 4 + 4]) {
          const w = raw[i + 3] + 1; // +1: los texels transparentes también aportan (traen el color de "bleed")
          r += raw[i] * w; g += raw[i + 1] * w; b += raw[i + 2] * w; a += w;
        }
        const o = (y * s + x) * 4;
        next[o] = r / a; next[o + 1] = g / a; next[o + 2] = b / a;
        next[o + 3] = (a - 4) / 4;
        hist[next[o + 3]]++;
      }
    }
    // umbral t cuya cobertura (texels con alfa ≥ t) es la más cercana a la del nivel 0; escalar por ALPHA_CUT / t
    // deja exactamente esos texels ≥ corte. Ante un empate, o si si no quedaría nada, se incluye el escalón: mejor
    // conservar hebras que borrarlas.
    let t = 255, count = 0;
    const want = target * s * s;
    while (t > 1 && count + hist[t] <= want) count += hist[t--];
    if (t > 1 && hist[t] > 0 && (count === 0 || count + hist[t] - want <= want - count)) t--; // incluir el escalón t
    const scale = ALPHA_CUT / Math.max(1, t + 1);
    const out = new Uint8Array(next);
    for (let i = 3; i < out.length; i += 4) out[i] = Math.min(255, Math.floor(next[i] * scale + 1e-6));
    levels.push({ data: out, width: s, height: s });
    raw = next;
  }
  return levels;
}

function alphaTexture(size: number, draw: Draw, maxAnisotropy: number): THREE.DataTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  // se lee una vez con getImageData: sin esto, en móviles el canvas acelerado hace un readback sincrónico de la GPU
  const g = c.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  draw(g, size);
  const pixels = g.getImageData?.(0, 0, size, size)?.data;
  const data = pixels ? bleed(pixels, size) : new Uint8Array(size * size * 4);
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.mipmaps = coverageMips(data, size);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = false;
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
    // racimos grandes y superpuestos: la mata se ve llena (cobertura ~60 %) con huecos chicos y borde dentado
    const clumps = Array.from({ length: 13 }, (_, i) => {
      const a = (i / 13) * TAU * 2 + R() * 0.5;
      const d = i === 0 ? 0 : s * (i < 5 ? 0.12 : 0.24) * (0.8 + R() * 0.3);
      return { x: s / 2 + Math.cos(a) * d, y: s / 2 + Math.sin(a) * d, r: s * (0.13 + R() * 0.06) };
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
    // a 256 px (celulares) menos hojas pero más grandes: misma cobertura, ~1/3 menos trazos para generar
    const small = s < 512;
    const perClump = small ? 200 : 300;
    const leafScale = small ? 1.22 : 1;
    for (let pass = 0; pass < 2; pass++) {
      for (const c of clumps) {
        for (let i = 0; i < perClump / 2; i++) {
          const a = R() * TAU;
          const d = Math.sqrt(R()) * c.r * (pass ? 1.05 : 0.8);
          const x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
          const fromCenter = Math.hypot(x - s / 2, y - s / 2) / (s / 2);
          if (fromCenter > 0.9) continue; // nada cerca del borde: la silueta de la tarjeta no se ve cuadrada
          const up = 1 - y / s;
          const l = light + (pass ? 5 : -6) + fromCenter * 6 + up * 5 + (R() - 0.5) * 8;
          const len = s * (0.04 + R() * 0.025) * leafScale;
          leaf(g, x, y, len, len * 0.5, a + (R() - 0.5) * 1.2, hsl(hue + (R() - 0.5) * hueJitter, sat + (R() - 0.5) * 12, l));
        }
      }
    }
  };
}

// Sauce: hebras largas y apretadas que cuelgan desde arriba con hojas angostas a ambos lados (la misma textura va en
// la cúpula y en la falda: un solo follaje).
const willow: Draw = (g, s) => {
  const R = rng(31);
  // ramitas finas y largas (casi toda la tarjeta) con hojas chicas y angostas: se lee "ramas que caen", no una mota
  const strands = 85;
  const step = s * 0.014;
  for (let i = 0; i < strands; i++) {
    let x = s * (0.03 + 0.94 * R());
    let y = s * R() * 0.08;
    const len = s * (0.7 + R() * 0.28);
    const sway = (R() - 0.5) * 0.2;
    const steps = Math.round(len / step);
    const hue = 92 + (R() - 0.5) * 14, l0 = 38 + R() * 12;
    g.strokeStyle = hsl(85, 30, 32);
    g.lineWidth = Math.max(1, s / 512);
    g.beginPath();
    g.moveTo(x, y);
    const pts: [number, number][] = [];
    for (let k = 0; k < steps; k++) {
      x += Math.sin(k * 0.25 + i) * s * 0.0015 + sway * s * 0.006;
      y += step;
      g.lineTo(x, y);
      pts.push([x, y]);
    }
    g.stroke();
    for (const [k, [px, py]] of pts.entries()) {
      const t = k / steps;
      const side = k % 2 ? 1 : -1;
      const ang = Math.PI / 2 + side * (0.3 + R() * 0.3);
      const len = s * (0.032 + R() * 0.014) * (1 - 0.3 * t);
      leaf(g, px, py, len, len * 0.24, ang, hsl(hue + (R() - 0.5) * 10, 46 + R() * 12, l0 + (R() - 0.5) * 8 - t * 5));
    }
  }
};

/** Regiones del atlas (u0, v0, u1, v1; v = 0 abajo) de las texturas con más de una vista o variedad. */
// entre la vista de arriba y la lateral queda una franja transparente de 0.02 (5 px a 256): sin sangrado al filtrar
export const LAVENDER_ATLAS = { side: [0, 0.3, 1, 1], top: [0, 0, 0.28, 0.28] } as const;
export const FLAX_ATLAS = { bronze: [0, 0, 0.5, 1], variegated: [0.5, 0, 1, 1] } as const;

// Lavanda, vista lateral (dibujada en un cuadrado s×s; el atlas la aplasta a la franja de arriba): mata densa verde
// salvia (cúpula de hojitas finas) y tallos en abanico con espigas violetas (Lavandula stoechas, con "orejas").
const sage = (R: () => number, top: number) => hsl(96 + (R() - 0.5) * 20, 20 + R() * 12, 40 + top * 20 + (R() - 0.5) * 10);
const lavenderSide = (g: CanvasRenderingContext2D, s: number, R: () => number) => {
  const bx = s / 2, by = s;
  for (let i = 0; i < 1400; i++) {
    const a = R() * Math.PI;
    const d = Math.sqrt(R());
    const x = bx + Math.cos(a) * d * s * 0.42;
    const y = by - Math.sin(a) * d * s * 0.5;
    const ang = -Math.PI / 2 + ((x - bx) / (s * 0.42)) * 0.9 + (R() - 0.5) * 0.8;
    const len = s * (0.045 + R() * 0.03);
    leaf(g, x, y, len, len * 0.22, ang, sage(R, (by - y) / (s * 0.5)));
  }
  for (let i = 0; i < 90; i++) {
    const u = (R() - 0.5) * 2;
    const x0 = bx + u * s * 0.3, y0 = by - s * (0.2 + R() * 0.15) * (1 - Math.abs(u) * 0.5);
    const ang = u * 0.75 + (R() - 0.5) * 0.3;
    const len = s * (0.3 + 0.2 * (1 - Math.abs(u)) * (0.6 + 0.4 * R()));
    const tx = x0 + Math.sin(ang) * len, ty = y0 - Math.cos(ang) * len;
    g.strokeStyle = hsl(90, 16, 46 + R() * 12);
    g.lineWidth = Math.max(1, s * 0.004);
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(tx, ty);
    g.stroke();
    spike(g, s, R, tx, ty, ang);
  }
};
// espiga: gotas apiladas a lo largo del tallo y dos "orejas" claras en la punta
function spike(g: CanvasRenderingContext2D, s: number, R: () => number, tx: number, ty: number, ang: number) {
  const len = s * 0.075;
  const hue = 262 + (R() - 0.5) * 16;
  for (let k = 0; k < 6; k++) {
    const t = k / 5;
    const px = tx - Math.sin(ang) * len * (1 - t), py = ty + Math.cos(ang) * len * (1 - t);
    const w = s * (0.016 - t * 0.004);
    leaf(g, px - Math.sin(ang) * w * 0.6, py + Math.cos(ang) * w * 0.6, w * 1.4, w * 1.15, ang - Math.PI / 2, hsl(hue, 32 + R() * 14, 42 + R() * 12 + t * 6));
  }
  for (const side of [-1, 1]) leaf(g, tx, ty, s * 0.028, s * 0.013, ang - Math.PI / 2 + side * 0.45, hsl(hue + 6, 40, 58 + R() * 10));
}
// Lavanda vista desde arriba (para la tarjeta horizontal que tapa la estrella): disco de hojitas radiales con
// espigas violetas salpicadas. Se dibuja en un cuadrado s×s y el atlas lo achica a la esquina de abajo.
const lavenderTop = (g: CanvasRenderingContext2D, s: number, R: () => number) => {
  const c = s / 2, r = s * 0.42;
  for (let i = 0; i < 1500; i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r;
    const len = s * (0.06 + R() * 0.04);
    if (d + len > s * 0.48) continue;
    leaf(g, c + Math.cos(a) * d, c + Math.sin(a) * d, len, len * 0.24, a + (R() - 0.5) * 0.7, sage(R, 1 - d / r));
  }
  for (let i = 0; i < 70; i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r * 0.85;
    const x = c + Math.cos(a) * d, y = c + Math.sin(a) * d;
    const w = s * (0.03 + R() * 0.015);
    leaf(g, x, y, w * 1.6, w, a, hsl(262 + (R() - 0.5) * 16, 34 + R() * 12, 44 + R() * 14));
  }
};
const lavender: Draw = (g, s) => {
  const R = rng(41);
  g.lineCap = "round";
  g.save();
  g.scale(1, 0.7);
  lavenderSide(g, s, R);
  g.restore();
  g.save();
  g.translate(0, s * 0.72);
  g.scale(0.28, 0.28);
  lavenderTop(g, s, R);
  g.restore();
};

// Formio: hojas en espada que salen en abanico de la base y se arquean. Dos variedades lado a lado en el atlas:
// rojo bronce oscuro con margen rosado apagado, y variegado verde con bandas amarillas (como en las fotos).
type FlaxPalette = { body: (R: () => number) => [number, number, number]; edge: (l: number, R: () => number) => string; stripe?: string };
const BRONZE: FlaxPalette = {
  body: (R) => [352 + R() * 14, 30 + R() * 14, 17 + R() * 8],
  edge: (l, R) => hsl(8 + R() * 10, 32, l + 12),
};
const VARIEGATED: FlaxPalette = {
  body: (R) => [118 + R() * 12, 42 + R() * 12, 26 + R() * 7],
  edge: (l, R) => hsl(68 + R() * 6, 45, 50 + R() * 8),
  stripe: hsl(72, 40, 48),
};
function flaxPlant(g: CanvasRenderingContext2D, s: number, R: () => number, pal: FlaxPalette) {
  const bx = s / 2, by = s;
  const n = 17;
  const path = (pts: [number, number][]) => {
    g.beginPath();
    for (const [k, [x, y]] of pts.entries()) {
      if (k) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
  };
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1) - 0.5) * 2; // -1..1
    const ang = u * 0.55 + (R() - 0.5) * 0.15;
    const len = s * (0.98 - Math.abs(u) * 0.35) * (0.85 + R() * 0.15);
    const droop = u * s * 0.08;
    // el atlas comprime x a la mitad: el doble de ancho acá queda proporcionado en la tarjeta
    const w0 = 2 * s * (0.022 + R() * 0.01);
    const edge = (side: number, k0 = 1): [number, number][] => {
      const out: [number, number][] = [];
      for (let k = 0; k <= 16; k++) {
        const t = k / 16;
        const cx = bx + Math.sin(ang) * len * t + droop * t * t;
        const cy = by - Math.cos(ang) * len * t + Math.abs(droop) * t * t * 0.6;
        const w = k0 * w0 * Math.pow(1 - t, 0.8) * (0.4 + 0.6 * Math.sin((Math.min(1, t * 4 + 0.3) * Math.PI) / 2));
        out.push([cx + side * w * Math.cos(ang), cy + side * w * Math.sin(ang)]);
      }
      return out;
    };
    const left = edge(-1), right = edge(1);
    const [h, sat, l] = pal.body(R);
    g.fillStyle = hsl(h, sat, l);
    path([...left, ...right.reverse()]);
    g.closePath();
    g.fill();
    if (pal.stripe) {
      g.fillStyle = pal.stripe;
      path([...edge(-0.12), ...edge(0.12).reverse()]);
      g.closePath();
      g.fill();
    }
    g.strokeStyle = pal.edge(l, R);
    g.lineWidth = Math.max(1, s * 0.006);
    path(left);
    g.stroke();
    if (pal.stripe) {
      path(right);
      g.stroke();
    }
  }
}
const flax: Draw = (g, s) => {
  const R = rng(51);
  for (const [x0, pal] of [[0, BRONZE], [s / 2, VARIEGATED]] as const) {
    g.save();
    g.beginPath();
    g.rect(x0, 0, s / 2, s);
    g.clip();
    g.translate(x0, 0);
    g.scale(0.5, 1);
    flaxPlant(g, s, R, pal);
    g.restore();
  }
};

export function makeFoliageTextures(detail: GeometryDetail, maxAnisotropy: number): Record<FoliageKey, THREE.DataTexture> {
  const size = FOLIAGE_TEXTURE_SIZE[detail];
  const tex = (draw: Draw) => alphaTexture(size, draw, maxAnisotropy);
  return {
    leaves: tex(leafClusters(61, 108, 44, 35, 14)),
    photiniaLeaves: tex(leafClusters(67, 4, 62, 30, 14)),
    willow: tex(willow),
    lavender: tex(lavender),
    flax: tex(flax),
  };
}
