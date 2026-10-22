import { expect, test, type Page } from "@playwright/test";

async function openFirstPhoto(page: Page) {
  await page.goto("/barbatos");
  await page.getByRole("button", { name: /Abrir la invitación/ }).tap();
  await expect(page.getByRole("heading", { level: 1, name: "Barbato's" })).toBeVisible();
  const thumb = page.getByRole("button", { name: /^Ampliar imagen: Frente del salón de día/ });
  await thumb.scrollIntoViewIfNeeded();
  await thumb.tap();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName(/^Frente del salón de día/);
  await expect(dialog.getByText("1 / 14")).toBeVisible();
  return dialog;
}

test("galería: ArrowRight cambia la foto y Escape cierra", async ({ page }) => {
  const dialog = await openFirstPhoto(page);
  const photo = dialog.locator("img");
  await expect(photo).toHaveAttribute("alt", /^Frente del salón de día/);

  await page.keyboard.press("ArrowRight");
  await expect(dialog).toHaveAccessibleName(/^Entrada principal/);
  await expect(photo).toHaveAttribute("alt", /^Entrada principal/);
  await expect(dialog.getByText("2 / 14")).toBeVisible();

  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.getByText("14 / 14")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("galería: los botones y el swipe horizontal navegan", async ({ page }) => {
  const dialog = await openFirstPhoto(page);
  await dialog.getByRole("button", { name: "Foto siguiente" }).tap();
  await expect(dialog.getByText("2 / 14")).toBeVisible();

  // Arrastre horizontal de 150 px hacia la izquierda sobre la foto: siguiente.
  const box = (await dialog.locator("img").boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.8, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8 - 150, y + 10, { steps: 5 });
  await page.mouse.up();
  await expect(dialog.getByText("3 / 14")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
});
