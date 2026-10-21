import type { CameraView, TourView } from "../../types";

export const BARBATOS_VIEWS: Record<TourView, CameraView> = {
  out: { pos: [19, 10, 23], target: [-1, 2.5, 0] },
  in: { pos: [-11.2, 1.75, 0], target: [-4, 1.5, 0] },
};
