import { describe, expect, it } from "vitest";
import { getSiteUrl } from "@/lib/site-url";

describe("getSiteUrl", () => {
  it("prioriza NEXT_PUBLIC_SITE_URL", () => {
    expect(
      getSiteUrl({
        NEXT_PUBLIC_SITE_URL: "https://salon.com.ar",
        VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app",
      }).href,
    ).toBe("https://salon.com.ar/");
  });

  it("usa el dominio de producción de Vercel si no hay URL explícita", () => {
    expect(getSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "tarjeta.vercel.app" }).href).toBe(
      "https://tarjeta.vercel.app/",
    );
  });

  it("cae a localhost en desarrollo", () => {
    expect(getSiteUrl({}).href).toBe("http://localhost:3000/");
  });
});
