# Refinamiento del modelo de Barbato's — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Llevar el modelo procedural de Barbato's a las medidas reales (salón 18×10, lote 60×38), corregir colores/materiales y detalles del edificio según las fotos, rehacer el parque (fogón con arena hexagonal, guirnalda hexagonal, vegetación) y sumar cortinas de galería animables con un botón en el overlay.

**Architecture:** Igual que el recorrido existente: medidas en `dimensions.ts` → derivados puros en `layout.ts` → un builder por elemento en `elements/` registrado en `ELEMENTS` → `createViewer()` mergea por material y renderiza on demand. Lo nuevo de motor: `mergeByMaterial` también junta los meshes `noShadow` entre sí y respeta `userData.noMerge`; un `CurtainRig` (`src/tour/engine/curtains.ts`) anima `scale.y` de los objetos de los elementos marcados `animates: "curtains"` con un loop de `requestAnimationFrame` **transitorio** (solo dura la animación, ~600 ms); el `TourController` expone `hasCurtains` y `setCurtainsOpen(open, animate)`. React no ve objetos three.

**Tech Stack:** Next.js 16.4.2 (App Router, Turbopack), React 19.3.0, TypeScript 5, Tailwind 4, three 0.186.1, Vitest 5 + Testing Library + jsdom, Playwright 1.64.1 (`mobile-chrome`, Pixel 7).

**Spec:** este plan argumenta desde los requisitos confirmados por el usuario el 2026-10-21 (copiados abajo en *Medidas y decisiones*) más el diseño previo `docs/superpowers/specs/2026-10-20-venue-3d-tour-design.md` y su plan `docs/superpowers/plans/2026-10-20-venue-3d-tour.md`. Fotos de referencia (no versionadas): `/tmp/claude-1000/-home-capua25-workspace-InteractiveCardWeb/a7854f66-cea7-42b0-8ac7-dab8b8e3d409/scratchpad/fotos-ext/small/` con índice por grupos en `../groups.md` (ese mismo directorio padre). Si el directorio ya no existe, seguir solo con los valores de este plan.

## Global Constraints

- Worktree: `/home/capua25/workspace/InteractiveCardWeb-worktrees/venue-model-refine`, rama `feat/venue-model-refine`. Trabajar SOLO ahí. Tiene su propio índice `.codegraph/` (no versionado: **nunca** hacer `git add` de `.codegraph/`; usar `git add <rutas>` explícitas). Usá CodeGraph MCP (`codegraph_explore`, `projectPath` = el worktree) primero; grep/Read solo como fallback (markdown/docs → Read directo).
- AGENTS.md: Next con breaking changes; antes de tocar APIs de Next leer `node_modules/next/dist/docs/`. `next dev` reescribe un bloque de AGENTS.md: si aparece en el diff, commitearlo con el trabajo.
- Commits convencionales, **sin** `Co-Authored-By` ni atribución a IA. Un commit por task. No push.
- Build: obligatorio `npm run build` en toda task que toque un archivo `'use client'` o bajo `src/app/` (Tasks 11 y 16). En el resto, no.
- Comandos: unit `npx vitest run <ruta>` / `npm test`; tipos `npx tsc --noEmit`; lint `npm run lint`; e2e `npm run test:e2e` (levanta build + start en :3100).
- Ningún archivo fuera de `src/tour/` importa `three`; React solo usa `@/tour/types` y `@/tour/registry`.
- Convención de ejes: metros, origen en el centro del salón; +z frente (pedregullo, pérgola), −z fondo (galería, parque, sol de atardecer), −x anexo, +x hastial de la chimenea.
- Render on demand: sin loop rAF permanente. Único rAF permitido: el de la animación de cortinas, que termina solo a los `CURTAIN_DURATION_MS = 600` ms.
- Convenciones de escena: piezas estáticas opacas con `P.box/P.cyl` (las junta `mergeByMaterial`: 1 draw call por material); piezas repetidas con geometría propia → `InstancedMesh`; emisivos/planos sin sombra → `userData.noShadow = true`; transparentes → `depthWrite: false`, sin sombra.
- Presupuesto: **< 150 draw calls** en la vista Afuera (e2e `la vista Afuera dibuja menos de 150 draw calls`; cuenta pasada principal + sombras). Línea base medida en `main` 52c0bbd: **69**. Estimado al final: ~105–115. No relajar el umbral; si se pasa, recortar en este orden inverso de prioridad: ACs/fotinia → borde de piedras → lavandas/formios → sauces/plantines → álamos → árboles de fondo → guirnalda → fogón.
- Copy nuevo (español rioplatense): `Bajar cortinas` / `Subir cortinas`.
- Calidad mobile: nada nuevo con sombra si es plano o emisivo; el nylon es un solo mesh transparente.

### Medidas y decisiones (fuente de verdad de los valores)

| Qué | Valor |
|---|---|
| Salón | 18 (x) × 10 (z), pared 3.5, cumbrera **6.4** (mantiene ~30° de pendiente; no confirmada), espesor 0.3 |
| Techo | `ROOF_COLOR = "#6b6e75"`; vuelo en hastiales 0.05, en aleros 0.25 |
| Revoque | base `#8a3a2b`, ruido `#a04a34` / `#6e2a20` |
| Piedra | basalto azulado: tono 200–215°, sat 6–10 %, base `#4c555b`, ~8 % piedras óxido `#8a5a3c` |
| Puerta | 2.3 × 2.7, doble hoja, 4 filas de vidrio por hoja, centro a 7.5 de la esquina frente-izquierda (x = −1.5) |
| Ventanas frente | 1.5 × 1.75, antepecho 1.05, grilla 3×3; 1 a la izquierda (centro a 3.5 de la esquina izq. → x = −5.5); 3 a la derecha con paso 2.6 y la última a 1.2 (borde) de la esquina der. → x = 1.85, 4.45, 7.05 |
| Zócalo | alto 0.6 |
| Chimenea | hogar interior queda (bloque 1.2 prof. × 2.8 ancho, alto **5.2** para quedar bajo el cielorraso); bloque exterior de piedra fuera del hastial +x: 0.5 prof. × 0.75·H (2.625) × 2.8, tapa plana; caño r 0.22, sombrero r 0.28, desde la tapa hasta 1.9 sobre la cumbrera (top 8.3) |
| ACs | 2 splits blancos 0.8×0.55×0.3 sobre losa 2.5×0.8×0.1, al pie del hastial +x |
| Ventanas hastial +x | ancho 1.4 a 3.2 del eje (z = ±3.2), alto/antepecho = frente |
| Anexo | ancho 6, alto 1.1·H = 3.85, al ras del zócalo del frente, techo plano con borde negro sin vuelo; frente: ventana 0.7×1.5, marco `#8a8f86`, vidrio esmerilado `#4d5a58`, 3 paños horizontales, antepecho 1.05; fondo: revoque gris `#82837b`, zócalo de piedra 0.2·alto, ventana horizontal de marco de madera 2.6×0.55 centrada a media altura, 2 apliques encima; cara del fondo coplanar con el borde exterior de la galería |
| Galería | prof. 5, postes cada 3 (6 tramos), alto de poste H−0.2 = 3.3, viga negra de 0.3, techo de chapa igual |
| Cortinas | por tramo: nylon translúcido + faldón de lona negra 0.9; arrancan **enrolladas** (abiertas) con el rollo visible arriba |
| Pérgola | columnas de 8 listones 0.05×0.1 a paso 0.09 (≈0.68 de ancho); techo: 2 vigas paralelas al frente + lamas en z cada 0.12; columnas a ±2.4 del eje de la puerta |
| Apliques | cubo negro ~0.1 + emisor cálido abajo. Reflectores opcionales: **no** se hacen (ver Preguntas) |
| Lote | 60 (z) × 38 (x), centrado en x = 0; muro del fondo a 32 del borde exterior de la galería; muro gris de bloques alto 1.6, base `#a39f97`, hiladas 0.2×0.4 |
| Pedregullo | `#9a948c`; borde de ~25 piedras sueltas 0.4–0.6 en curva del lado del anexo + fila de lavandas (`#4a5a2a`, flor `#746a8a`) |
| Fogón | aro de gaviones de piedra **⌀ 2.4** (outer), alto 0.55; canasto de hierro negro ~0.8 con leños; brasas emisivas sutiles; centro x = 0, z = borde galería − 22 |
| Arena | **hexágono** circunradio 3.5 (`CircleGeometry(3.5, 6)`), `#c2ab8d`, y = 0.02 |
| Guirnalda | 6 postes negros de **2.8** en los vértices del hexágono; 6 tramos entre vértices adyacentes; flecha 0.5 (punto más bajo ≥ 2.2); bombitas cada ~0.375 |
| Vegetación | plantines 2–4 junto al muro del fondo cada 6; cortina de ~22 álamos columnares 5–6 junto al muro −x con formios rojos al pie; 4 sauces + 1 conífera cerca del fogón; árboles de fondo 12–15 fuera de los muros (1 mesh); 1 fotinia roja `#8a2a22` ~4.5 en el lado +x. `crownLight #7f9a45`, `crownDark #26361f` |
| Pasto | base `#7a8a3e`, manchas secas, franjas de cortadora |
| Sol | misma dirección (oeste, detrás del fondo); posición y cámara de sombra recalculadas para el lote |

