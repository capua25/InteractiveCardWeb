import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getVenueBySlug } from "@/domain/venue-repository";

describe("contenido de Barbato's", () => {
  it("las imágenes de Barbato's existen en public/ y la OG es 1200×630", () => {
    const b = getVenueBySlug("barbatos")!;
    for (const src of [b.hero.image, b.seo.ogImage, ...b.gallery!.map((g) => g.src)]) {
      expect(existsSync(join("public", src)), src).toBe(true);
    }
    expect(b.gallery).toHaveLength(14);
    expect(new Set(b.gallery!.map((g) => g.src)).size).toBe(b.gallery!.length);
    const png = readFileSync(join("public", b.seo.ogImage));
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
    expect(png.length).toBeLessThanOrEqual(300 * 1024);
  });

  it("los textos de Barbato's quedan marcados como placeholder", () => {
    const b = getVenueBySlug("barbatos")!;
    for (const text of [b.tagline, b.about!, b.whatsapp.message, b.location!.address, b.seo.title, b.seo.description]) {
      expect(text).toContain("(PLACEHOLDER)");
    }
  });

  it("el WhatsApp placeholder usa el código de país de Uruguay (+598)", () => {
    const b = getVenueBySlug("barbatos")!;
    expect(b.whatsapp.phone.replace(/\D/g, "")).toMatch(/^598/);
  });
});
