import { expect, test, type Page } from "@playwright/test";

// El chunk de three se reconoce por literales que sobreviven a la minificación.
function isThreeChunk(body: string): boolean {
  return body.includes("MeshStandardMaterial") && body.includes("#include <");
}

function trackThreeChunks(page: Page): () => string[] {
  const urls: string[] = [];
  page.on("response", async (response) => {
    const url = response.url();
    if (!/\/_next\/static\/chunks\/.+\.js(\?|$)/.test(url)) return;
    try {
      const body = await response.text();
      if (isThreeChunk(body)) urls.push(url);
    } catch {
      // Respuesta descartada (navegación): no aporta.
    }
  });
  return () => [...urls];
}

async function openCard(page: Page) {
  await page.goto("/barbatos");
  await page.getByRole("button", { name: /Abrir la invitación/ }).tap();
  await expect(page.getByRole("heading", { level: 1, name: "Barbato's" })).toBeVisible();
}

async function openTour(page: Page) {
  await openCard(page);
  await page.getByRole("button", { name: "Recorrer el salón" }).tap();
  const dialog = page.getByRole("dialog", { name: "Recorrido 3D de Barbato's" });
  await expect(dialog.locator("canvas")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Afuera" })).toBeVisible();
  return dialog;
}

test("/barbatos responde 200 con el h1 Barbato's", async ({ page }) => {
  const res = await page.goto("/barbatos");
  expect(res?.status()).toBe(200);
  await page.getByRole("button", { name: /Abrir la invitación/ }).tap();
  await expect(page.getByRole("heading", { level: 1, name: "Barbato's" })).toBeVisible();
});

test("el botón del recorrido queda inaccesible hasta abrir el sobre", async ({ page }) => {
  await page.goto("/barbatos");
  // Con el sobre cerrado la tarjeta es inert: el botón no está en el árbol accesible.
  await expect(page.getByRole("button", { name: "Recorrer el salón" })).toHaveCount(0);
  await page.getByRole("button", { name: /Abrir la invitación/ }).tap();
  await expect(page.getByRole("button", { name: "Recorrer el salón" })).toBeVisible();
});

test("three no se descarga antes del toque y sí después", async ({ page }) => {
  const threeChunks = trackThreeChunks(page);
  await openCard(page);
  await page.waitForLoadState("networkidle");
  expect(threeChunks()).toHaveLength(0);
  await page.getByRole("button", { name: "Recorrer el salón" }).tap();
  await expect(page.getByRole("dialog").locator("canvas")).toBeVisible();
  await expect.poll(() => threeChunks().length).toBeGreaterThan(0);
});

test("muestra el loader mientras baja el recorrido", async ({ page }) => {
  await openCard(page);
  await page.waitForLoadState("networkidle");
  // Solo se demora el chunk de three (lo trae la escena): el overlay ya está en el JS inicial.
  const chunks = "**/_next/static/chunks/*.js";
  await page.route(chunks, async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    if (isThreeChunk(body)) await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.fulfill({ response, body });
  });
  try {
    await page.getByRole("button", { name: "Recorrer el salón" }).tap();
    const dialog = page.getByRole("dialog", { name: "Recorrido 3D de Barbato's" });
    const loader = dialog.getByTestId("tour-loader");
    await expect(loader).toBeVisible();
    await expect(loader.getByRole("status")).toHaveText("Cargando el recorrido…");
    // Mientras carga, Cerrar ya está disponible.
    await expect(dialog.getByRole("button", { name: "Cerrar" })).toBeVisible();
    await expect(dialog.locator("canvas")).toBeVisible({ timeout: 15_000 });
    await expect(loader).toHaveCount(0);
  } finally {
    await page.unroute(chunks);
  }
});