## Review Focus

1. Tocar Bajar/Subir cortinas varias veces seguidas a mitad de animación → la animación retoma desde la escala actual hacia el nuevo destino, un solo loop rAF vivo, y termina sin quedar corriendo. Test en Task 10 (`retarget a mitad de animación usa un solo loop y termina`).
2. Cerrar el visor mientras las cortinas animan → no se renderiza nada después de `dispose()` ni queda un rAF pendiente. Test en Task 10 (`dispose cancela la animación en curso`).
3. Reintentar tras un error (o reabrir) → el botón vuelve a `Bajar cortinas` sin presionar, igual que la escena recién montada (enrolladas). Test en Task 11 (`Reintentar vuelve las cortinas a enrolladas`).
4. Usuario con `prefers-reduced-motion` → las cortinas saltan al estado final sin rAF. Tests en Task 10 (`sin animate no usa requestAnimationFrame`) y Task 11 (`con reduced motion pide setCurtainsOpen sin animar`).
5. Achicar el salón deja cosas fuera de lugar → la cámara "Adentro" queda dentro del salón, y ningún árbol/poste/piedra cae dentro del edificio, de la arena o fuera del lote (salvo los de fondo, que van afuera). Tests en Task 4 (`la vista Adentro queda dentro del salón`) y Task 14 (`la vegetación respeta lote, edificio y arena`).

## Verificación visual (procedimiento común)

Script de capturas (lo crea la Task 3 en `scripts/tour-shots.mjs`, se commitea como tooling):

```js
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
```

Uso: `npm run dev -- -p 3200` (en background) y `node scripts/tour-shots.mjs http://localhost:3200/barbatos /tmp/claude-1000/-home-capua25-workspace-InteractiveCardWeb/a7854f66-cea7-42b0-8ac7-dab8b8e3d409/scratchpad/shots <tag>`; abrir los PNG con Read y compararlos con las fotos que cita la task. Reportar en el resumen de la task el `drawCalls` impreso (con dev puede diferir algo del build; el número que vale es el del e2e).

---

### Task 1: `mergeByMaterial` junta los `noShadow` y respeta `noMerge`

**Files:**
- Modify: `src/tour/engine/merge.ts`
- Test: `src/tour/engine/merge.test.ts`

**Interfaces:**
- Produces: `mergeByMaterial(group, skip?)` con dos reglas nuevas: (a) un nodo con `userData.noMerge === true` se saltea **con todo su subárbol** (igual que `skip`); (b) los meshes con `userData.noShadow` ya no quedan excluidos: se agrupan en baldes propios (clave = material + firma + `noShadow`), y el mesh mergeado conserva `userData.noShadow = true`. Siguen excluidos: instanciados, transparentes, `opacity < 1`, multi-material, morph, ocultos.

- [ ] **Step 1: tests que fallan** en `merge.test.ts`:
  - `junta los noShadow que comparten material en un mesh noShadow`: 3 cajas con el mismo material y `userData.noShadow = true` → queda 1 mesh hijo, `name === "merged"`, `userData.noShadow === true`.
  - `no mezcla noShadow con los que proyectan sombra`: 2 cajas `noShadow` + 2 normales con el mismo material → 2 meshes mergeados, uno con `noShadow` y otro sin.
  - `no toca el subárbol marcado noMerge`: grupo hijo con `userData.noMerge = true` que contiene 2 cajas del mismo material que otras 2 de afuera → las 2 de adentro siguen siendo hijas del grupo `noMerge` (mismo objeto, `parent` intacto); las de afuera se mergean.
- [ ] **Step 2:** `npx vitest run src/tour/engine/merge.test.ts` → FAIL en los 3 nuevos.
- [ ] **Step 3:** implementar en `merge.ts` (en `walk`: `if (node === skip || !node.visible || node.userData.noMerge) return;`; en `isMergeable` quitar la condición `noShadow`; clave del balde con sufijo `|ns` cuando `noShadow`; al crear el mesh mergeado copiar `userData.noShadow`). Actualizar el comentario de cabecera.
- [ ] **Step 4:** `npx vitest run src/tour/engine` → PASS (incluye viewer.test).
- [ ] **Step 5:** commit `perf(tour): merge noShadow meshes and honor noMerge subtrees`

### Task 2: primitivas — marcos configurables y UV de cilindros

**Files:**
- Modify: `src/tour/engine/primitives.ts`
- Test: `src/tour/engine/primitives.test.ts`

**Interfaces:**
- Produces:
  - `frame(axis, center, wallMid, y0, w, h, wallThickness, opts?: { door?: boolean; cols?: number; rows?: number; frameKey?: MaterialKey; glassKey?: MaterialKey })`. `frameKey` (default `"metal"`) aplica a jambas, dintel, alféizar, parantes y travesaños; `glassKey` (default `"glass"`) al paño. Con `door: true` y `rows` > 1: dibuja `rows − 1` travesaños horizontales a `y0 + k·h/rows` a todo el ancho (reemplazan al barral); sin `rows` la puerta queda como hoy (parante central + barral a 1.0).
  - `cyl(r, h, key, at, segments?)`: si `UNIT[key]` existe, escala la UV como `u · 2πr / UNIT`, `v · h / UNIT` (para que el fogón de piedra no estire la textura). Sin `UNIT` queda igual.
- [ ] **Step 1: tests que fallan**:
  - `frame usa frameKey y glassKey`: `frame("z", 0, 0, 0, 1, 1, 0.3, { frameKey: "wood", glassKey: "hearth" })` → ningún hijo usa `M("metal")`; existe un hijo con `M("hearth")`.
  - `una puerta con rows=4 tiene 3 travesaños y no barral`: contar hijos con alto 0.05 → 0; hijos de ancho `w` y alto 0.04 → 3, a y = h/4, h/2, 3h/4.
  - `cyl escala la UV de las claves con UNIT`: `cyl(1.2, 0.55, "stone", …)` → `max(uv.x) ≈ 2π·1.2/1.6`; `cyl(1, 1, "metal", …)` → `max(uv.x) ≈ 1`.
- [ ] **Step 2:** `npx vitest run src/tour/engine/primitives.test.ts` → FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** `npx vitest run src/tour` → PASS.
- [ ] **Step 5:** commit `feat(tour): configurable frame materials, door glazing rows and cylinder uv scale`

