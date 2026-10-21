import type { Bounds, CameraView, TourView, Vec3 } from "../types";

export const NARROW_ASPECT = 1.1;
export const NARROW_OUT_SCALE = 1.5;

// En pantallas angostas la vista "out" se aleja desde su target para que entre el salón.
export function resolveViewPose(views: Record<TourView, CameraView>, view: TourView, aspect: number): CameraView {
  const pose = views[view];
  if (view !== "out" || aspect >= NARROW_ASPECT) return pose;
  const [px, py, pz] = pose.pos;
  const [tx, ty, tz] = pose.target;
  const s = NARROW_OUT_SCALE;
  return { pos: [tx + (px - tx) * s, ty + (py - ty) * s, tz + (pz - tz) * s], target: pose.target };
}

export function clampTarget(target: Vec3, bounds: Bounds): Vec3 {
  const c = (i: 0 | 1 | 2) => Math.min(bounds.max[i], Math.max(bounds.min[i], target[i]));
  return [c(0), c(1), c(2)];
}
