import { expect, test } from "@playwright/test";

// buildWhatsAppLink("+54 9 11 0000-0000", "¡Hola! Vi la tarjeta del salón y quiero consultar por un evento 🎉")
const EXPECTED_CTA_HREF =
  "https://wa.me/5491100000000?text=%C2%A1Hola!%20Vi%20la%20tarjeta%20del%20sal%C3%B3n%20y%20quiero%20consultar%20por%20un%20evento%20%F0%9F%8E%89";

test.describe("tarjeta con sobre (salon-ejemplo)", () => {
  test("abre el sobre con un tap y muestra el contenido", async ({ page }) => {
    await page.goto("/salon-ejemplo");
    const envelope = page.getByRole("button", { name: /Abrir la invitación/ });
    await expect(envelope).toBeVisible();
    await expect(page.getByTestId("whatsapp-floating")).toHaveCount(0);

    await envelope.tap();

    await expect(envelope).toBeHidden();
    await expect(page.getByRole("heading", { level: 1, name: "Salón Ejemplo (PLACEHOLDER)" })).toBeVisible();
    await expect(page.getByTestId("whatsapp-floating")).toBeVisible();
  });

  test("el CTA final apunta al link wa.me esperado", async ({ page }) => {
    await page.goto("/salon-ejemplo");
    await page.getByRole("button", { name: /Abrir la invitación/ }).tap();
    const cta = page.getByRole("link", { name: "Consultar disponibilidad" });
    await cta.scrollIntoViewIfNeeded();
    await expect(cta).toHaveAttribute("href", EXPECTED_CTA_HREF);
  });

  test("expone las meta tags Open Graph en el HTML", async ({ page }) => {
    await page.goto("/salon-ejemplo");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "Salón Ejemplo — Eventos (PLACEHOLDER)",
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /^https?:\/\/.+\/venues\/salon-ejemplo\/og\.png$/,
    );
  });
});

test.describe("tarjeta sin sobre (salon-minimo)", () => {
  // Review Focus 5
  test("entra directo al hero con el botón flotante visible", async ({ page }) => {
    await page.goto("/salon-minimo");
    await expect(page.getByRole("button", { name: /Abrir la invitación/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "Salón Mínimo (PLACEHOLDER)" })).toBeVisible();
    await expect(page.getByTestId("whatsapp-floating")).toBeVisible();
  });

  // Review Focus 3
  test("con solo campos obligatorios no renderiza secciones opcionales", async ({ page }) => {
    await page.goto("/salon-minimo");
    await expect(page.getByRole("heading", { name: "¿Hacemos tu evento acá?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ubicación" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Galería" })).toHaveCount(0);
  });
});

// Review Focus 4
test("un slug inexistente responde 404", async ({ page }) => {
  const response = await page.goto("/no-existe");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "No encontramos esta tarjeta" })).toBeVisible();
});

test("la raíz redirige al primer salón", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/barbatos$/);
});

test.describe("con prefers-reduced-motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("el sobre sigue abriendo y muestra el contenido", async ({ page }) => {
    await page.goto("/salon-ejemplo");
    await page.getByRole("button", { name: /Abrir la invitación/ }).tap();
    await expect(page.getByRole("heading", { level: 1, name: "Salón Ejemplo (PLACEHOLDER)" })).toBeVisible();
  });
});
