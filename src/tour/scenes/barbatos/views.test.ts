import { describe, expect, it } from "vitest";
import { BARBATOS_LAYOUT as L } from "./layout";
import { BARBATOS_VIEWS } from "./views";

describe("vistas de Barbato's", () => {
  it("la vista Adentro queda dentro del salón", () => {
    const { pos } = BARBATOS_VIEWS.in;
    expect(Math.abs(pos[0])).toBeLessThan(L.hall.hx - L.hall.wallThickness);
    expect(Math.abs(pos[2])).toBeLessThan(L.hall.hz - L.hall.wallThickness);
    expect(pos[1]).toBeLessThan(L.hall.wallHeight);
  });
  it("los targets caen dentro de targetBounds", () => {
    const { min, max } = L.targetBounds;
    for (const v of Object.values(BARBATOS_VIEWS))
      v.target.forEach((c, i) => {
        expect(c).toBeGreaterThanOrEqual(min[i]);
        expect(c).toBeLessThanOrEqual(max[i]);
      });
  });
});
