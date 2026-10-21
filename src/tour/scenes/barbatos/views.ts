import type { CameraView, TourView } from "../../types";

export const BARBATOS_VIEWS: Record<TourView, CameraView> = {
  out: { pos: [15, 9.5, 16.5], target: [-1.5, 2, -1] },
  in: { pos: [-8.2, 1.75, 0], target: [-2, 1.5, 0] },
};
