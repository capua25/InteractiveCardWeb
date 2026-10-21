import { describe, expect, it } from "vitest";
import { loadTourScene, tourScenes } from "./registry";

describe("registry", () => {
  it("registra la escena barbatos", () => {
    expect(Object.keys(tourScenes)).toEqual(["barbatos"]);
  });

  it("loadTourScene('barbatos') resuelve un módulo con mount", async () => {
    expect(typeof (await loadTourScene("barbatos")).mount).toBe("function");
  });
});