### Task 3: paleta — techo grafito, revoque óxido, basalto, materiales nuevos y script de capturas

**Files:**
- Modify: `src/tour/scenes/barbatos/dimensions.ts:8` (`ROOF_COLOR`)
- Modify: `src/tour/engine/materials.ts`, `src/tour/engine/textures.ts`
- Create: `scripts/tour-shots.mjs` (contenido en *Verificación visual*)
- Test: `src/tour/engine/materials.test.ts`

**Interfaces:**
- Produces: `MaterialKey` suma `"greyStucco" | "frameGray" | "frostedGlass" | "nylon" | "canvas" | "sand" | "crownLight" | "crownDark" | "photinia" | "phormium" | "lavender" | "lavenderFlower" | "acWhite"` (se conserva `"crown"` hasta la Task 14). Definiciones:
  - `greyStucco: { color: "#82837b", roughness: 0.95 }`, `frameGray: { color: "#8a8f86", roughness: 0.6, metalness: 0.3 }`, `frostedGlass: { color: "#4d5a58", roughness: 0.5 }` (opaco: barato), `acWhite: { color: "#e8e8e4", roughness: 0.6 }`
  - `nylon: { color: "#e9eef0", transparent: true, opacity: 0.35, side: DoubleSide, depthWrite: false, roughness: 0.6 }`, `canvas: { color: "#141414", roughness: 1, side: DoubleSide }`
  - `sand: { color: "#c2ab8d", roughness: 1 }`, `crownLight: { color: "#7f9a45", roughness: 1, flatShading: true }`, `crownDark: { color: "#26361f", roughness: 1, flatShading: true }`, `photinia: { color: "#8a2a22", roughness: 1, flatShading: true }`, `phormium: { color: "#7a2a2a", roughness: 0.9, flatShading: true }`, `lavender: { color: "#4a5a2a", roughness: 1, flatShading: true }`, `lavenderFlower: { color: "#746a8a", roughness: 1 }`
  - `UNIT.wallLow = 3.2` (16 hiladas de 0.2 por tile de 256 px).
- Texturas (`makeTextures`, mismas claves y semillas):
  - `plaster`: fondo `#8a3a2b`, `noise(…, ["#a04a34", "#6e2a20"], 0.12)`.
  - `stone`: junta `#2f3438`; piedras `hsl(200 + R·15, 6 + R·4 %, 28 + R·14 %)`; si `R() < 0.08` → `#8a5a3c`.
  - `gravel`: fondo `#9a948c`, granos `v = 110 + R·90`.
  - `wallLow`: fondo `#a39f97` + ruido suave; líneas de junta `#7f7b74` de 1 px: horizontales cada 16 px, verticales cada 32 px desfasadas 16 px en hiladas alternas.
  - `grass`: fondo `#7a8a3e`; 4 franjas de 64 px alternando `rgba(255,255,255,.05)` / `rgba(0,0,0,.05)`; ~40 manchas secas `#9a9a58` r≈18 px alpha 0.25; ruido fino actual con tonos `#8a9a4c`, `#5f6f30`.
- [ ] **Step 1: tests que fallan** en `materials.test.ts`: `nylon es transparente, de doble cara y no escribe profundidad` (`toMatchObject({ transparent: true, opacity: 0.35, side: DoubleSide, depthWrite: false })`); `los materiales nuevos tienen los colores de las fotos` (`crownLight` `7f9a45`, `crownDark` `26361f`, `sand` `c2ab8d`, `greyStucco` `82837b`, `frameGray` `8a8f86`, `frostedGlass` `4d5a58`, `photinia` `8a2a22`).
- [ ] **Step 2:** `npx vitest run src/tour/engine/materials.test.ts` → FAIL.
- [ ] **Step 3:** implementar materiales, texturas y `ROOF_COLOR = "#6b6e75"`; crear `scripts/tour-shots.mjs`.
- [ ] **Step 4:** `npx vitest run src/tour && npx tsc --noEmit` → PASS.
- [ ] **Step 5: visual**: capturas `t3`; techo gris grafito (~`#5a5d63` renderizado), paredes terracota óxido, zócalo gris azulado. Comparar con `IMG_20261020_182240420_HDR.jpg` (frente) e `IMG_20261020_182320577_HDR.jpg` (zócalo).
- [ ] **Step 6:** commit `feat(tour): graphite roof, rust plaster, basalt stone and new materials`

### Task 4: salón 18×10 y aberturas del edificio

**Files:**
- Modify: `src/tour/scenes/barbatos/dimensions.ts`, `src/tour/scenes/barbatos/layout.ts`, `src/tour/scenes/barbatos/views.ts`
- Modify: `src/tour/scenes/barbatos/elements/front-wall.ts` (solo si hace falta por `frontDoor.x`), `elements/pergola.ts` (solo posiciones: columnas desde `l.pergola.columnsX`, ya es así)
- Test: `src/tour/scenes/barbatos/layout.test.ts`, `src/tour/scenes/barbatos/views.test.ts` (nuevo)

**Interfaces:**
- Produces (cambios de `BarbatosDimensions`):
  - `hall: { length: 18, width: 10, wallHeight: 3.5, ridgeHeight: 6.4, wallThickness: 0.3 }`
  - `frontDoor: { width: 2.3, height: 2.7, fromLeft: 7.5, rows: 4 }` → `layout.frontDoor = { x: -hx + fromLeft, width, height, sill: 0, rows }` (`Opening` suma `rows?: number`).
  - `frontWindows: { width: 1.5, height: 1.75, sill: 1.05, centers: [{front-left 3.5}, {front-right 7.15}, {front-right 4.55}, {front-right 1.95}] }`
  - `frontSconces` igual, pero los de la puerta se calculan desde `frontDoor.x ± (width/2 + doorGap)` (hoy usa ±, centrado en 0).
  - `gableWindows: { width: 1.4, offsetFromAxis: 3.2 }`, `plinth.height: 0.6`, `trusses: { count: 5, spacing: 3.6 }`
  - `chimney.height: 5.2` (hogar interior; el exterior es la Task 6).
  - `annex: { width: 6, heightRatio: 1.1, setbackFromFront: 0 }` → `layout.annex.height = heightRatio · wallHeight`; `zFront = hz + plinth.overhang − setbackFromFront`.
  - `pergola.columnsFromAxis: 2.4` → `columnsX = [door.x − 2.4, door.x + 2.4]`.
  - `gallery: { depth: 5, roofOverhang: 0.35, postInset: 0.1, postSpacing: 3, postCount: 6, postHeight: 3.3, fasciaHeight: 0.3 }` (se elimina `roofDepth`; `layout.gallery` suma `fasciaHeight`).
  - `tables.rowsFromLeftWall: [2.5, 5.5, 8.5, 11.5, 14.5]`.
  - `park.wall.zStart` pasa a derivarse de `gallery.zRoofOuter` (el lote completo es la Task 5).
