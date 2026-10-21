// Genera las versiones web de las fotos de Barbato's (hero, galería y OG).
// Los originales viven en docs/ y no se sirven. Uso: node scripts/optimize-barbatos-photos.mjs
// sharp llega como dependencia de next; no se declara aparte.
import { mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const SRC = "docs/superpowers/specs/assets/barbatos-photos";
const OUT = "public/venues/barbatos";
mkdirSync(OUT, { recursive: true });

const jpg = (file, width) =>
  sharp(join(SRC, file)).rotate().resize({ width, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true });

const jobs = [
  ["hero.jpg", jpg("01-fachada-frente-atardecer.jpg", 1920)],
  ["gallery-1.jpg", jpg("03-interior-mesas-redondas.png", 1600)],
  ["gallery-2.jpg", jpg("04-interior-hacia-hogar.png", 1600)],
  ["gallery-3.jpg", jpg("06-interior-panoramica.png", 1600)],
  ["gallery-4.jpg", jpg("05-galeria-trasera-parque.png", 1600)],
  ["gallery-5.jpg", jpg("02-fachada-frente-noche.png", 1600)],
  [
    "og.png",
    sharp(join(SRC, "01-fachada-frente-atardecer.jpg"))
      .rotate()
      .resize(1200, 630, { fit: "cover", position: "attention" })
      .png({ palette: true }),
  ],
];

for (const [name, pipeline] of jobs) {
  const out = join(OUT, name);
  await pipeline.toFile(out);
  console.log(`${out} ${(statSync(out).size / 1024).toFixed(0)} KB`);
}
