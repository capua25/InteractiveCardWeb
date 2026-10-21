import type { TourSceneId } from "@/domain/venue";
import type { TourModule } from "./types";

// Cada escena se baja en su propio chunk (con three) recién al abrir el recorrido.
export const tourScenes: Record<TourSceneId, () => Promise<TourModule>> = {
  barbatos: () => import("./scenes/barbatos"),
};

export function loadTourScene(id: TourSceneId): Promise<TourModule> {
  return tourScenes[id]();
}