- Views: `out: { pos: [16, 9, 19], target: [-1.5, 2, -1] }`, `in: { pos: [-8.2, 1.75, 0], target: [-2, 1.5, 0] }`.
- [ ] **Step 1: tests que fallan** — reescribir el bloque `layout de Barbato's reproduce el v6` como `layout de Barbato's con medidas reales`:
  - `hall` → `{ hx: 9, hz: 5, ridgeHeight: 6.4 }`, `slope ≈ atan2(2.9, 5)`.
  - `frontDoor` → `{ x: -1.5, width: 2.3, height: 2.7, sill: 0, rows: 4 }`; `frontWindows.map(x)` → `[-5.5, ≈1.85, ≈4.45, ≈7.05]`; última ventana: `9 − (7.05 + 0.75) ≈ 1.2`.
  - `la puerta no pisa ninguna ventana del frente`: para toda ventana, `|w.x − door.x| ≥ (w.width + door.width)/2 + 0.5`.
  - `frontSconces` → `[{x:-3.25,y:2.9},{x:0.25,y:2.9},{x:-8.2,y:2.6},{x:≈3.15,y:2.6},{x:≈5.75,y:2.6}]`.
  - `backWindows` x ≈ `[-4.8667, 0, 4.8667]`, ancho ≈ 4.3667; `backSconcesX` ≈ `[-7.55, -2.4333, 2.4333, 7.55]`.
  - `gableWindows` z `[-3.2, 3.2]` con `height 1.75, sill 1.05`; `trussesX` `[-7.2, -3.6, 0, 3.6, 7.2]`; `chimney.x ≈ 8.1`, `hearthX ≈ 7.48`; `carpet ≈ { x0: -8.5, x1: 7.2 }`.
  - `annex` → `{ x: -12, width: 6, height: 3.85, zFront: 5.06, zBack: -10.35 }`; `pergola.columnsX` `[-3.9, 0.9]`; `gallery` `{ zInner: -5, zPosts: -10.1, zRoofOuter: -10.35, postHeight: 3.3, fasciaHeight: 0.3, postsX: [-6,-3,0,3,6,9] }`.
  - `tables.map(x)` → `[-6.5,-6.5,-3.5,-3.5,-0.5,-0.5,2.5,2.5,5.5,5.5]`, `z = ±2.4`.
  - `las mesas no tocan el hogar`: `max(t.x) + 1.36 < chimney.x − chimney.depth/2`.
  - Ajustar los tests de anclaje (`alargar L…`) a los valores nuevos (`7.15/4.55/1.95`, `3.2`), y el de `sin ventana a la izquierda` (apliques de puerta desde `door.x`).
  - Nuevo `views.test.ts`: `la vista Adentro queda dentro del salón` (`|in.pos.x| < hx − T`, `|in.pos.z| < hz − T`, `in.pos.y < wallHeight`) y `los targets caen dentro de targetBounds`.
- [ ] **Step 2:** `npx vitest run src/tour/scenes/barbatos` → FAIL.
- [ ] **Step 3:** implementar en `dimensions.ts`/`layout.ts`/`views.ts`; `pergola.ts` debe centrar su viga transversal y lamas en `(columnsX[0]+columnsX[1])/2` (hoy usa x = 0).
- [ ] **Step 4:** `npx vitest run src/tour && npx tsc --noEmit` → PASS (elements.test incluido; si `la galería sigue a postInset…` usa `roofDepth`, adaptar).
- [ ] **Step 5: visual** `t4`: puerta a la izquierda del centro entre las columnas de la pérgola, 1 ventana a la izquierda y 3 a la derecha (comparar `IMG_20261020_182240420_HDR.jpg`); "Adentro" se ve desde dentro del salón.
- [ ] **Step 6:** commit `feat(tour): resize barbatos hall to 18x10 with real openings`

### Task 5: lote 60×38, muro perimetral de bloques y suelo

**Files:**
- Modify: `dimensions.ts`, `layout.ts`, `elements/park.ts`, `elements/ground.ts`
- Test: `layout.test.ts`, `elements/elements.test.ts`

**Interfaces:**
- Consumes: `layout.gallery.zRoofOuter` (Task 4).
- Produces:
  - `dimensions.lot: { length: 60, width: 38, backWallFromGallery: 32, wallHeight: 1.6, wallThickness: 0.2, marginX: 4, marginBehindWall: 2, topAboveRidge: 1 }` (reemplaza `park.wallHeight/wallDistanceFromBack/wallHalfWidth` y el `lot` viejo).
  - `layout.lot: { zBack: number; zFront: number; halfWidth: number; centerZ: number; wallHeight: number; wallThickness: number }` con `zBack = zRoofOuter − 32 = -42.35`, `zFront = zBack + 60 = 17.65`, `halfWidth = 19`, `centerZ = -12.35`. Se elimina `layout.park.wall`.
  - `targetBounds = { min: [-23, 0, -44.35], max: [23, 7.4, 17.65] }`.
  - `park.ts`: muro del fondo (z = `zBack`) y dos laterales en x = ±19 de `zBack` a `zFront`, material `wallLow`, alto 1.6. **Sin muro del frente** (ver Preguntas). Árboles viejos sin cambios hasta Task 14.
  - `ground.ts`: plano de 160 centrado en `(0, lot.centerZ)`.
- [ ] **Step 1: tests que fallan**: en layout.test `lote de 60×38 anclado a la galería` (valores de arriba; `zFront − zBack === 60`; `zFront − hz ≈ 12.65`); en elements.test `park levanta muro de fondo y laterales de 1.6 sobre el lote` (3 meshes `wallLow`, alto 1.6; laterales con largo z = 60).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** `npx vitest run src/tour && npx tsc --noEmit` → PASS.
- [ ] **Step 5: visual** `t5` (`far`): muro gris de bloques con hiladas visibles; comparar `IMG_20261020_183709086_SR.jpg`.
- [ ] **Step 6:** commit `feat(tour): 60x38 lot with 1.6 m concrete block perimeter wall`

### Task 6: chimenea exterior, vuelo de hastiales y equipos de aire

**Files:**
- Modify: `dimensions.ts`, `layout.ts`, `elements/chimney.ts`, `elements/roof.ts`
- Create: `elements/ac-units.ts`; Modify: `elements/index.ts`
- Test: `layout.test.ts`, `elements/elements.test.ts`

**Interfaces:**
- Produces:
  - `dimensions.roof: { gableOverhang: 0.05, eaveOverhang: 0.25 }` → `roof.ts` usa ancho `2·hx + 2·gableOverhang` (hoy `+0.8`) y largo `slopeLen + 2·eaveOverhang`.
  - `dimensions.chimney` suma `stack: { depth: 0.5, width: 2.8, heightRatio: 0.75 }` y `flue: { radius: 0.22, capRadius: 0.28, aboveRidge: 1.9, offsetX: 0.03 }` (se quita `flue.base`).
  - `layout.chimney.stack: { x: hx + depth/2 = 9.25, width: 2.8, depth: 0.5, height: 2.625 }`; `layout.chimney.flue: { x: stack.x + offsetX = 9.28, base: 2.625, top: ridge + 1.9 = 8.3, radius: 0.22, capRadius: 0.28 }`.
  - `chimney.ts`: hogar interior como hoy (sin caño adentro, sin babeta en la cumbrera); bloque exterior `stone` en `(stack.x, h/2, 0)`; tapa plana `cement` 0.06 un poco más ancha (+0.06); caño `metal` de `base` a `top`; sombrero `metal` r `capRadius` h 0.08 en `top + 0.1`.
  - `dimensions.acUnits: { slab: { w: 0.8, d: 2.5, h: 0.1 }, unit: { w: 0.3, h: 0.55, d: 0.8 }, z: [-4.3, -2.9] }` → `layout.acUnits: { slab: {x,z,w,d,h}, units: {x,y,z}[] }` con la losa pegada al zócalo del hastial +x (`x = hx + plinth.overhang + 0.4`, z = −3.6) y 2 equipos encima. Elemento `ac-units` (cajas `cement` + `acWhite`, mergeables). Se registra después de `chimney`.
- [ ] **Step 1: tests que fallan**:
  - layout: `la chimenea exterior sale del hastial +x` → `stack.x − stack.depth/2 === hx`, `stack.height ≈ 2.625`, `flue.top ≈ 8.3`, `flue.x − flue.radius > hx + gableOverhang` (el caño no corta el vuelo del techo).
  - layout: `el hogar interior queda bajo el cielorraso` → en `z = width/2`, `chimney.height < wallHeight + (hz − width/2)·tan(slope) − 0.2`.
  - elements: reemplazar `el caño de la chimenea está en la x del bloque de piedra` por `el caño arranca sobre el bloque exterior`: meshes `metal` con `|x − flue.x| < 1e-6`, al menos 2; existe un mesh `stone` con `x ≈ stack.x`; ningún `metal` con `x < hx`.
  - elements: `ac-units arma 2 equipos sobre la losa`; actualizar la lista de ids en `registra los elementos…`.
  - roof: `los faldones vuelan 0.05 en los hastiales` (ancho de bbox de cada chapa ≈ `2·hx + 0.1`).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** `npx vitest run src/tour && npx tsc --noEmit` → PASS.