test("el visor abre con canvas, sus botones responden y Cerrar vuelve con scroll y foco", async ({ page }) => {
  const dialog = await openTour(page);
  const afuera = dialog.getByRole("button", { name: "Afuera" });
  const adentro = dialog.getByRole("button", { name: "Adentro" });
  await expect(afuera).toHaveAttribute("aria-pressed", "true");

  // El WhatsApp flotante no tapa el diálogo.
  const insideDialog = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth - 24, window.innerHeight - 24);
    return Boolean(el?.closest('[role="dialog"]'));
  });
  expect(insideDialog).toBe(true);

  await adentro.tap();
  await expect(adentro).toHaveAttribute("aria-pressed", "true");
  await expect(afuera).toHaveAttribute("aria-pressed", "false");
  await afuera.tap();
  await expect(afuera).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Sin techo" }).tap();
  await expect(dialog.getByRole("button", { name: "Con techo" })).toHaveAttribute("aria-pressed", "true");

  await dialog.getByRole("button", { name: "Cerrar" }).tap();
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  const before = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => window.scrollBy(0, 400));
  await expect.poll(() => page.evaluate(() => window.scrollY)).not.toBe(before);
  await expect(page.getByRole("button", { name: "Recorrer el salón" })).toBeFocused();
});

test("Escape cierra el visor y devuelve el foco a Recorrer el salón", async ({ page }) => {
  const dialog = await openTour(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Recorrer el salón" })).toBeFocused();
});

// Review Focus 3
test("atrás cierra el visor y la página sigue en /barbatos", async ({ page }) => {
  let dialog = await openTour(page);
  await page.goBack();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/barbatos$/);
  await expect(page.getByRole("heading", { level: 1, name: "Barbato's" })).toBeVisible();

  // Cerrar quita la entrada apilada: el próximo "atrás" no queda como paso fantasma.
  await page.getByRole("button", { name: "Recorrer el salón" }).tap();
  dialog = page.getByRole("dialog", { name: "Recorrido 3D de Barbato's" });
  await expect(dialog.locator("canvas")).toBeVisible();
  await expect.poll(() => page.evaluate(() => history.state?.venueTour ?? null)).toBe(true);
  await dialog.getByRole("button", { name: "Cerrar" }).tap();
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => history.state?.venueTour ?? null)).toBeNull();
});

test("la vista Afuera dibuja menos de 150 draw calls", async ({ page }) => {
  const dialog = await openTour(page);
  const canvas = dialog.locator("canvas[data-draw-calls]");
  await expect(canvas).toHaveCount(1);
  const drawCalls = Number(await canvas.getAttribute("data-draw-calls"));
  test.info().annotations.push({ type: "draw-calls", description: String(drawCalls) });
  expect(drawCalls).toBeGreaterThan(0);
  expect(drawCalls).toBeLessThan(150);
});

test("sin WebGL muestra el fallback y no baja three", async ({ page }) => {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return /webgl/.test(type) ? null : orig.call(this, type, ...(rest as []));
    } as typeof orig;
  });
  const threeChunks = trackThreeChunks(page);
  await openCard(page);
  await page.getByRole("button", { name: "Recorrer el salón" }).tap();
  const dialog = page.getByRole("dialog", { name: "Recorrido 3D de Barbato's" });
  await expect(dialog.getByText("Tu dispositivo no puede mostrar el recorrido 3D")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cerrar" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(threeChunks()).toHaveLength(0);
});

test.describe("con prefers-reduced-motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("el visor abre y los botones funcionan", async ({ page }) => {
    const dialog = await openTour(page);
    const afuera = dialog.getByRole("button", { name: "Afuera" });
    const adentro = dialog.getByRole("button", { name: "Adentro" });
    await adentro.tap();
    await expect(adentro).toHaveAttribute("aria-pressed", "true");
    await afuera.tap();
    await expect(afuera).toHaveAttribute("aria-pressed", "true");
    await dialog.getByRole("button", { name: "Sin techo" }).tap();
    await expect(dialog.getByRole("button", { name: "Con techo" })).toHaveAttribute("aria-pressed", "true");
    await dialog.getByRole("button", { name: "Cerrar" }).tap();
    await expect(dialog).toBeHidden();
  });
});
