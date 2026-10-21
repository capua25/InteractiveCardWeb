import * as THREE from "three";

export function rng(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function noise(
  g: CanvasRenderingContext2D,
  s: number,
  n: number,
  r: number,
  colors: string[],
  alpha: number,
): void {
  const R = rng(n);
  for (let i = 0; i < n; i++) {
    g.globalAlpha = alpha;
    g.fillStyle = colors[(R() * colors.length) | 0];
    g.fillRect(R() * s, R() * s, r, r);
  }
  g.globalAlpha = 1;
}

export function canvasTex(
  size: number,
  draw: (g: CanvasRenderingContext2D, s: number) => void,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d") as CanvasRenderingContext2D, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAnisotropy;
  return t;
}

export type TextureKey =
  | "stone" | "ceiling" | "wood" | "roof" | "gravel"
  | "plaster" | "wallLow" | "cement" | "grass" | "carpet";
export type Textures = Record<TextureKey, THREE.Texture>;

export function makeTextures(maxAnisotropy: number): Textures {
  const tex = (size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) =>
    canvasTex(size, draw, maxAnisotropy);

  const stone = tex(256, (g, s) => {
    const R = rng(7);
    g.fillStyle = "#2f3438";
    g.fillRect(0, 0, s, s);
    let y = 0;
    while (y < s) {
      const rh = 22 + R() * 20;
      let x = -R() * 30;
      while (x < s) {
        const rw = 28 + R() * 34;
        g.fillStyle = `hsl(${200 + R() * 15},${6 + R() * 4}%,${28 + R() * 14}%)`;
        if (R() < 0.08) g.fillStyle = "#8a5a3c";
        g.beginPath();
        g.roundRect(x + 2, y + 2, rw - 4, rh - 4, 6 + R() * 6);
        g.fill();
        x += rw;
      }
      y += rh;
    }
    noise(g, s, 3000, 2, ["#000", "#fff"], 0.08);
  });

  const ceiling = tex(256, (g, s) => {
    const R = rng(3);
    const ph = s / 8;
    for (let i = 0; i < 8; i++) {
      g.fillStyle = `hsl(${26 + R() * 8},${42 + R() * 10}%,${36 + R() * 12}%)`;
      g.fillRect(0, i * ph, s, ph);
      g.strokeStyle = "rgba(60,30,10,.25)";
      g.lineWidth = 1;
      for (let k = 0; k < 5; k++) {
        g.beginPath();
        const yy = i * ph + R() * ph;
        g.moveTo(0, yy);
        g.bezierCurveTo(s * 0.3, yy + R() * 6 - 3, s * 0.6, yy + R() * 6 - 3, s, yy);
        g.stroke();
      }
      g.fillStyle = "rgba(30,15,5,.6)";
      g.fillRect(0, i * ph, s, 2);
    }
  });

  const roof = tex(128, (g, s) => {
    for (let x = 0; x < s; x++) {
      const v = 175 + 80 * (0.5 + 0.5 * Math.sin((x / s) * Math.PI * 2 * 8));
      g.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
      g.fillRect(x, 0, 1, s);
    }
    noise(g, s, 600, 2, ["#000", "#888"], 0.1);
  });

  const gravel = tex(256, (g, s) => {
    g.fillStyle = "#9a948c";
    g.fillRect(0, 0, s, s);
    const R = rng(11);
    for (let i = 0; i < 4000; i++) {
      const v = (110 + R() * 90) | 0;
      g.fillStyle = `rgb(${v},${v - 3},${v - 8})`;
      g.beginPath();
      g.arc(R() * s, R() * s, 0.8 + R() * 2, 0, 7);
      g.fill();
    }
  });

  const plaster = tex(256, (g, s) => {
    g.fillStyle = "#8a3a2b";
    g.fillRect(0, 0, s, s);
    noise(g, s, 6000, 2, ["#a04a34", "#6e2a20"], 0.12);
  });
  const wallLow = tex(256, (g, s) => {
    g.fillStyle = "#a8a296";
    g.fillRect(0, 0, s, s);
    noise(g, s, 5000, 2, ["#b4aea2", "#9a9488"], 0.12);
    // juntas de mortero gris: hiladas de 16 px, bloques de 32 px alternados
    g.fillStyle = "#7f7b74";
    for (let row = 0; row < s / 16; row++) {
      g.fillRect(0, row * 16, s, 1);
      const off = row % 2 ? 16 : 0;
      for (let x = off; x < s; x += 32) g.fillRect(x, row * 16, 1, 16);
    }
  });
  const cement = tex(256, (g, s) => {
    g.fillStyle = "#cdc9c0";
    g.fillRect(0, 0, s, s);
    noise(g, s, 6000, 2, ["#fff", "#8f8a80"], 0.1);
    noise(g, s, 40, 30, ["#bdb8ad"], 0.15);
  });
  const grass = tex(256, (g, s) => {
    g.fillStyle = "#7a8a3e";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 4; i++) {
      g.fillStyle = i % 2 ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.05)";
      g.fillRect(0, i * 64, s, 64);
    }
    const R = rng(21);
    g.globalAlpha = 0.25;
    g.fillStyle = "#9a9a58";
    for (let i = 0; i < 40; i++) {
      g.beginPath();
      g.arc(R() * s, R() * s, 18, 0, 7);
      g.fill();
    }
    g.globalAlpha = 1;
    noise(g, s, 9000, 2, ["#8a9a4c", "#5f6f30"], 0.5);
  });
  const carpet = tex(128, (g, s) => {
    g.fillStyle = "#962020";
    g.fillRect(0, 0, s, s);
    noise(g, s, 3000, 1, ["#b83030", "#5e1010"], 0.25);
  });

  return { stone, ceiling, wood: ceiling, roof, gravel, plaster, wallLow, cement, grass, carpet };
}