- [ ] **Step 5: visual** `t6`: bloque de piedra afuera del hastial derecho con el caño negro subiendo por fuera del alero, ventanas a ambos lados, ACs blancos abajo; comparar `IMG_20261020_182038538_HDR.jpg` e `IMG_20261020_183517865_HDR.jpg`.
- [ ] **Step 6:** commit `feat(tour): exterior chimney stack, tight gable overhang and ac units`

### Task 7: frente — puerta de 4 filas, apliques cubo y pérgola de listones

**Files:**
- Modify: `elements/front-wall.ts`, `elements/gallery.ts` (apliques del fondo), `elements/pergola.ts`
- Create: `elements/sconce.ts` (helper, no es elemento)
- Test: `elements/elements.test.ts`

**Interfaces:**
- Consumes: `frame(…, { door: true, rows })` (Task 2); `layout.frontDoor.rows` (Task 4).
- Produces: `sconce(P: Primitives, at: Vec3, facing: "+z" | "-z" | "+x" | "-x"): THREE.Group` — cuerpo `metal` 0.1×0.1×0.1 pegado a la pared + emisor `sconce` 0.08×0.02×0.08 debajo (`noShadow`). Lo usan frente, galería y anexo (Task 8).
- Pérgola: por columna 8 listones `metal` 0.05 (x) × alto × 0.1 (z), paso 0.09 centrados en la columna; 2 vigas `metal` 0.12×0.2 paralelas al frente (x) de largo `span + 0.8`, una en `z = hz + 0.15` y otra en `z = pergola.z`, a `y = height + 0.1`; lamas `metal` 0.03×0.1 orientadas en z, de `hz + 0.1` a `pergola.z + 0.1`, cada 0.12 a lo ancho de las vigas, a `y = height + 0.25`.
- [ ] **Step 1: tests que fallan**: `la pérgola tiene 8 listones por columna a paso 0.09` (16 meshes de 0.05×h×0.1; dentro de cada columna `Δx ≈ 0.09`); `las lamas de la pérgola corren en z` (todas con bbox `z > x`, separación 0.12); `los apliques del frente son cubos negros con emisor` (por cada `frontSconces`: un mesh `metal` 0.1³ y uno `sconce` con `userData.noShadow`).
- [ ] **Step 2:** FAIL. **Step 3:** implementar (front-wall: `P.frame(…, { door: true, rows: d.rows })`). **Step 4:** PASS + `npx tsc --noEmit`.
- [ ] **Step 5: visual** `t7`: comparar `IMG_20261020_182258651_HDR.jpg` y `IMG_20261020_182316359_HDR.jpg` (listones y lamas).
- [ ] **Step 6:** commit `feat(tour): slatted pergola, four-row glazed door and cube sconces`

### Task 8: anexo — más alto, techo plano con borde y caras del frente y del fondo

**Files:**
- Modify: `elements/annex.ts`, `elements/annex-roof.ts`, `layout.ts` (solo derivados del anexo), `dimensions.ts`
- Test: `layout.test.ts`, `elements/elements.test.ts`

**Interfaces:**
- Consumes: `sconce()` (Task 7), `frame` con `frameKey/glassKey` (Task 2).
- Produces:
  - `dimensions.annex` suma `frontWindow: { width: 0.7, height: 1.5 }`, `rearWindow: { width: 2.6, height: 0.55 }`, `rearPlinthRatio: 0.2`.
  - `layout.annex` suma `frontWindow: { x, width, height, sill }` (x = centro del anexo, `sill = frontWindows.sill`), `rearWindow: { x, width, height, sill }` (`sill = height/2 − 0.275`), `rearSconces: { x, y }[]` (x = centro ± 0.9, y = tope de la ventana + 0.4).
  - `annex.ts`: caja `stone`; frente: `P.frame("z", …, wallThickness 0.06, { cols: 1, rows: 3, frameKey: "frameGray", glassKey: "frostedGlass" })` apenas fuera de `zFront` (se quita el rectángulo `hearth`); fondo: placa `greyStucco` 0.02 sobre la cara `zBack` (alto total), banda `stone` de `0.2·alto`, ventana `frame(… { cols: 1, rows: 1, frameKey: "wood", glassKey: "hearth" })`, 2 `sconce(…, "-z")`.
  - `annex-roof.ts` (sigue en `group: "roof"`): losa `roof` 0.12 sin vuelo a `y = height`, borde `metal` de 0.08 de alto × 0.04 de ancho en los 4 lados.
- [ ] **Step 1: tests que fallan**: layout `ventanas del anexo` (valores derivados de arriba); elements `el anexo no tiene rectángulo hearth en el frente` (ningún mesh `hearth` con `z > zFront − 0.1`), `el fondo del anexo es revoque gris` (existe mesh `greyStucco` con `z ≈ zBack`), `el techo del anexo no vuela` (bbox x/z de la losa == ancho/profundidad del anexo ± 1e-6).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS + `npx tsc --noEmit`.
- [ ] **Step 5: visual** `t8`: comparar frente `IMG_20261020_182240420_HDR.jpg` (ventana angosta gris) y fondo `IMG_20261020_183931512_HDR.jpg` (revoque gris, ventana horizontal).
- [ ] **Step 6:** commit `feat(tour): taller annex with flat trimmed roof, frosted front window and stucco rear`

### Task 9: galería — viga gruesa, rollos y cortinas (estáticas, enrolladas)

**Files:**
- Modify: `layout.ts`, `dimensions.ts`, `elements/gallery.ts`
- Create: `elements/gallery-curtains.ts`; Modify: `elements/index.ts`
- Test: `layout.test.ts`, `elements/elements.test.ts`

**Interfaces:**
- Produces:
  - `dimensions.gallery` suma `curtains: { skirtHeight: 0.9, rollRadius: 0.08, offset: 0.08 }`.
  - `layout.gallery.curtains: { bays: Segment[]; z: number; topY: number; skirtHeight: number; rollRadius: number }`; `bays` = tramos entre `-hx` y cada poste consecutivo (`[-9,-6]…[6,9]`, 6 tramos), `z = zPosts − offset`, `topY = postHeight − fasciaHeight`.
  - `gallery.ts`: viga `metal` de 0.3 de alto × 0.16 en `y = postHeight − 0.15`; un rollo `canvas` (cilindro r `rollRadius`, eje x, largo del tramo) por tramo en `(mid, topY − rollRadius, z)` — estáticos, se mergean.
  - `gallery-curtains.ts` exporta `galleryCurtains: SceneElement<BarbatosLayout>` con `animates: "curtains"` (campo nuevo, Task 10 lo define en `types.ts`; en esta task agregarlo ya a `SceneElement` como `animates?: "curtains"` sin uso en el motor) y `CURTAIN_ROLLED_SCALE` importado de `@/tour/engine/curtains` (en esta task crear ese archivo con solo `export const CURTAIN_ROLLED_SCALE = 0.04; export const CURTAIN_DURATION_MS = 600;`). Devuelve un `Group` en `(0, topY − rollRadius, 0)` con `userData.noMerge = true` y `scale.y = CURTAIN_ROLLED_SCALE`, que contiene: 1 mesh `nylon` con **una sola geometría** (todos los tramos juntados con `mergeGeometries` de `PlaneGeometry` de ancho = tramo − 0.04, alto = `topY − rollRadius − skirtHeight`, trasladada para que su borde superior quede en y = 0) y 1 mesh `canvas` (faldones, alto `skirtHeight`, debajo del nylon hasta y = −(topY − rollRadius)); ambos `userData.noShadow = true`.
