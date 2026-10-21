import { describe, expect, it } from "vitest";
import { venues } from "@/content/venues";
import { loadTourScene, tourScenes } from "./registry";

describe("registry", () => {
  it("registra la escena barbatos", () => {
    expect(Object.keys(tourScenes)).toEqual(["barbatos"]);
  });

  it("loadTourScene('barbatos') resuelve un módulo con mount", async () => {
    expect(typeof (await loadTourScene("barbatos")).mount).toBe("function");
  });

  it("toda venue.tour.scene del contenido tiene escena registrada", () => {
    const withTour = venues.filter((v) => v.tour);
    expect(withTour.length).toBeGreaterThan(0);
    for (const v of withTour) expect(tourScenes).toHaveProperty(v.tour!.scene);
  });
});
