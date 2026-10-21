import type { Quality } from "../types";

const MOBILE_WIDTH = 768;

export function pickQuality(input: { coarsePointer: boolean; width: number; dpr: number }): Quality {
  const mobile = input.coarsePointer || input.width < MOBILE_WIDTH;
  return {
    pixelRatio: Math.min(input.dpr, mobile ? 1.5 : 2),
    shadowMapSize: mobile ? 1024 : 2048,
    antialias: true,
    maxAnisotropy: 4, // tope; el viewer lo cruza con el de la GPU
    detail: mobile ? "low" : "high",
  };
}

export function detectQuality(): Quality {
  return pickQuality({
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    width: window.innerWidth,
    dpr: window.devicePixelRatio || 1,
  });
}