- [ ] **Step 1: tests que fallan**: layout `6 tramos de cortina cubren la galería sin huecos` (`bays[0].x0 === -hx`, `bays.at(-1).x1 === hx`, contiguos); elements `las cortinas son 2 meshes (nylon y lona) y arrancan enrolladas` (exactamente 1 mesh `nylon` y 1 `canvas` dentro del grupo; `group.scale.y === CURTAIN_ROLLED_SCALE`; `userData.noMerge === true`; bbox del nylon con top en y = 0 y ancho total ≈ 18 − 6·0.04); `la viga de la galería tiene 0.3 de alto`.
- [ ] **Step 2:** FAIL. **Step 3:** implementar; registrar `gallery-curtains` después de `gallery-roof`. **Step 4:** PASS + `npx tsc --noEmit`.
- [ ] **Step 5: visual** `t9`: rollos negros arriba de cada tramo, galería abierta; comparar `IMG_20261020_182535283_HDR.jpg` y `IMG_20261020_181816375_HDR.jpg`.
- [ ] **Step 6:** commit `feat(tour): thick gallery fascia with rolled-up nylon and canvas curtains`

### Task 10: motor — `CurtainRig` y API `setCurtainsOpen`

**Files:**
- Modify: `src/tour/engine/curtains.ts`, `src/tour/types.ts`, `src/tour/engine/assemble.ts`, `src/tour/engine/viewer.ts`
- Test: `src/tour/engine/curtains.test.ts` (nuevo), `assemble.test.ts`, `viewer.test.ts`

**Interfaces:**
- Consumes: `galleryCurtains` con `animates: "curtains"` (Task 9).
- Produces:
  - `types.ts`: `SceneElement.animates?: "curtains"` (ya agregado en la Task 9; acá lo usa el motor); `TourScene.build` devuelve `{ root: Group; roofGroup: Group; curtains: Object3D[] }`; `TourController` suma `readonly hasCurtains: boolean` y `setCurtainsOpen(open: boolean, animate: boolean): void`.
  - `assembleElements` junta en `curtains` los objetos construidos por elementos con `animates === "curtains"` y les pone `userData.noMerge = true`.
  - `curtains.ts`:
    ```ts
    export type FrameScheduler = { request(cb: () => void): number; cancel(id: number): void; now(): number };
    export type CurtainRig = { readonly available: boolean; set(open: boolean, animate: boolean): void; dispose(): void };
    export function createCurtainRig(targets: THREE.Object3D[], render: () => void, frames: FrameScheduler): CurtainRig;
    ```
    Estado inicial = abiertas (`scale.y = CURTAIN_ROLLED_SCALE`). `set(open, false)` (o mismo destino) → cancela animación, fija `scale.y` destino (`open ? CURTAIN_ROLLED_SCALE : 1`), `render()` una vez. `set(open, true)` → anima desde la escala actual al destino en `CURTAIN_DURATION_MS` con easeInOutCubic, `render()` por frame, un solo rAF vivo; al llegar fija el destino exacto y no pide más frames. `dispose()` cancela el frame pendiente y bloquea renders posteriores. Con `targets` vacío: `available = false`, `set` no hace nada.
  - `viewer.ts`: `ViewerDeps` suma `frames: FrameScheduler` (default `requestAnimationFrame`/`cancelAnimationFrame`/`performance.now`); crea el rig después de `mergeByMaterial`; el controller devuelve `hasCurtains: rig.available` y `setCurtainsOpen: (o, a) => rig.set(o, a)`; `dispose()` llama `rig.dispose()` antes de liberar la escena; también en `undo`.
  - `scenes/barbatos/index.ts`: sin cambios más allá de los tipos (pasa `curtains` de `assembleElements`).
- [ ] **Step 1: tests que fallan** (`curtains.test.ts` con un `FrameScheduler` falso que guarda callbacks y un reloj manual):
  - `arranca abierta con la escala enrollada`.
  - `sin animate no usa requestAnimationFrame` (`frames.request` no llamado; `scale.y === 1`; `render` 1 vez).
  - `animate interpola en 600 ms y deja de pedir frames` (en t=300 escala ∈ (0.04, 1); en t=600 escala 1 y no quedan callbacks pendientes).
  - `retarget a mitad de animación usa un solo loop y termina` (cerrar, a t=300 abrir: nunca hay más de 1 callback pendiente; termina en 0.04).
  - `dispose cancela la animación en curso` (`cancel` llamado; avanzar el reloj no llama `render`).
  - `sin objetos no está disponible`.
  - `assemble.test`: `junta los objetos animates curtains y los marca noMerge`.
  - `viewer.test`: `hasCurtains refleja los objetos de la escena`, `setCurtainsOpen(false,false) baja las cortinas y renderiza una vez`, `las cortinas siguen en su grupo después del merge` (el objeto de `curtains` conserva sus 2 hijos tras montar). Actualizar el fake de `scene.build` para devolver `curtains`.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** `npx vitest run src/tour && npx tsc --noEmit` → PASS (los mocks de `TourController` en `src/components/venue-tour/*.test.tsx` deben sumar `hasCurtains: true, setCurtainsOpen: vi.fn()` para que tipen).
- [ ] **Step 5:** commit `feat(tour): curtain rig with transient animation and controller api`

### Task 11: botón "Bajar cortinas" en el overlay

**Files:**
- Modify: `src/components/venue-tour/TourOverlay.tsx`
- Test: `src/components/venue-tour/TourOverlay.test.tsx`, `src/components/venue-tour/TourLauncher.test.tsx` (mock), `e2e/tour.spec.ts`

**Interfaces:**
- Consumes: `TourController.hasCurtains`, `setCurtainsOpen(open, animate)` (Task 10); `useShouldAnimate()` de `@/lib/use-should-animate`.
- Produces: estado `curtainsOpen` (default `true`) y `hasCurtains` (se fija al montar con `controller.hasCurtains`). Botón entre "Sin techo" y "Cerrar", solo con `status === "ready" && hasCurtains`: `aria-pressed={!curtainsOpen}`, clase `toggleClass(!curtainsOpen)`, texto `curtainsOpen ? "Bajar cortinas" : "Subir cortinas"` (mismo patrón que el techo). Click → `controllerRef.current?.setCurtainsOpen(next, shouldAnimate)`. `retry` vuelve `curtainsOpen` a `true`.
- [ ] **Step 1: tests que fallan** (Vitest):
  - Actualizar `los botones siguen el orden…` → `["Afuera", "Adentro", "Sin techo", "Bajar cortinas", "Cerrar"]`.
  - `Bajar cortinas alterna setCurtainsOpen, aria-pressed y el texto` (click → `setCurtainsOpen(false, expect.any(Boolean))`, botón `Subir cortinas` con `aria-pressed="true"`; click → `(true, …)`).
  - `con reduced motion pide setCurtainsOpen sin animar` (mock de `matchMedia` reduce → segundo argumento `false`).
  - `sin cortinas en la escena no muestra el botón` (`hasCurtains: false`).
  - `Reintentar vuelve las cortinas a enrolladas` (bajar, forzar `onContextLost`, Reintentar → botón `Bajar cortinas` con `aria-pressed="false"`).
  - e2e en `tour.spec.ts`: en `el visor abre con canvas…` y en el bloque reduced-motion, tocar `Bajar cortinas` → `Subir cortinas` con `aria-pressed="true"`, tocar de nuevo → `Bajar cortinas`.
