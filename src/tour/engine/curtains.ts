import type * as THREE from "three";

// Escala vertical de una cortina enrollada y duración de la animación (la usa el controlador).
export const CURTAIN_ROLLED_SCALE = 0.04;
export const CURTAIN_DURATION_MS = 600;

export type FrameScheduler = { request(cb: () => void): number; cancel(id: number): void; now(): number };

export type CurtainRig = {
  readonly available: boolean;
  // `open` = cortinas enrolladas (escala mínima); cerradas = bajadas (escala 1).
  set(open: boolean, animate: boolean): void;
  dispose(): void;
};

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// Anima `scale.y` de los grupos de cortinas. Solo hay un rAF vivo y solo mientras dura la
// transición: en reposo no cuesta nada por frame. Enrolladas, los grupos se ocultan para no
// pagar un draw transparente ordenado.
export function createCurtainRig(
  targets: THREE.Object3D[],
  render: () => void,
  frames: FrameScheduler,
): CurtainRig {
  let scale = CURTAIN_ROLLED_SCALE;
  let frameId: number | null = null;
  let disposed = false;

  const apply = (value: number) => {
    scale = value;
    const rolled = value <= CURTAIN_ROLLED_SCALE;
    for (const t of targets) {
      t.scale.y = value;
      t.visible = !rolled;
    }
  };
  const cancelFrame = () => {
    if (frameId !== null) frames.cancel(frameId);
    frameId = null;
  };
  apply(CURTAIN_ROLLED_SCALE);

  return {
    available: targets.length > 0,
    set(open, animate) {
      if (disposed || targets.length === 0) return;
      cancelFrame();
      const to = open ? CURTAIN_ROLLED_SCALE : 1;
      if (!animate || to === scale) {
        apply(to);
        render();
        return;
      }
      const from = scale;
      const start = frames.now();
      const tick = () => {
        frameId = null;
        if (disposed) return;
        const p = Math.min(1, (frames.now() - start) / CURTAIN_DURATION_MS);
        apply(p >= 1 ? to : from + (to - from) * easeInOutCubic(p));
        render();
        if (p < 1) frameId = frames.request(tick);
      };
      // Visibles desde el primer instante hacia "abajo", aun antes del primer frame.
      for (const t of targets) t.visible = true;
      frameId = frames.request(tick);
    },
    dispose() {
      disposed = true;
      cancelFrame();
    },
  };
}
