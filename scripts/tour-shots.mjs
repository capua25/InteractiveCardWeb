// node scripts/tour-shots.mjs [url] [outDir] [tag]
import { chromium } from "@playwright/test";
const [url = "http://localhost:3200/barbatos", out = ".", tag = "shot"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(url);
await page.getByRole("button", { name: /Abrir la invitación/ }).click();
await page.getByRole("button", { name: "Recorrer el salón" }).click();
const dialog = page.getByRole("dialog");
await dialog.locator("canvas").waitFor();
await page.waitForTimeout(1500);
const shot = async (name) => { await page.waitForTimeout(400); await page.screenshot({ path: `${out}/${tag}-${name}.png` }); };
await shot("out");
await page.mouse.move(640, 400);
await page.mouse.wheel(0, 2500); // alejarse para ver el parque
await shot("far");
await dialog.getByRole("button", { name: "Adentro" }).click();
await shot("in");
await dialog.getByRole("button", { name: "Afuera" }).click();
await dialog.getByRole("button", { name: "Sin techo" }).click();
await shot("noroof");
console.log("drawCalls", await dialog.locator("canvas").getAttribute("data-draw-calls"));
await browser.close();