- [ ] **Step 2:** `npx vitest run src/components/venue-tour` → FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** `npx vitest run && npx tsc --noEmit && npm run lint` → PASS.
- [ ] **Step 5:** `npm run build` → éxito (componente `'use client'`). Luego `npm run test:e2e -- e2e/tour.spec.ts` → PASS.
- [ ] **Step 6: visual** `t11` + a mano: `Bajar cortinas` anima ~0.6 s; nylon translúcido con faldón negro (comparar `IMG_20261020_182535283_HDR.jpg`).
- [ ] **Step 7:** commit `feat(tour): curtain toggle in the tour overlay`

### Task 12: fogón sobre arena hexagonal

**Files:**
- Modify: `dimensions.ts`, `layout.ts`
- Create: `elements/fire-pit.ts`; Modify: `elements/index.ts`
- Test: `layout.test.ts`, `elements/elements.test.ts`

**Interfaces:**
- Consumes: `layout.gallery.zRoofOuter`; `cyl` con UV escalada (Task 2).
- Produces:
  - `dimensions.firePit: { fromGallery: 22, ringDiameter: 2.4, ringHeight: 0.55, basketDiameter: 0.8, sandRadius: 3.5 }`.
  - `layout.firePit: { x: 0, z: -32.35, ringRadius: 1.2, ringHeight: 0.55, basketRadius: 0.4, sandRadius: 3.5, sandVertices: { x: number; z: number }[] }`.
  - `export function hexagonVertices(cx: number, cz: number, r: number): { x: number; z: number }[]` en `layout.ts`: `θk = k·π/3` (k = 0..5), `x = cx + r·cos θ`, `z = cz − r·sin θ` (coincide con `CircleGeometry(r, 6)` rotada `−π/2` en x).
  - `fire-pit.ts`: arena `CircleGeometry(3.5, 6)` `sand`, `rotation.x = −π/2`, y = 0.02, `noShadow`; aro `P.cyl(1.2, 0.55, "stone", …, 20)`; disco interior `hearth` r 0.95 a y = 0.555 (`noShadow`); canasto `metal` (cilindro abierto r 0.4, h 0.35, 8 segmentos, sobre el disco); 4 leños `wood` (r 0.06, largo 0.7, cruzados); brasas `fire` 0.3×0.05×0.3 `noShadow` dentro del canasto.
- [ ] **Step 1: tests que fallan**: `hexagonVertices da 6 vértices a radio r con lados iguales a r` (distancias al centro y entre adyacentes ≈ 3.5; primer vértice `(cx + 3.5, cz)`); layout `el fogón está a 22 del borde de la galería y a 10 del muro del fondo` (`z ≈ -32.35`, `z − lot.zBack ≈ 10`); elements `fire-pit: aro de piedra de ⌀2.4 y arena hexagonal sin sombra` (bbox del cilindro `stone` ancho ≈ 2.4; mesh `sand` con 6 segmentos y `noShadow`); actualizar la lista de ids (`fire-pit` después de `park`).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS + `npx tsc --noEmit`.
- [ ] **Step 5: visual** `t12` (`far`): comparar `IMG_20261020_182837379_HDR.jpg` y `IMG_20261020_183754846_SR.jpg`.
- [ ] **Step 6:** commit `feat(tour): stone fire pit on hexagonal sand pad`

### Task 13: guirnalda hexagonal

**Files:**
- Modify: `dimensions.ts`, `layout.ts`, `elements/garland.ts`
- Test: `layout.test.ts`, `elements/elements.test.ts`

**Interfaces:**
- Consumes: `hexagonVertices`, `layout.firePit` (Task 12).
- Produces:
  - `dimensions.garland: { poleHeight: 2.8, hangBelowTop: 0.05, sag: 0.5, bulbSpacing: 0.375 }` (se quitan `park.garlandFromBack/garlandPolesX`).
  - `layout.park.garland: { poles: { x: number; z: number }[]; poleHeight: number; hangY: number; sag: number; bulbSpacing: number }` con `poles = firePit.sandVertices`, `hangY = 2.75`.
  - `garland.ts`: exporta `catenary(a, b, steps, sag, out)` (existe; ahora exportada y sin incluir el punto final: `i < steps`); 6 postes `P.cyl(0.05, 2.8, "metal", …, 6)`; 6 tramos entre vértices adyacentes (cerrando el hexágono) con `steps = round(dist / bulbSpacing)`; cable: `TubeGeometry` r 0.01 sobre los mismos puntos, material `metal` (mergeable); bombitas `InstancedMesh` como hoy. **Sin** tramos hacia la galería.
- [ ] **Step 1: tests que fallan**: layout `los postes de la guirnalda son los vértices de la arena`; elements `guirnalda: 6 postes de 2.8, 54 bombitas y nada hacia la galería` (InstancedMesh `bulb` con `count === 54`; todas las bombitas a distancia ≤ 3.5 + 1e-6 del centro del fogón; `min(y) ≥ 2.2`); `cada tramo une vértices adyacentes` (las bombitas de índice `k·9` coinciden con los postes en x/z).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS + `npx tsc --noEmit`.
- [ ] **Step 5: visual** `t13` (`far`): comparar `IMG_20261020_182520706_HDR.jpg` y `IMG_20261020_183645339_HDR.jpg`.
- [ ] **Step 6:** commit `feat(tour): hexagonal string-light garland around the fire pit`

### Task 14: vegetación del parque

**Files:**
- Modify: `dimensions.ts`, `layout.ts`, `elements/park.ts` (quita árboles), `src/tour/engine/materials.ts` (quita `"crown"`)
- Create: `elements/vegetation.ts`; Modify: `elements/index.ts`
- Test: `layout.test.ts`, `elements/elements.test.ts`

**Interfaces:**
- Consumes: `layout.lot` (Task 5), `layout.firePit` (Task 12), `rng` de `@/tour/engine/textures`.
- Produces (`dimensions.vegetation` → `layout.vegetation`, todas posiciones absolutas en el layout):
  - `saplings: { x, z, height }[]`: x = −15, −9, −3, 3, 9, 15; z = `lot.zBack + 1.5`; alturas `[2.5, 3.5, 2, 4, 3, 2.8]`.
  - `poplars: { x, z, height }[]`: 22, x = `−halfWidth + 1.2`, z repartidas parejo de −14 a `lot.zBack + 1`, alturas `5 + (i % 3)·0.5`.
  - `phormiums: { x, z }[]`: 8, x = `−halfWidth + 2.2`, z repartidas de −16 a `lot.zBack + 3`.
  - `willows: { x, z, height: 6 }[]`: `(−8, −29)`, `(7, −36)`, `(−5, −39)`, `(9, −28)`; `conifer: { x: 4, z: -40.5, height: 7 }`.
  - `photinia: { x: 16.5, z: -16, height: 4.5 }`.
  - `background: { seed: 21, count: 18, minHeight: 12, maxHeight: 15 }` (posiciones en el builder con `rng(seed)`: 10 detrás del muro del fondo con `z ∈ [zBack − 10, zBack − 4]`, `x ∈ [−26, 26]`; 4 por lado con `|x| ∈ [halfWidth + 4, halfWidth + 9]`, `z ∈ [zBack, zFront]`).
  - `vegetation.ts`: troncos de plantines, sauces, conífera y fotinia en **un** `InstancedMesh` `trunk`; copas: plantines `IcosahedronGeometry` `crownLight` instanciado; álamos + conífera `ConeGeometry(1, 1, 7)` `crownDark` instanciado (escala por instancia: radio 0.9 / 1.8, alto = height); sauces = copa esfera aplastada + falda `CylinderGeometry(1.2, 2.2, 1, 8, 1, true)` `crownLight`, 2 instanciados; formios `ConeGeometry(0.4, 1, 5)` `phormium` instanciado; fotinia: 1 mesh `photinia` (icosaedro); fondo: copas icosaedro escaladas juntadas con `mergeGeometries` en **un** mesh `crownDark` (sin troncos), `castShadow` permitido, `receiveShadow` irrelevante.
