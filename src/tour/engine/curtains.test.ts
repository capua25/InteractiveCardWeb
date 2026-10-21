import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { CURTAIN_DURATION_MS, CURTAIN_ROLLED_SCALE, createCurtainRig, type FrameScheduler } from "./curtains";

function fakeFrames() {
  let time = 0;
  let nextId = 1;
  const pending = new Map<number, () => void>();
  const frames: FrameScheduler & { request: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> } = {
    request: vi.fn((cb: () => void) => {
      const id = nextId++;
      pending.set(id, cb);
      return id;
    }),
    cancel: vi.fn((id: number) => void pending.delete(id)),
    now: () => time,
  };
  // Avanza el reloj y corre los callbacks pendientes en ese instante.
  const advanceTo = (t: number) => {
    time = t;
    for (const [id, cb] of [...pending]) {
      pending.delete(id);
      cb();
    }
  };
  return { frames, advanceTo, pending };
}

const setup = (count = 2) => {
  const targets = Array.from({ length: count }, () => new THREE.Group());
  const render = vi.fn();
  const f = fakeFrames();
  const rig = createCurtainRig(targets, render, f.frames);
  return { targets, render, rig, ...f };
};

describe("createCurtainRig", () => {
  it("arranca abierta con la escala enrollada", () => {
    const { targets, rig } = setup();
    expect(rig.available).toBe(true);
    for (const t of targets) expect(t.scale.y).toBe(CURTAIN_ROLLED_SCALE);
  });

  it("oculta los grupos mientras están enrollados y los muestra al bajar", () => {
    const { targets, rig, advanceTo } = setup();
    expect(targets.every((t) => !t.visible)).toBe(true);
    rig.set(false, true);
    expect(targets.every((t) => t.visible)).toBe(true);
    advanceTo(CURTAIN_DURATION_MS);
    expect(targets.every((t) => t.visible)).toBe(true);
    rig.set(true, false);
    expect(targets.every((t) => !t.visible)).toBe(true);
  });

  it("sin animate no usa requestAnimationFrame", () => {
    const { targets, rig, frames, render } = setup();
    rig.set(false, false);
    expect(frames.request).not.toHaveBeenCalled();
    for (const t of targets) expect(t.scale.y).toBe(1);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("animate interpola en 600 ms y deja de pedir frames", () => {
    const { targets, rig, advanceTo, pending, render } = setup();
    rig.set(false, true);
    expect(pending.size).toBe(1);
    advanceTo(300);
    const mid = targets[0].scale.y;
    expect(mid).toBeGreaterThan(CURTAIN_ROLLED_SCALE);
    expect(mid).toBeLessThan(1);
    expect(pending.size).toBe(1);
    advanceTo(600);
    expect(targets[0].scale.y).toBe(1);
    expect(pending.size).toBe(0);
    const calls = render.mock.calls.length;
    advanceTo(900);
    expect(render).toHaveBeenCalledTimes(calls);
  });

  it("retarget a mitad de animación usa un solo loop y termina", () => {
    const { targets, rig, advanceTo, pending } = setup();
    rig.set(false, true);
    advanceTo(0);
    advanceTo(300);
    rig.set(true, true);
    expect(pending.size).toBeLessThanOrEqual(1);
    for (let t = 400; t <= 1200; t += 100) {
      advanceTo(t);
      expect(pending.size).toBeLessThanOrEqual(1);
    }
    expect(targets[0].scale.y).toBe(CURTAIN_ROLLED_SCALE);
    expect(targets[0].visible).toBe(false);
    expect(pending.size).toBe(0);
  });

  it("dispose cancela la animación en curso", () => {
    const { rig, frames, advanceTo, render } = setup();
    rig.set(false, true);
    advanceTo(100);
    const calls = render.mock.calls.length;
    rig.dispose();
    expect(frames.cancel).toHaveBeenCalled();
    advanceTo(700);
    rig.set(true, false);
    expect(render).toHaveBeenCalledTimes(calls);
  });

  it("sin objetos no está disponible", () => {
    const { rig, frames, render } = setup(0);
    expect(rig.available).toBe(false);
    rig.set(false, true);
    expect(frames.request).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });
});