- [ ] **Step 1: tests que fallan**: `la vegetación respeta lote, edificio y arena` (todo árbol de `saplings/poplars/phormiums/willows/conifer/photinia` cumple `|x| < halfWidth`, `zBack < z < zFront`, fuera del rectángulo del edificio `x ∈ [−15, 9.5]`, `z ∈ [−10.35, 5.06]` y a > `sandRadius + 1` del centro del fogón); elements `vegetation usa a lo sumo 9 draw calls` (contar meshes + instanced ≤ 9) y `los árboles de fondo quedan fuera del lote` (bbox del mesh de fondo: ningún vértice con `|x| < halfWidth` **y** `z > zBack` a la vez — verificar con los centros generados, exportando `backgroundTrees(layout)` puro); actualizar la lista de ids (`vegetation` después de `park`).
- [ ] **Step 2:** FAIL. **Step 3:** implementar; quitar árboles de `park.ts` y `trees` de dimensions/layout; quitar `"crown"`.
- [ ] **Step 4:** PASS + `npx tsc --noEmit`.
- [ ] **Step 5: visual** `t14` (`far`): comparar `IMG_20261020_182453348_HDR.jpg`, `IMG_20261020_183709086_SR.jpg`, `IMG_20261020_185148896_HDR.jpg` (fotinia), `IMG_20261020_182837379_HDR.jpg` (sauce).
- [ ] **Step 6:** commit `feat(tour): park vegetation with poplars, willows, saplings and background trees`

### Task 15: pedregullo — borde de piedras y lavandas

**Files:**
- Modify: `dimensions.ts`, `layout.ts`
- Create: `elements/forecourt.ts`; Modify: `elements/index.ts`
- Test: `layout.test.ts`, `elements/elements.test.ts`

**Interfaces:**
- Produces:
  - `dimensions.forecourt: { stones: 25, stoneSize: [0.4, 0.6], lavenderEvery: 2, lavenderOffset: 0.9 }`; patio sin cambios de tamaño (30×10, xOffset −2).
  - `layout.forecourt: { border: { x, z, size }[]; lavender: { x, z }[] }`: piedras en una Bézier cuadrática `P0 = (patioX0, hz + 0.5)`, `P1 = (patioX0 − 1.5, hz + patio.depth/2)`, `P2 = (patioX0 + 2, hz + patio.depth − 0.5)` con `patioX0 = patio.x − patio.width/2 = −17`, t equiespaciado, tamaño `0.4 + 0.2·rng`; lavandas en cada 2ª piedra, corridas 0.9 hacia −x.
  - `forecourt.ts`: piedras `IcosahedronGeometry(0.5, 0)` aplastadas en y (0.6) `stone` instanciadas; lavanda = mata `SphereGeometry(0.35, 6, 4)` `lavender` + flor `SphereGeometry(0.2, 5, 3)` `lavenderFlower` a +0.3, 2 instanciados.
- [ ] **Step 1: tests que fallan**: layout `25 piedras de borde en el lado del anexo dentro del lote` (todas con `x < patioX0 + 2.1`, `x > −halfWidth`, `z ∈ [hz, lot.zFront]`, tamaños ∈ [0.4, 0.6]); elements `forecourt: 3 InstancedMesh y ningún mesh suelto`; actualizar ids (`forecourt` después de `patio`).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS + `npx tsc --noEmit`.
- [ ] **Step 5: visual** `t15`: comparar `IMG_20261020_182151259_HDR.jpg` y `IMG_20261020_182038538_HDR.jpg`.
- [ ] **Step 6:** commit `feat(tour): stone border and lavender along the gravel forecourt`

### Task 16: sol, niebla, vistas y verificación final

**Files:**
- Modify: `src/tour/scenes/barbatos/lights.ts`, `src/tour/scenes/barbatos/index.ts` (fog), `src/tour/scenes/barbatos/views.ts` (solo si la captura lo pide)
- Test: `src/tour/scenes/barbatos/lights.test.ts`, `e2e/tour.spec.ts` (sin cambio de umbral)

**Interfaces:**
- Consumes: `layout.lot.centerZ` (Task 5).
- Produces: sol con la misma dirección que hoy (`(6, 10, −44)` desde el target): `target = (0, 0, lot.centerZ)`, `position = target + 1.3·(6, 10, −44)` = `(7.8, 13, −69.55)`; cámara de sombra `{ left: -26, right: 26, top: 20, bottom: -16, near: 5, far: 140 }`. `fog: { near: 70, far: 190 }`. Nota: el requisito citaba `lights.ts:281`; el sol vive en `lights.ts:12-19` (el archivo tiene 29 líneas).
- [ ] **Step 1: tests que fallan**: en `lights.test.ts` cambiar posición/target esperados (`toBeCloseTo` por componente) y sumar `la dirección del sol no cambió` (normalizada de `position − target` ≈ normalizada de `(6, 10, −44)`) y `la cámara de sombra cubre el lote` (`right − left ≥ 2·halfWidth + 8`).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** `npx vitest run` → PASS.
- [ ] **Step 5: visual** `t16` (out, far, in, noroof): sombras largas de atardecer sobre el pasto sin cortes en el fogón ni en el muro del fondo; si la vista `out` corta el edificio o el `far` no llega al fogón, ajustar `views.ts` manteniendo `views.test.ts` verde.
- [ ] **Step 6: verificación completa**: `npm run lint && npx tsc --noEmit && npm test && npm run build && npm run test:e2e` → todo PASS. Anotar el `draw-calls` del e2e (`npx playwright test e2e/tour.spec.ts -g "draw calls" --reporter=json | grep -A2 '"draw-calls"'`); debe ser < 150. Si no, recortar según el orden de *Global Constraints* y repetir.
- [ ] **Step 7:** commit `feat(tour): sunset light, fog and views for the 60 m lot`

---

## Preguntas abiertas / conflictos detectados

1. **Puerta no centrada (resuelto en el plan):** con 3 ventanas a la derecha a paso 2.6 y la última a 1.2 de la esquina, una puerta de 2.3 centrada en x = 0 pisa la primera ventana (1.1–2.6). Se pone la puerta a 7.5 de la esquina izquierda (x = −1.5), lo que coincide con `IMG_20261020_182240420_HDR.jpg`. "1.2 de la esquina" se interpreta como distancia al **borde** de la ventana.
2. **Cumbrera no medida:** 6.4 mantiene la pendiente actual (~30°). Obliga a bajar el hogar interior a 5.2.
3. **Posición del lote en x:** se centra en el eje del salón (x = ±19). Con eso el anexo queda a 4 m del muro −x; los álamos solo van en la zona del parque (z < −14), así que no chocan. Confirmar si el lote está corrido.
4. **Muro del frente del lote:** no hay evidencia en las fotos; se modelan solo el fondo y los laterales (60 m). Confirmar si hay muro/portón al frente.
5. **"Borde exterior de la galería"** = borde del techo (`zRoofOuter = −10.35`), igual que hoy para el anexo.
6. **Reflectores opcionales** a H−0.3 cada 3.5: no se hacen (sin ubicación clara en el requisito). Se pueden sumar en la Task 7 si se confirma la pared.
7. **Etiqueta del botón de cortinas:** se sigue el patrón del techo (texto que cambia + `aria-pressed`) por consistencia. Alternativa más estricta en accesibilidad: etiqueta fija "Bajar cortinas" con `aria-pressed`, y lo mismo para el techo en otro cambio.
8. **`lights.ts:281`** del requisito no existe; el sol está en `lights.ts:12-19`.
9. **Presupuesto:** línea base 69 draw calls; el estimado final (~105–115) entra en < 150 sin tocar el umbral. La Task 1 recupera llamadas al juntar los emisores `noShadow`.
