# Recorrido 3D del salón Barbato's — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sumar a la tarjeta un visor 3D a pantalla completa del salón Barbato's (salón + parque, portado del prototipo v6 en three.js), que se abre desde el botón "Recorrer el salón" del hero y descarga three.js recién en ese toque, y publicar la página `/barbatos` como portada de la demo.

**Architecture:** three.js vive solo en `src/tour/` (módulos sin React): medidas por offsets desde paredes (`dimensions.ts`) → derivados puros (`layout.ts`) → un builder por elemento registrado en `ELEMENTS` → `createViewer()`, que arma renderer, cámara y `OrbitControls`, renderiza on demand y expone un `TourController` chico (`setView`, `setRoofVisible`, `dispose`). React solo pone el lanzador (`TourLauncher`, `'use client'`, `next/dynamic` con `ssr: false`) y el overlay (`TourOverlay`: portal, foco, Escape, atrás, scroll lock, fallbacks), que baja la escena con `import()` a través de `src/tour/registry.ts`. `Venue` gana un campo opcional serializable `tour?: { scene: TourSceneId }`.

**Tech Stack:** Next.js 16.4.2 (App Router, Turbopack, SSG), React 19.3.0, TypeScript 5, Tailwind CSS 4, Motion 14.3.0, three 0.186.1 + @types/three 0.186.0, Vitest 5 + Testing Library + jsdom, Playwright 1.64.1 (proyecto `mobile-chrome` / Pixel 7), sharp (ya presente en `node_modules` como dependencia de `next`) solo para el script de fotos.

**Spec:** `docs/superpowers/specs/2026-10-20-venue-3d-tour-design.md`. Prototipo de referencia (fuente de verdad de geometría, materiales, texturas con sus semillas, luces y vistas): `docs/superpowers/specs/assets/2026-10-20-venue-3d-prototype-v6.html`. Cada ejecutor lee la spec, el prototipo y su task.

## Global Constraints

- Todo ejecutor: **usá CodeGraph MCP (`codegraph_explore`) primero si existe índice (`.codegraph/`); grep/Read como fallback.** Hoy el repo no tiene índice: fallback directo, decilo en una línea. En un worktree, el índice es propio de ese worktree.
- AGENTS.md: este Next.js tiene breaking changes. Antes de usar una API de Next (`next/dynamic`, `next/image`, metadata), leé la guía en `node_modules/next/dist/docs/` (carga diferida: `01-app/02-guides/lazy-loading.md`).
- Commits convencionales (`feat:`, `test:`, `build:`, `docs:`…) **sin** trailer `Co-Authored-By` ni ninguna atribución a IA. Un commit al terminar cada task. No push.
- Build: no por rutina. **Obligatorio `npm run build` (y esperar éxito)** en toda task que toque `'use client'`/`'use server'`, cualquier archivo bajo `src/app/`, o un borde RSC (un server component que renderiza un client component nuevo o le pasa props nuevas). Vitest no compila con Turbopack.
- Dependencias con versión exacta: `npm i -E three@0.186.1` y `npm i -E -D @types/three@0.186.0` (estables vigentes verificadas con `npm view` el 2026-10-20; 0.186.1 publicada 2026-09-24). Addons por `three/addons/controls/OrbitControls.js` y `three/addons/environments/RoomEnvironment.js` (el `exports` de three mapea `./addons/*`).
- **Ningún archivo fuera de `src/tour/` importa `three` ni `three/*`**; fuera de `src/tour/` tampoco se importa `@/tour/engine/*` ni `@/tour/scenes/*`. Regla `no-restricted-imports` en `eslint.config.mjs` (Task 2).
- **0 bytes de three en el bundle inicial**: `next/dynamic(..., { ssr: false })` solo en Client Components; el overlay se renderiza solo con `open === true`; la escena se carga con `import()` desde el registro.
- Convención de ejes (v6): metros, origen en el centro del salón, +z = **este** = frente (pérgola, pedregullo), −z = oeste (galería, parque, sol), −x = izquierda mirando el frente (anexo), +x = derecha (hogar).
- `ROOF_COLOR = "#3b4f66"` (sin confirmar). Estilo C: `MeshStandardMaterial`, texturas procedurales en canvas con las semillas `rng` del v6, sombras, apliques cálidos. Nada gris tipo AutoCAD.
- Render on demand: **sin loop `requestAnimationFrame` permanente** y sin damping (decisión de este plan, §12 lo deja a criterio). Se renderiza en `controls` `change`, resize, `setView` y `setRoofVisible`.
- Calidad: mobile (`pointer: coarse` o ancho < 768) → `pixelRatio = min(dpr, 1.5)`, shadow map 1024²; desktop → `min(dpr, 2)`, 2048². `PCFSoftShadowMap`, `ACESFilmicToneMapping`, `toneMappingExposure = 1.1`, `antialias: true`. Anisotropía `min(4, renderer.capabilities.getMaxAnisotropy())`. Point lights sin sombra.
- Presupuesto: **< 150 draw calls** en la vista Afuera (sillas, patas y tapas de mesa con `InstancedMesh`).
- `dispose()` libera: geometrías, materiales, texturas, env map del PMREM, `PMREMGenerator`, `OrbitControls`, `ResizeObserver`, listeners, `renderer.dispose()` + `renderer.forceContextLoss()`, y quita el canvas del contenedor.
- `OrbitControls` del v6: `maxPolarAngle = Math.PI * 0.495`, `minDistance = 0.3`, `maxDistance = 90`, `zoomToCursor = true`; además el target se recorta a la caja del lote derivada de `layout.ts`.
- Copy exacto (español rioplatense): `Recorrer el salón`, `Afuera`, `Adentro`, `Sin techo` / `Con techo`, `Cerrar`, `Reintentar`, `Cargando el recorrido…`, `Tu dispositivo no puede mostrar el recorrido 3D`, `No se pudo cargar el recorrido 3D`, ayuda `Girar: arrastrá · Zoom: pellizcá · Mover: dos dedos`, `aria-label` del diálogo `Recorrido 3D de ${venueName}` (→ `Recorrido 3D de Barbato's`).
- Overlay: `role="dialog"`, `aria-modal="true"`, `createPortal` a `document.body`, raíz con `style={themeToCssVars(theme)}`, `z-[60]` (por encima del `z-40` del flotante y del `z-50` del sobre/Lightbox), áreas táctiles ≥ 44 px (`min-h-11 min-w-11`), canvas con `touch-action: none` y `aria-hidden`.
- Reduced motion: los cambios de vista son saltos instantáneos (como el v6); nada de rotación automática ni transiciones de cámara.
- Barbato's: **primero** en `venues`, `slug: "barbatos"`, `name: "Barbato's"` (apóstrofo recto), sin `logo`, `envelope: true`, `tour: { scene: "barbatos" }`; fotos web en `public/venues/barbatos/` derivadas de `docs/superpowers/specs/assets/barbatos-photos/` (los originales no se sirven); textos, WhatsApp y dirección como placeholders `(PLACEHOLDER)`.
- `salon-ejemplo` y `salon-minimo` siguen accesibles por slug y **sin** `tour`.

## Review Focus

1. Cerrar (botón, Escape o atrás) mientras el chunk de three todavía baja → cuando la promesa resuelve no se monta nada ni queda un contexto WebGL vivo. Test en Task 6 (`no monta la escena si se desmonta antes de que termine la carga`).
2. Cerrar y volver a abrir → se monta una escena nueva y la anterior se liberó exactamente una vez (sin canvas duplicados). Test en Task 7 (`reabrir monta una escena nueva y libera la anterior una sola vez`).
3. Cerrar con el botón y después tocar "atrás" en Android → el usuario sigue en `/barbatos` (la entrada que apiló el visor se quita al cerrar, no queda una "atrás" fantasma). Tests en Task 6 (`al cerrar sin popstate quita la entrada que apiló`) y Task 8 (e2e `atrás cierra el visor y la página sigue en /barbatos`).
4. Girar el teléfono / resize con el visor abierto → el renderer toma el nuevo tamaño, actualiza el aspecto y renderiza (sin loop). Test en Task 5 (`el ResizeObserver ajusta tamaño y aspecto y renderiza`).
5. Reintentar después de un error o de `webglcontextlost` → el controller viejo se libera antes de montar el nuevo y queda un solo `mount` activo. Test en Task 6 (`contexto perdido: libera, muestra Reintentar y reintentar monta de nuevo`).

---

### Task 1: Medidas por offsets y layout puro de Barbato's

Ejecutor: usá CodeGraph MCP (`codegraph_explore`) primero si existe índice; grep/Read como fallback.

**Files:**
- Create: `src/tour/scenes/barbatos/dimensions.ts`
- Create: `src/tour/scenes/barbatos/layout.ts`
- Test: `src/tour/scenes/barbatos/layout.test.ts`

**Interfaces:**
- Consumes: nada (sin three, sin React).
- Produces:
  - `type Vec3 = readonly [number, number, number]` y `type Bounds = { min: Vec3; max: Vec3 }` exportados desde `layout.ts` (Task 3 los re-exporta desde `src/tour/types.ts`).
  - `type CornerRef = "front-left" | "front-right"`.
  - `type BarbatosDimensions` y `const BARBATOS_DIMENSIONS: BarbatosDimensions` en `dimensions.ts`, con `ROOF_COLOR = "#3b4f66"` exportado aparte.
  - `computeLayout(d: BarbatosDimensions): BarbatosLayout` y `const BARBATOS_LAYOUT = computeLayout(BARBATOS_DIMENSIONS)` en `layout.ts`.
  - `type Opening = { x: number; width: number; height: number; sill: number }`, `type Segment = { x0: number; x1: number }`, `type TableSpot = { x: number; z: number; kind: "round" | "rect" }`.
  - `BarbatosLayout` con estos campos (los builders de Task 3 y las luces de Task 4 solo leen de acá):
    - `hall: { hx; hz; wallHeight; ridgeHeight; wallThickness; slope; slopeLen }`
    - `frontDoor: Opening`, `frontWindows: Opening[]`, `frontSconces: { x: number; y: number }[]`
    - `backWindows: Opening[]`, `backWindowGrid: { cols: number; rows: number }`, `backSconcesX: number[]`
    - `gableWindows: { z: number; width: number; height: number; sill: number }[]`
    - `plinth: { height; thickness; front: Segment[]; back: Segment[] }`
    - `trussesX: number[]`
    - `chimney: { x; width; depth; height; hearthX; flue: { x; base; top; radius } }`
    - `carpet: { x0; x1; width }`
    - `annex: { x; width; height; zFront; zBack }`
    - `pergola: { z; height; columnsX: number[] }`
    - `gallery: { zInner; zPosts; zRoofOuter; postsX: number[] }`
    - `park: { wall: { zStart; z; halfWidth; height }; trees: { x; z; scale }[]; garland: { z; polesX: number[] } }`
    - `patio: { x; z; width; depth }`
    - `tables: TableSpot[]`
    - `pointLights: Vec3[]`
    - `targetBounds: Bounds`

`BARBATOS_DIMENSIONS` guarda **medidas base y offsets desde su pared o esquina de referencia**, con estos valores (equivalentes a los absolutos del v6; los nombres internos son a criterio):

| Grupo | Valores |
|---|---|
| `hall` | `length: 24, width: 12, wallHeight: 3.5, ridgeHeight: 7, wallThickness: 0.3` |
| `frontDoor` | centrada en el frente; `width: 2.5, height: 2.7` |
| `frontWindows` | `width: 1.7, height: 1.7, sill: 1.2`; centros: `{ from: "front-left", offset: 6.5 }`, `{ from: "front-right", offset: 8 }`, `{ from: "front-right", offset: 5 }`, `{ from: "front-right", offset: 2 }` |
| `frontSconces` | a `0.6` de cada jamba de la puerta, alto `2.9`; en el punto medio entre ventanas derechas consecutivas y a `2.7` a la izquierda de la ventana izquierda, alto `2.6` |
| `backWindows` | tramo a `1.95` de cada esquina del fondo, `count: 3, pillar: 0.5, height: 2.8, sill: 0.1, grid: { cols: 6, rows: 3 }`; apliques en el centro de cada pilar y a `0.5` por fuera de cada extremo del tramo |
| `gableWindows` | hastial derecho, `width: 1.4`, a `3.8` a cada lado del eje del hogar; alto y base = los de `frontWindows` |
| `plinth` | `height: 0.8, thickness: 0.42, overhang: 0.06` |
| `trusses` | `count: 5, spacing: 4`, centradas |
| `chimney` | contra el hastial derecho: `depth: 1.2, height: 5.8, width: 2.8`; hogar a `1.22` del muro interior; caño `radius: 0.32, base: 5.6, aboveRidge: 1.8` |
| `carpet` | `width: 1.8`, desde `0.2` del muro izquierdo hasta `0.3` antes del frente de la chimenea |
| `annex` | a la izquierda, `width: 6, height: 3.2, setbackFromFront: 2`; el fondo se ancla al borde exterior del techo de la galería |
| `pergola` | `distanceFromFront: 3, height: 3.4, columnsFromAxis: 2.4` |
| `gallery` | `depth: 3, roofDepth: 3.4, roofOverhang: 0.35, postInset: 0.1, postSpacing: 4` |
| `park` | `wallHeight: 1.1, wallDistanceFromBack: 20, wallHalfWidth: 21` (los muros laterales arrancan en el borde del techo de la galería, `−hz − roofDepth`); guirnalda a `11` del fondo con postes en x `-9, -3, 3, 9`; 8 árboles del v6 re-expresados desde el fondo o el frente |
| `patio` | pedregullo desde el frente, `width: 30, depth: 10, xOffset: -2` |
| `tables` | filas a `3, 6.5, 10, 13.5, 17` del muro izquierdo exterior, a `2.6` de cada muro largo; alternan redonda/rectangular como el v6 |
| `pointLights` | `[0, 2.6, 0.8 delante del frente]`, `[-4, 3.2, 0]`, `[4, 3.2, 0]`, `[1.5 delante del muro interior derecho, 0.9, 0]`, `[0, 2.6, 2 detrás del fondo]` |
| `lot` | margen del target: `4` más allá del muro del parque en x, `2` detrás del muro en z, frente = borde del pedregullo, y de `0` a `ridgeHeight + 1` |

- [ ] **Step 1: Escribir los tests que fallan**

```ts
// src/tour/scenes/barbatos/layout.test.ts
const L0 = BARBATOS_LAYOUT;
const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 4);

describe("layout de Barbato's reproduce el v6", () => {
  it("salón y aberturas del frente", () => {
    expect(L0.hall).toMatchObject({ hx: 12, hz: 6, wallHeight: 3.5, ridgeHeight: 7, wallThickness: 0.3 });
    close(L0.hall.slope, Math.atan2(3.5, 6));
    expect(L0.frontDoor).toEqual({ x: 0, width: 2.5, height: 2.7, sill: 0 });
    expect(L0.frontWindows.map((w) => w.x)).toEqual([-5.5, 4, 7, 10]);
    expect(L0.frontSconces).toEqual([{ x: -1.85, y: 2.9 }, { x: 1.85, y: 2.9 }, { x: -8.2, y: 2.6 }, { x: 5.5, y: 2.6 }, { x: 8.5, y: 2.6 }]);
  });
  it("las ventanas del frente quedan 1 a la izquierda y 3 a la derecha de la puerta", () => {
    expect(L0.frontWindows.filter((w) => w.x < L0.frontDoor.x)).toHaveLength(1);
    expect(L0.frontWindows.filter((w) => w.x > L0.frontDoor.x)).toHaveLength(3);
  });
  it("los 3 ventanales del fondo cubren ≈20 m con 2 pilares de 0,5 m", () => {
    const [a, , c] = L0.backWindows;
    close(a.x - a.width / 2, -10.05);
    close(c.x + c.width / 2, 10.05);
    close(a.width, (20.1 - 1) / 3);
    expect(L0.backWindows.map((w) => w.x)).toEqual([expect.closeTo(-6.8667, 3), 0, expect.closeTo(6.8667, 3)]);
    expect(L0.backWindowGrid).toEqual({ cols: 6, rows: 3 });
    expect(L0.backSconcesX).toEqual([-10.55, expect.closeTo(-3.4333, 3), expect.closeTo(3.4333, 3), 10.55]);
  });
  it("zócalo cortado en puerta y ventanales", () => {
    expect(L0.plinth.front).toEqual([{ x0: -12.06, x1: -1.25 }, { x0: 1.25, x1: 12.06 }]);
    expect(L0.plinth.back).toHaveLength(4);
  });
  it("hastial derecho, cerchas, chimenea, alfombra", () => {
    expect(L0.gableWindows.map((g) => g.z)).toEqual([-3.8, 3.8]);
    expect(L0.trussesX).toEqual([-8, -4, 0, 4, 8]);
    close(L0.chimney.x, 11.1);
    close(L0.chimney.hearthX, 10.48);
    expect(L0.chimney.flue).toMatchObject({ base: 5.6, top: 8.8, radius: 0.32 });
    expect(L0.carpet).toEqual({ x0: -11.5, x1: expect.closeTo(10.2, 4), width: 1.8 });
  });
  it("el caño queda sobre el hogar", () => { expect(L0.chimney.flue.x).toBe(L0.chimney.x); });
  it("anexo, pérgola y galería", () => {
    expect(L0.annex).toEqual({ x: -15, width: 6, height: 3.2, zFront: 4, zBack: -9.35 });
    expect(L0.pergola).toEqual({ z: 9, height: 3.4, columnsX: [-2.4, 2.4] });
    expect(L0.gallery).toMatchObject({ zInner: -6, zPosts: -9.1, zRoofOuter: -9.35, postsX: [-8, -4, 0, 4, 8, 12] });
  });
  it("el anexo llega al borde del techo de la galería", () => { expect(L0.annex.zBack).toBe(L0.gallery.zRoofOuter); });
  it("parque, patio, mesas, luces y caja del target", () => {
    expect(L0.park.wall).toEqual({ zStart: -9.4, z: -26, halfWidth: 21, height: 1.1 });
    expect(L0.park.trees).toEqual([[-15,-16,1.1],[-7,-21,1.3],[4,-22,1.2],[13,-15,1],[17,-21,1.2],[-18,-22,0.9],[-20,10,1.1],[20,12,1]].map(([x,z,scale]) => ({ x, z, scale })));
    expect(L0.park.garland).toEqual({ z: -17, polesX: [-9, -3, 3, 9] });
    expect(L0.patio).toEqual({ x: -2, z: 11, width: 30, depth: 10 });
    expect(L0.tables.map((t) => t.x)).toEqual([-9, -9, -5.5, -5.5, -2, -2, 1.5, 1.5, 5, 5]);
    expect(L0.tables.slice(0, 4).map((t) => [t.z, t.kind])).toEqual([[3.4, "round"], [-3.4, "rect"], [3.4, "rect"], [-3.4, "round"]]);
    expect(L0.pointLights).toEqual([[0, 2.6, 6.8], [-4, 3.2, 0], [4, 3.2, 0], [expect.closeTo(10.2, 4), 0.9, 0], [0, 2.6, -8]]);
    expect(L0.targetBounds).toEqual({ min: [-25, 0, -28], max: [25, 8, 16] });
  });
});

describe("anclaje: los elementos se mueven con su pared", () => {
  const withHall = (hall: Partial<BarbatosDimensions["hall"]>) =>
    computeLayout({ ...BARBATOS_DIMENSIONS, hall: { ...BARBATOS_DIMENSIONS.hall, ...hall } });
  it("alargar L corre el hogar, sus ventanas y el caño con el hastial derecho", () => {
    const L30 = withHall({ length: 30 });
    close(L30.chimney.x - L0.chimney.x, 3);
    close(L30.chimney.flue.x, L30.chimney.x);
    expect(L30.gableWindows.map((g) => g.z)).toEqual([-3.8, 3.8]);
  });
  it("alargar L conserva la distancia de cada ventana del frente a su esquina", () => {
    const L30 = withHall({ length: 30 });
    close(L30.frontWindows[0].x - -L30.hall.hx, 6.5);
    expect(L30.frontWindows.slice(1).map((w) => L30.hall.hx - w.x)).toEqual([8, 5, 2]);
    close(L30.backWindows[0].x - L30.backWindows[0].width / 2, -L30.hall.hx + 1.95);
  });
  it("ensanchar W corre pérgola, anexo y galería, y el anexo sigue llegando al techo de la galería", () => {
    const W14 = withHall({ width: 14 });
    expect(W14.pergola.z).toBe(10);
    expect(W14.annex.zFront).toBe(5);
    close(W14.gallery.zRoofOuter, -10.35);
    expect(W14.annex.zBack).toBe(W14.gallery.zRoofOuter);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/tour/scenes/barbatos/layout.test.ts`
Expected: FAIL (`Cannot find module './layout'`).

- [ ] **Step 3: Implementar `dimensions.ts` y `computeLayout(d: BarbatosDimensions): BarbatosLayout`**

Todos los derivados se calculan desde las medidas base (nada de copiar `-10.05`, `11.1` o `-9.35` sueltos): ancho de ventanal = `(tramo − 2·pilar) / 3`; cortes del zócalo con el `plinthRun` del v6 extraído como función pura `plinthSegments(min, max, cuts: { x: number; width: number }[]): Segment[]` (extremos `±(hx + overhang)`); `chimney.x = hx − T − depth/2`; `zRoofOuter = −hz − gallery.depth − roofOverhang`; `annex.zBack = zRoofOuter`; `park.wall.zStart = −hz − roofDepth`. Las mesas alternan con la regla del v6 `(i + (lado frente ? 0 : 1)) % 2 === 0 → "round"`, frente primero en cada fila. Comentá cada grupo con su referencia ("desde la esquina frente-izquierda") para que pasar a medidas láser sea copiar números.

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run src/tour/scenes/barbatos/layout.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tour/scenes/barbatos/dimensions.ts src/tour/scenes/barbatos/layout.ts src/tour/scenes/barbatos/layout.test.ts
git commit -m "feat: add barbatos wall-offset dimensions and pure layout"
```

---

### Task 2: three, regla de lint y motor base (texturas, materiales, primitivas)

Ejecutor: usá CodeGraph MCP (`codegraph_explore`) primero si existe índice; grep/Read como fallback.

**Files:**
- Modify: `package.json`, `package-lock.json` (deps exactas), `eslint.config.mjs`
- Create: `src/tour/engine/textures.ts`, `src/tour/engine/materials.ts`, `src/tour/engine/primitives.ts`, `src/tour/engine/test-context.ts`
- Test: `src/tour/engine/textures.test.ts`, `src/tour/engine/materials.test.ts`, `src/tour/engine/primitives.test.ts`

**Interfaces:**
- Consumes: nada de tasks previas.
- Produces:
  - `textures.ts`: `rng(seed: number): () => number` (mulberry32 del v6), `noise(g, s, n, r, colors, alpha): void`, `canvasTex(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, maxAnisotropy: number): THREE.CanvasTexture`, `type TextureKey = "stone" | "ceiling" | "wood" | "roof" | "gravel" | "plaster" | "wallLow" | "cement" | "grass" | "carpet"`, `type Textures = Record<TextureKey, THREE.Texture>`, `makeTextures(maxAnisotropy: number): Textures` (portado del v6 con sus semillas; `wood` es la misma instancia que `ceiling`).
  - `materials.ts`: `type MaterialKey = "plaster" | "stone" | "roof" | "metal" | "cement" | "gravel" | "grass" | "ceiling" | "wood" | "carpet" | "chair" | "trunk" | "crown" | "wallLow" | "hearth" | "sconce" | "bulb" | "fire" | "glass"`, `const UNIT: Partial<Record<MaterialKey, number>>` (valores del v6), `type MaterialFactory = (key: MaterialKey) => THREE.MeshStandardMaterial`, `createMaterials(textures: Textures, envMap: THREE.Texture | null, palette: { roof: string }): MaterialFactory` (con caché, parámetros del `def` del v6).
  - `primitives.ts`: `scaleBoxUV(geo: THREE.BoxGeometry, w, h, d, unit): void`, `type BoxOpts = { rx?: number; ry?: number; noShadow?: boolean }`, `type Primitives = { box(w, h, d, key: MaterialKey, at: Vec3, opts?: BoxOpts): THREE.Mesh; cyl(r, h, key: MaterialKey, at: Vec3, segments?: number): THREE.Mesh; extrudeWall(shape: THREE.Shape, depth: number, key: MaterialKey): THREE.Mesh; rectHole(x0, y0, x1, y1): THREE.Path; frame(axis: "z" | "x", center: number, wallMid: number, y0: number, w: number, h: number, wallThickness: number, opts?: { door?: boolean; cols?: number; rows?: number }): THREE.Group }`, `createPrimitives(materials: MaterialFactory): Primitives`. Las primitivas **devuelven** el objeto sin agregarlo a ningún padre; `noShadow` va a `mesh.userData.noShadow = true`.
  - `test-context.ts` (solo para tests): `createTestEngineContext(): { materials: MaterialFactory; textures: Textures; primitives: Primitives }` con texturas falsas (`new THREE.Texture()` por clave) y `palette.roof = "#3b4f66"`.

- [ ] **Step 1: Instalar three exacto**

Run: `npm i -E three@0.186.1 && npm i -E -D @types/three@0.186.0`
Expected: `package.json` muestra `"three": "0.186.1"` en `dependencies` y `"@types/three": "0.186.0"` en `devDependencies` (sin `^`).

- [ ] **Step 2: Agregar la regla de lint y verificar que muerde**

En `eslint.config.mjs`, un bloque `{ files: ["src/**/*.{ts,tsx}"], ignores: ["src/tour/**"], rules: { "no-restricted-imports": ["error", { patterns: [{ group: ["three", "three/*"], message: "three solo se importa dentro de src/tour/" }, { group: ["@/tour/engine/*", "@/tour/scenes/*"], message: "Fuera de src/tour/ solo se usan @/tour/registry, @/tour/webgl y @/tour/types" }] }] } }`.

Run: `printf 'import "three";\n' > src/components/lint-probe.ts && npx eslint src/components/lint-probe.ts; rm src/components/lint-probe.ts`
Expected: error `three solo se importa dentro de src/tour/`. Después `npm run lint` sin errores.

- [ ] **Step 3: Escribir los tests que fallan**

```ts
// textures.test.ts — jsdom no dibuja en canvas 2D: getContext("2d") se stubbea con un Proxy de no-ops.
it("rng es determinista y devuelve valores en [0, 1)", () => {
  const a = rng(7), b = rng(7);
  const xs = Array.from({ length: 50 }, a);
  expect(xs).toEqual(Array.from({ length: 50 }, b));
  expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
});
it("makeTextures crea las 10 texturas repetibles en sRGB con anisotropía limitada", () => {
  const t = makeTextures(4);
  expect(Object.keys(t).sort()).toEqual(["carpet","cement","ceiling","gravel","grass","plaster","roof","stone","wallLow","wood"]);
  expect(t.wood).toBe(t.ceiling);
  for (const tex of Object.values(t)) {
    expect(tex.wrapS).toBe(THREE.RepeatWrapping);
    expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(tex.anisotropy).toBe(4);
  }
});
it("canvasTex respeta el máximo de anisotropía recibido", () => { expect(canvasTex(16, () => {}, 2).anisotropy).toBe(2); });

// materials.test.ts
it("devuelve la misma instancia para la misma clave", () => { const M = createMaterials(fakeTextures, null, { roof: "#3b4f66" }); expect(M("stone")).toBe(M("stone")); });
it("la chapa usa el color de la paleta", () => { expect(M("roof").color.getHexString()).toBe("3b4f66"); });
it("el vidrio es transparente, de doble cara y no escribe profundidad", () => {
  expect(M("glass")).toMatchObject({ transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
});
it("los apliques emiten luz cálida", () => { expect(M("sconce").emissiveIntensity).toBe(3); expect(M("bulb").emissiveIntensity).toBe(4); });

// primitives.test.ts
it("scaleBoxUV escala la cara frontal por ancho/alto sobre la unidad", () => {
  const g = new THREE.BoxGeometry(4, 2, 1); scaleBoxUV(g, 4, 2, 1, 2);
  const uv = g.attributes.uv; const xs = [16,17,18,19].map((k) => uv.getX(k)), ys = [16,17,18,19].map((k) => uv.getY(k));
  expect(Math.max(...xs)).toBe(2); expect(Math.max(...ys)).toBe(1);
});
it("box crea un mesh posicionado con su material y marca noShadow", () => {
  const m = P.box(1, 2, 3, "stone", [1, 2, 3], { noShadow: true });
  expect(m.position.toArray()).toEqual([1, 2, 3]); expect(m.material).toBe(M("stone")); expect(m.userData.noShadow).toBe(true); expect(m.parent).toBeNull();
});
it("frame arma ventana 3×3, ventanal 6×3 y puerta doble con vidrio", () => {
  expect(P.frame("z", 0, 0, 1.2, 1.7, 1.7, 0.3).children).toHaveLength(9);
  expect(P.frame("z", 0, 0, 0.1, 6.37, 2.8, 0.3, { cols: 6, rows: 3 }).children).toHaveLength(12);
  const door = P.frame("z", 0, 0, 0, 2.5, 2.7, 0.3, { door: true });
  expect(door.children).toHaveLength(6);
  expect(door.children.filter((c) => (c as THREE.Mesh).material === M("glass"))).toHaveLength(1);
});
```

- [ ] **Step 4: Correr y verificar que fallan**

Run: `npx vitest run src/tour/engine`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 5: Implementar `textures.ts`, `materials.ts`, `primitives.ts` y `test-context.ts`**

Portar del v6 sin reinventar: dibujo de cada textura, semillas (`stone` 7, `ceiling` 3, `gravel` 11, `noise` sembrado con `n`), tabla `UNIT`, `def` de materiales, `scaleBoxUV`, `extrudeWall` (UV dividido por `UNIT[key] ?? 1`), `rectHole` y `frame` (`ft = 0.07`, `fd = wallThickness + 0.06`). `canvasTex` fija `anisotropy = maxAnisotropy` (el viewer le pasa `min(4, getMaxAnisotropy())`).

- [ ] **Step 6: Correr y verificar que pasan**

Run: `npx vitest run src/tour/engine && npm run lint`
Expected: PASS y lint limpio.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json eslint.config.mjs src/tour/engine
git commit -m "feat: add three engine base with procedural textures, materials and primitives"
```

---

### Task 3: Tipos del recorrido, builders de elementos y `ELEMENTS`

Ejecutor: usá CodeGraph MCP (`codegraph_explore`) primero si existe índice; grep/Read como fallback.

**Files:**
- Create: `src/tour/types.ts`, `src/tour/engine/assemble.ts`
- Create: `src/tour/scenes/barbatos/elements/{ground,patio,front-wall,back-wall,gables,plinth,floor,chimney,trusses,roof,annex,annex-roof,pergola,gallery,gallery-roof,park,garland,tables}.ts`
- Create: `src/tour/scenes/barbatos/elements/index.ts`
- Test: `src/tour/engine/assemble.test.ts`, `src/tour/scenes/barbatos/elements/elements.test.ts`

**Interfaces:**
- Consumes: `BarbatosLayout`, `BARBATOS_LAYOUT`, `Vec3`, `Bounds` (Task 1); `MaterialFactory`, `Textures`, `Primitives`, `createTestEngineContext()` (Task 2).
- Produces (en `src/tour/types.ts`, único archivo de tipos que React puede importar; usa `import type` de three):
  - `type TourView = "out" | "in"`
  - `type TourController = { setView(view: TourView): void; setRoofVisible(visible: boolean): void; dispose(): void }`
  - `type MountOptions = { onContextLost(): void }` y `type TourModule = { mount(container: HTMLElement, options: MountOptions): TourController }`
  - `type CameraView = { pos: Vec3; target: Vec3 }`, re-export de `Vec3` y `Bounds`
  - `type Quality = { pixelRatio: number; shadowMapSize: number; antialias: boolean; maxAnisotropy: number }`
  - `type EngineContext = { materials: MaterialFactory; textures: Textures; primitives: Primitives }`, `type BuildContext<L> = EngineContext & { layout: L }`
  - `type SceneElement<L> = { id: string; group?: "root" | "roof"; build(ctx: BuildContext<L>): THREE.Object3D }`
  - `type TourScene = { palette: { roof: string }; build(ctx: EngineContext): { root: THREE.Group; roofGroup: THREE.Group }; lights(quality: Quality): THREE.Object3D[]; views: Record<TourView, CameraView>; background: string; fog: { near: number; far: number }; targetBounds: Bounds }`
  - `assembleElements<L>(elements: readonly SceneElement<L>[], ctx: BuildContext<L>): { root: THREE.Group; roofGroup: THREE.Group }` en `engine/assemble.ts` (`roofGroup` es hijo de `root`; no conoce elementos concretos).
  - `ELEMENTS: readonly SceneElement<BarbatosLayout>[]` en `elements/index.ts`, en este orden y con estos grupos: `ground`, `patio`, `front-wall`, `back-wall`, `gables`, `plinth`, `floor`, `chimney`, `trusses`, `roof` (roof), `annex`, `annex-roof` (roof), `pergola`, `gallery`, `gallery-roof` (roof), `park`, `garland`, `tables`.

Reparto del v6 por builder: `ground` = plano de pasto 140×140; `patio` = pedregullo + 2 veredas de cemento; `front-wall` = muro con muesca de puerta, huecos, marcos y los 5 apliques; `back-wall` = muro con 3 ventanales y marcos 6×3; `gables` = 2 hastiales + marcos de las ventanas del hogar; `plinth` = zócalo frente/fondo/hastial derecho; `floor` = piso interior + alfombra; `chimney` = bloque de piedra, hogar, fuego, repisa, caño, sombrero y babeta; `trusses` = pares inclinados, tirantes y pendolones (quedan visibles con Sin techo, como en el v6); `roof` = 2 faldones de chapa + cielorraso; `annex` = bloque de piedra + rectángulo oscuro del frente; `annex-roof`; `pergola` = columnas de listones, vigas y travesaños; `gallery` = piso, postes, viga y apliques; `gallery-roof`; `park` = muro perimetral + 8 árboles (copa `IcosahedronGeometry(1.6, 0)` compartida); `garland` = postes + bombitas en un `InstancedMesh` marcado `noShadow`; `tables` = mesas y sillas instanciadas. Ningún builder llama a otro: los cortes salen de `layout`.

- [ ] **Step 1: Escribir los tests que fallan**

```ts
// assemble.test.ts
const fake = (id: string, group?: "root" | "roof"): SceneElement<null> => ({ id, group, build: () => Object.assign(new THREE.Group(), { name: id }) });
it("agrega cada elemento registrado a root o al grupo del techo", () => {
  const { root, roofGroup } = assembleElements([fake("a"), fake("b", "roof"), fake("prueba")], { ...createTestEngineContext(), layout: null });
  expect(root.children.map((c) => c.name)).toEqual(expect.arrayContaining(["a", "prueba"]));
  expect(roofGroup.children.map((c) => c.name)).toEqual(["b"]);
  expect(roofGroup.parent).toBe(root);
});

// elements.test.ts
const ctx = { ...createTestEngineContext(), layout: BARBATOS_LAYOUT };
it("los ids de ELEMENTS son únicos", () => { const ids = ELEMENTS.map((e) => e.id); expect(new Set(ids).size).toBe(ids.length); });
it("registra los elementos del v6 en orden", () => {
  expect(ELEMENTS.map((e) => e.id)).toEqual(["ground","patio","front-wall","back-wall","gables","plinth","floor","chimney","trusses","roof","annex","annex-roof","pergola","gallery","gallery-roof","park","garland","tables"]);
});
it("solo roof, annex-roof y gallery-roof se ocultan con Sin techo", () => {
  expect(ELEMENTS.filter((e) => e.group === "roof").map((e) => e.id)).toEqual(["roof", "annex-roof", "gallery-roof"]);
});
it.each(ELEMENTS.map((e) => [e.id, e] as const))("%s construye un Object3D con la layout por defecto", (_id, element) => {
  expect(element.build(ctx)).toBeInstanceOf(THREE.Object3D);
});
it("tables instancia 60 sillas (asiento y respaldo) y no crea un mesh por silla", () => {
  const obj = ELEMENTS.find((e) => e.id === "tables")!.build(ctx);
  const instanced: THREE.InstancedMesh[] = []; let plain = 0;
  obj.traverse((o) => { if ((o as THREE.InstancedMesh).isInstancedMesh) instanced.push(o as THREE.InstancedMesh); else if ((o as THREE.Mesh).isMesh) plain++; });
  expect(instanced.filter((m) => m.material === ctx.materials("chair")).map((m) => m.count)).toEqual([60, 60]);
  expect(plain).toBe(0);
});
it("el caño de la chimenea está en la x del bloque de piedra", () => {
  const meshes: THREE.Mesh[] = []; ELEMENTS.find((e) => e.id === "chimney")!.build(ctx).traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
  expect(meshes.filter((m) => m.material === ctx.materials("metal")).every((m) => Math.abs(m.position.x - BARBATOS_LAYOUT.chimney.flue.x) < 1e-6)).toBe(true);
});
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `npx vitest run src/tour/engine/assemble.test.ts src/tour/scenes/barbatos/elements`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar `types.ts`, `assembleElements` y los 18 builders + `ELEMENTS`**

Cada builder devuelve un `THREE.Group` (o un mesh) con la geometría del v6 leída de `ctx.layout`. `tables`: un `InstancedMesh` por pieza repetida (asiento de silla, respaldo, tapa redonda, pedestal, tapa rectangular, pata), con la orientación de cada silla de `atan2(faceX − x, faceZ − z)` del v6 compuesta en la matriz de la instancia.

- [ ] **Step 4: Correr y verificar que pasan**

Run: `npx vitest run src/tour && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tour/types.ts src/tour/engine/assemble.ts src/tour/engine/assemble.test.ts src/tour/scenes/barbatos/elements
git commit -m "feat: add barbatos scene elements registered in ELEMENTS"
```

---

### Task 4: Luces, vistas, cámara acotada y calidad por dispositivo

Ejecutor: usá CodeGraph MCP (`codegraph_explore`) primero si existe índice; grep/Read como fallback.

**Files:**
- Create: `src/tour/engine/quality.ts`, `src/tour/engine/camera.ts`, `src/tour/scenes/barbatos/lights.ts`, `src/tour/scenes/barbatos/views.ts`
- Test: `src/tour/engine/quality.test.ts`, `src/tour/engine/camera.test.ts`, `src/tour/scenes/barbatos/lights.test.ts`

**Interfaces:**
- Consumes: `Quality`, `CameraView`, `TourView`, `Vec3`, `Bounds` (Task 3); `BarbatosLayout` (Task 1).
- Produces:
  - `pickQuality(input: { coarsePointer: boolean; width: number; dpr: number }): Quality` y `detectQuality(): Quality` (lee `matchMedia("(pointer: coarse)")`, `innerWidth`, `devicePixelRatio`) en `quality.ts`. `maxAnisotropy` sale de `quality` como tope 4; el viewer lo cruza con el de la GPU.
  - `NARROW_ASPECT = 1.1`, `NARROW_OUT_SCALE = 1.5`, `resolveViewPose(views: Record<TourView, CameraView>, view: TourView, aspect: number): CameraView`, `clampTarget(target: Vec3, bounds: Bounds): Vec3` en `camera.ts` (puras, sin three).
  - `BARBATOS_VIEWS: Record<TourView, CameraView>` = `out: { pos: [19, 10, 23], target: [-1, 2.5, 0] }`, `in: { pos: [-11.2, 1.75, 0], target: [-4, 1.5, 0] }`.
  - `createLights(layout: BarbatosLayout, quality: Quality): THREE.Object3D[]` en `lights.ts`.

- [ ] **Step 1: Escribir los tests que fallan**

```ts
// quality.test.ts
it("mobile por pointer coarse: pixel ratio 1,5 y sombras 1024", () => { expect(pickQuality({ coarsePointer: true, width: 1200, dpr: 3 })).toMatchObject({ pixelRatio: 1.5, shadowMapSize: 1024 }); });
it("mobile por ancho < 768", () => { expect(pickQuality({ coarsePointer: false, width: 767, dpr: 2 })).toMatchObject({ pixelRatio: 1.5, shadowMapSize: 1024 }); });
it("desktop: pixel ratio hasta 2 y sombras 2048", () => { expect(pickQuality({ coarsePointer: false, width: 1440, dpr: 3 })).toMatchObject({ pixelRatio: 2, shadowMapSize: 2048 }); });
it("no sube el pixel ratio por encima del dpr real", () => { expect(pickQuality({ coarsePointer: true, width: 400, dpr: 1 }).pixelRatio).toBe(1); });

// camera.test.ts
it("Afuera en pantalla angosta se aleja ×1,5 desde el target", () => { expect(resolveViewPose(BARBATOS_VIEWS, "out", 0.5).pos).toEqual([29, 13.75, 34.5]); });
it("Afuera en pantalla ancha y Adentro siempre usan la pose del v6", () => {
  expect(resolveViewPose(BARBATOS_VIEWS, "out", 1.6)).toEqual(BARBATOS_VIEWS.out);
  expect(resolveViewPose(BARBATOS_VIEWS, "in", 0.5)).toEqual(BARBATOS_VIEWS.in);
});
it("clampTarget recorta a la caja y deja intacto lo que está adentro", () => {
  const b = { min: [-25, 0, -28], max: [25, 8, 16] } as const;
  expect(clampTarget([90, -3, -100], b)).toEqual([25, 0, -28]);
  expect(clampTarget([-1, 2.5, 0], b)).toEqual([-1, 2.5, 0]);
});

// lights.test.ts
const lights = createLights(BARBATOS_LAYOUT, { pixelRatio: 1.5, shadowMapSize: 1024, antialias: true, maxAnisotropy: 4 });
it("hemisférica cálida del v6", () => { const h = lights.find((l) => l instanceof THREE.HemisphereLight)!; expect(h.color.getHexString()).toBe("ffd2a8"); expect(h.groundColor.getHexString()).toBe("5a4634"); expect(h.intensity).toBe(1.25); });
it("sol de atardecer desde el oeste con sombra del tamaño de la calidad", () => {
  const sun = lights.find((l) => l instanceof THREE.DirectionalLight)!;
  expect(sun.color.getHexString()).toBe("ffb36b"); expect(sun.intensity).toBe(3); expect(sun.position.toArray()).toEqual([6, 10, -48]);
  expect(sun.castShadow).toBe(true); expect(sun.shadow.mapSize.toArray()).toEqual([1024, 1024]);
});
it("5 point lights cálidas sin sombra en las posiciones del layout", () => {
  const points = lights.filter((l) => l instanceof THREE.PointLight);
  expect(points.map((p) => p.position.toArray())).toEqual(BARBATOS_LAYOUT.pointLights.map((p) => [...p]));
  expect(points.every((p) => p.color.getHexString() === "ffb466" && !p.castShadow)).toBe(true);
});
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `npx vitest run src/tour/engine/quality.test.ts src/tour/engine/camera.test.ts src/tour/scenes/barbatos/lights.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `pickQuality`, `detectQuality`, `resolveViewPose`, `clampTarget`, `BARBATOS_VIEWS` y `createLights`**

`createLights` porta del v6: intensidades/distancias de las point lights `[9,9], [14,16], [14,16], [10,8], [6,12]` con decay 1.6; sol con `target` en `(0, 0, -4)` (incluí `sun.target` en el array devuelto), cámara de sombra `left -34, right 34, top 18, bottom -18, near 5, far 110`, `bias -0.0004`, `normalBias 0.04`.

- [ ] **Step 4: Correr y verificar que pasan**

Run: `npx vitest run src/tour`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tour/engine/quality.ts src/tour/engine/quality.test.ts src/tour/engine/camera.ts src/tour/engine/camera.test.ts src/tour/scenes/barbatos/lights.ts src/tour/scenes/barbatos/lights.test.ts src/tour/scenes/barbatos/views.ts
git commit -m "feat: add tour lights, camera views, target bounds and device quality"
```

---

### Task 5: Viewer on demand, escena Barbato's montable y registro

Ejecutor: usá CodeGraph MCP (`codegraph_explore`) primero si existe índice; grep/Read como fallback.

**Files:**
- Create: `src/tour/engine/viewer.ts`, `src/tour/scenes/barbatos/index.ts`, `src/tour/registry.ts`
- Modify: `src/domain/venue.ts` (tipo `TourSceneId` y campo `tour?`)
- Test: `src/tour/engine/viewer.test.ts`, `src/tour/registry.test.ts`

**Interfaces:**
- Consumes: todo lo de Tasks 1–4 (`TourScene`, `Quality`, `TourController`, `MountOptions`, `TourModule`, `assembleElements`, `ELEMENTS`, `createLights`, `BARBATOS_VIEWS`, `resolveViewPose`, `clampTarget`, `makeTextures`, `createMaterials`, `createPrimitives`, `detectQuality`, `ROOF_COLOR`, `BARBATOS_LAYOUT`).
- Produces:
  - `src/domain/venue.ts`: `export type TourSceneId = "barbatos"` y en `Venue` `tour?: { scene: TourSceneId }` con el JSDoc de la spec §7.
  - `type ViewerDeps = { createRenderer(quality: Quality): THREE.WebGLRenderer; createEnvironment(renderer: THREE.WebGLRenderer): { texture: THREE.Texture; dispose(): void }; createTextures(maxAnisotropy: number): Textures }`.
  - `createViewer(container: HTMLElement, scene: TourScene, quality: Quality, options: MountOptions & { deps?: Partial<ViewerDeps> }): TourController` en `viewer.ts`. Estado inicial: vista `out`, techo visible.
  - `barbatosScene: TourScene` y `mount(container: HTMLElement, options: MountOptions): TourController` (= `createViewer(container, barbatosScene, detectQuality(), options)`) en `scenes/barbatos/index.ts`; el módulo satisface `TourModule`.
  - `tourScenes: Record<TourSceneId, () => Promise<TourModule>>` y `loadTourScene(id: TourSceneId): Promise<TourModule>` en `registry.ts`, con `barbatos: () => import("./scenes/barbatos")`.
  - Hook de medición para e2e: después de cada render, `canvas.dataset.drawCalls = String(renderer.info.render.calls)`.

- [ ] **Step 1: Escribir los tests que fallan**

`viewer.test.ts` usa un renderer falso (`domElement` = `<canvas>` real; `render`, `setSize`, `setPixelRatio`, `dispose`, `forceContextLoss` como `vi.fn()`; `capabilities.getMaxAnisotropy = () => 16`; `info.render.calls = 42`; `shadowMap = {}`), `createEnvironment` falso con `dispose: vi.fn()`, `createTextures` con `new THREE.Texture()` por clave, `ResizeObserver` stub con `vi.stubGlobal` que guarda el callback, y una `TourScene` mínima cuyo `build` devuelve un mesh en `root` y otro en `roofGroup`.

```ts
it("renderiza al crear, marca draw calls y no deja un loop de requestAnimationFrame", () => {
  const raf = vi.spyOn(window, "requestAnimationFrame");
  createViewer(container, scene, quality, { onContextLost, deps });
  expect(renderer.render).toHaveBeenCalled(); expect(raf).not.toHaveBeenCalled();
  expect(container.querySelector("canvas")?.dataset.drawCalls).toBe("42");
  expect(container.querySelector("canvas")).toHaveAttribute("aria-hidden", "true");
  expect(container.querySelector("canvas")!.style.touchAction).toBe("none");
});
it("aplica pixel ratio y tamaño de sombra de la calidad", () => { expect(renderer.setPixelRatio).toHaveBeenCalledWith(1.5); });
it("setRoofVisible oculta el grupo del techo y renderiza una vez", () => {
  const c = createViewer(...); renderer.render.mockClear(); c.setRoofVisible(false);
  expect(roofMesh.parent!.visible).toBe(false); expect(renderer.render).toHaveBeenCalledTimes(1);
});
it("setView('in') lleva cámara y target a la vista Adentro", () => { /* camera.position ≈ [-11.2, 1.75, 0] leída del render call */ });
it("el ResizeObserver ajusta tamaño y aspecto y renderiza", () => { // Review Focus 4
  /* container 400×800 → callback → setSize(400, 800, false), camera.aspect 0.5, render llamado */
});
it("dispose libera GPU, controles, observer y quita el canvas", () => {
  const geoDispose = vi.spyOn(rootMesh.geometry, "dispose"), matDispose = vi.spyOn(rootMesh.material as THREE.Material, "dispose");
  const c = createViewer(...); c.dispose();
  expect(geoDispose).toHaveBeenCalled(); expect(matDispose).toHaveBeenCalled(); expect(env.dispose).toHaveBeenCalled();
  expect(renderer.dispose).toHaveBeenCalled(); expect(renderer.forceContextLoss).toHaveBeenCalled();
  expect(observer.disconnect).toHaveBeenCalled(); expect(container.querySelector("canvas")).toBeNull();
});
it("webglcontextlost en el canvas avisa con onContextLost", () => {
  createViewer(...); container.querySelector("canvas")!.dispatchEvent(new Event("webglcontextlost"));
  expect(onContextLost).toHaveBeenCalledTimes(1);
});

// registry.test.ts
it("registra la escena barbatos", () => { expect(Object.keys(tourScenes)).toEqual(["barbatos"]); });
it("loadTourScene('barbatos') resuelve un módulo con mount", async () => { expect(typeof (await loadTourScene("barbatos")).mount).toBe("function"); });
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `npx vitest run src/tour/engine/viewer.test.ts src/tour/registry.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `createViewer`, `barbatosScene` + `mount`, el registro y el campo `tour`**

`createViewer` porta `setupView` del v6: deps por defecto (`new THREE.WebGLRenderer({ antialias })`, PMREM + `RoomEnvironment` con `0.04`, `makeTextures`); `scene.background`/`fog` desde `TourScene`; sombras `castShadow = receiveShadow = true` en todo mesh sin `userData.noShadow` y con `material.opacity === 1` (incluye los `InstancedMesh` de mesas y sillas); `OrbitControls` con los límites de Global Constraints; en `change`, `clampTarget` y el mismo delta se suma a `camera.position` (así el pan se frena sin girar), después render. `setView` usa `resolveViewPose(scene.views, view, aspect)`. `dispose()` recorre la escena entera (geometrías, materiales, `map` de cada material) además de lo listado en Global Constraints, y quita los listeners de `webglcontextlost` y `change`. `barbatosScene.build = (ctx) => assembleElements(ELEMENTS, { ...ctx, layout: BARBATOS_LAYOUT })`, `background: "#e7a77a"`, `fog: { near: 60, far: 170 }`, `targetBounds: BARBATOS_LAYOUT.targetBounds`, `palette: { roof: ROOF_COLOR }`.

- [ ] **Step 4: Correr y verificar que pasan**

Run: `npx vitest run && npm run lint && npx tsc --noEmit`
Expected: PASS, sin errores de tipos (el campo `tour` es opcional: los venues existentes compilan sin cambios).

- [ ] **Step 5: Commit**

```bash
git add src/tour src/domain/venue.ts
git commit -m "feat: add on-demand tour viewer, barbatos scene module and scene registry"
```

---

### Task 6: Overlay del recorrido a pantalla completa

Ejecutor: usá CodeGraph MCP (`codegraph_explore`) primero si existe índice; grep/Read como fallback.

**Files:**
- Create: `src/tour/webgl.ts`, `src/components/venue-tour/TourOverlay.tsx` (`'use client'`)
- Test: `src/tour/webgl.test.ts`, `src/components/venue-tour/TourOverlay.test.tsx`

**Interfaces:**
- Consumes: `loadTourScene(id): Promise<TourModule>`, `TourController`, `TourView` (Tasks 3 y 5); `TourSceneId`, `VenueTheme` (`@/domain/venue`); `themeToCssVars` (`@/lib/theme`).
- Produces:
  - `hasWebGL(): boolean` en `src/tour/webgl.ts` (sin three: `document.createElement("canvas")`, `getContext("webgl2") ?? getContext("webgl")`, libera el contexto de prueba con `WEBGL_lose_context`; cualquier excepción → `false`).
  - `TourOverlay({ scene, venueName, theme, onClose }: { scene: TourSceneId; venueName: string; theme: VenueTheme; onClose: () => void }): ReactPortal` (named export). Estados `"unsupported" | "loading" | "ready" | "error"`. Orden de botones en el DOM: `Afuera`, `Adentro`, `Sin techo`/`Con techo`, `Cerrar` (los tres primeros solo con `ready`; en `error` se agrega `Reintentar`). Contenedor del canvas: `<div data-testid="tour-canvas-host" aria-hidden="true" style={{ touchAction: "none" }}>`.

Comportamiento (cada punto tiene su test abajo): portal a `document.body` con `themeToCssVars(theme)` en la raíz; foco a Cerrar al montar; Tab/Shift+Tab ciclan entre los botones habilitados del diálogo; Escape (listener en `window`) y `popstate` llaman a `onClose`; al montar `history.pushState({ venueTour: true }, "")`, y en el cleanup, si no cerró un `popstate`, `history.back()` (después de quitar el listener); `body.style.overflow` guarda el previo, fija `hidden` y lo restaura en el cleanup; `hasWebGL()` en false → fallback sin llamar al loader; carga con `role="status"` "Cargando el recorrido…"; loader rechazado, `mount` que tira o `onContextLost` → `dispose()` del controller actual (si hay) y mensaje de error con Reintentar; Reintentar vuelve a cargar; si el componente se desmontó o hubo un reintento antes de que resuelva la carga, el resultado viejo se descarta sin montar; `dispose()` en el cleanup.

- [ ] **Step 1: Escribir los tests que fallan**

```ts
// webgl.test.ts
it("true si el navegador da un contexto webgl2 o webgl", () => { stubGetContext({ webgl: fakeGl }); expect(hasWebGL()).toBe(true); });
it("false si getContext devuelve null", () => { stubGetContext({}); expect(hasWebGL()).toBe(false); });
it("false si getContext tira", () => { stubGetContextThrows(); expect(hasWebGL()).toBe(false); });

// TourOverlay.test.tsx — vi.mock("@/tour/registry", () => ({ loadTourScene: vi.fn() })), vi.mock("@/tour/webgl", () => ({ hasWebGL: vi.fn(() => true) }))
// controller = { setView: vi.fn(), setRoofVisible: vi.fn(), dispose: vi.fn() }; mount = vi.fn(() => controller); loadTourScene.mockResolvedValue({ mount })
const theme = { primary: "#112233", accent: "#445566", fontHeading: "serif" };
const renderOverlay = (onClose = vi.fn()) => render(<TourOverlay scene="barbatos" venueName="Barbato's" theme={theme} onClose={onClose} />);

it("abre como diálogo modal con label y enfoca Cerrar", () => {
  renderOverlay(); const dialog = screen.getByRole("dialog", { name: "Recorrido 3D de Barbato's" });
  expect(dialog).toHaveAttribute("aria-modal", "true"); expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus();
});
it("la raíz del portal es hija de body y lleva las variables de tema", () => {
  renderOverlay(); const root = screen.getByRole("dialog");
  expect(root.parentElement).toBe(document.body); expect(root.style.getPropertyValue("--venue-primary")).toBe("#112233");
});
it("muestra Cargando mientras baja la escena y la ayuda de gestos", () => {
  loadTourScene.mockReturnValue(new Promise(() => {})); renderOverlay();
  expect(screen.getByRole("status")).toHaveTextContent("Cargando el recorrido…");
  expect(screen.getByText("Girar: arrastrá · Zoom: pellizcá · Mover: dos dedos")).toBeInTheDocument();
});
it("monta la escena dentro del diálogo y muestra los controles", async () => {
  renderOverlay(); await screen.findByRole("button", { name: "Afuera" });
  expect(mount).toHaveBeenCalledWith(screen.getByTestId("tour-canvas-host"), expect.objectContaining({ onContextLost: expect.any(Function) }));
});
it("Afuera y Adentro llaman a setView y aria-pressed sigue la vista activa", async () => {
  renderOverlay(); const out = await screen.findByRole("button", { name: "Afuera" }); const inside = screen.getByRole("button", { name: "Adentro" });
  expect(out).toHaveAttribute("aria-pressed", "true");
  await userEvent.click(inside); expect(controller.setView).toHaveBeenLastCalledWith("in");
  expect(inside).toHaveAttribute("aria-pressed", "true"); expect(out).toHaveAttribute("aria-pressed", "false");
});
it("Sin techo alterna setRoofVisible, aria-pressed y el texto", async () => {
  renderOverlay(); await userEvent.click(await screen.findByRole("button", { name: "Sin techo" }));
  expect(controller.setRoofVisible).toHaveBeenLastCalledWith(false);
  expect(screen.getByRole("button", { name: "Con techo" })).toHaveAttribute("aria-pressed", "true");
});
it("Tab y Shift+Tab no salen del diálogo", async () => {
  renderOverlay(); const out = await screen.findByRole("button", { name: "Afuera" }); screen.getByRole("button", { name: "Cerrar" }).focus();
  await userEvent.tab(); expect(out).toHaveFocus();
  await userEvent.tab({ shift: true }); expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus();
});
it("Escape llama a onClose", async () => { const onClose = vi.fn(); renderOverlay(onClose); await userEvent.keyboard("{Escape}"); expect(onClose).toHaveBeenCalledTimes(1); });
it("popstate (atrás de Android) llama a onClose", () => { const onClose = vi.fn(); renderOverlay(onClose); window.dispatchEvent(new PopStateEvent("popstate")); expect(onClose).toHaveBeenCalledTimes(1); });
it("al abrir apila una entrada y al cerrar sin popstate la quita", () => { // Review Focus 3
  const push = vi.spyOn(history, "pushState"), back = vi.spyOn(history, "back").mockImplementation(() => {});
  const { unmount } = renderOverlay(); expect(push).toHaveBeenCalledTimes(1); unmount(); expect(back).toHaveBeenCalledTimes(1);
});
it("si cerró un popstate no vuelve a ir atrás", () => { /* dispatch popstate, unmount → back no llamado */ });
it("fija overflow hidden y restaura el valor previo al desmontar", () => {
  document.body.style.overflow = "clip"; const { unmount } = renderOverlay();
  expect(document.body.style.overflow).toBe("hidden"); unmount(); expect(document.body.style.overflow).toBe("clip");
});
it("dispose al desmontar", async () => { const { unmount } = renderOverlay(); await screen.findByRole("button", { name: "Afuera" }); unmount(); expect(controller.dispose).toHaveBeenCalledTimes(1); });
it("sin WebGL muestra el fallback y no llama al loader", () => {
  hasWebGL.mockReturnValue(false); renderOverlay();
  expect(screen.getByText("Tu dispositivo no puede mostrar el recorrido 3D")).toBeInTheDocument();
  expect(loadTourScene).not.toHaveBeenCalled(); expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
});
it("si el loader rechaza muestra Reintentar, y reintentar carga y monta", async () => {
  loadTourScene.mockRejectedValueOnce(new Error("chunk")); renderOverlay();
  expect(await screen.findByText("No se pudo cargar el recorrido 3D")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  await screen.findByRole("button", { name: "Afuera" }); expect(loadTourScene).toHaveBeenCalledTimes(2); expect(mount).toHaveBeenCalledTimes(1);
});
it("si mount tira muestra Reintentar", async () => { mount.mockImplementationOnce(() => { throw new Error("shader"); }); renderOverlay(); expect(await screen.findByRole("button", { name: "Reintentar" })).toBeInTheDocument(); });
it("contexto perdido: libera, muestra Reintentar y reintentar monta de nuevo", async () => { // Review Focus 5
  renderOverlay(); await screen.findByRole("button", { name: "Afuera" });
  act(() => mount.mock.calls[0][1].onContextLost());
  expect(controller.dispose).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  await screen.findByRole("button", { name: "Afuera" }); expect(mount).toHaveBeenCalledTimes(2);
});
it("no monta la escena si se desmonta antes de que termine la carga", async () => { // Review Focus 1
  let resolve!: (m: TourModule) => void; loadTourScene.mockReturnValue(new Promise((r) => (resolve = r)));
  const { unmount } = renderOverlay(); unmount(); await act(async () => resolve({ mount }));
  expect(mount).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `npx vitest run src/tour/webgl.test.ts src/components/venue-tour`
Expected: FAIL.

- [ ] **Step 3: Implementar `hasWebGL` y `TourOverlay`**

Visual a criterio (spec §12) con tokens de `globals.css`: fondo `bg-neutral-900`, barra superior con los botones (`min-h-11 min-w-11`, activo con `bg-primary text-white`), ayuda abajo, `fixed inset-0 z-[60]`. Sin animaciones (reduced motion queda cubierto: saltos instantáneos).

- [ ] **Step 4: Correr tests, lint y build**

Run: `npx vitest run && npm run lint && npm run build`
Expected: PASS y build exitoso (archivo `'use client'` nuevo).

- [ ] **Step 5: Commit**

```bash
git add src/tour/webgl.ts src/tour/webgl.test.ts src/components/venue-tour/TourOverlay.tsx src/components/venue-tour/TourOverlay.test.tsx
git commit -m "feat: add fullscreen tour overlay with focus, back button, scroll lock and fallbacks"
```

---

### Task 7: Lanzador "Recorrer el salón" en el hero

Ejecutor: usá CodeGraph MCP (`codegraph_explore`) primero si existe índice; grep/Read como fallback.

**Files:**
- Create: `src/components/venue-tour/TourLauncher.tsx` (`'use client'`)
- Modify: `src/components/hero/Hero.tsx`, `src/components/venue-card/VenueCard.tsx`
- Test: `src/components/venue-tour/TourLauncher.test.tsx`, `src/components/venue-card/VenueCard.test.tsx` (agregar casos)

**Interfaces:**
- Consumes: `TourOverlay` (Task 6, solo vía `next/dynamic`); `Venue.tour`, `TourSceneId`, `VenueTheme` (Task 5).
- Produces:
  - `TourLauncher({ scene, venueName, theme }: { scene: TourSceneId; venueName: string; theme: VenueTheme }): JSX.Element` (named export). `const TourOverlay = dynamic(() => import("./TourOverlay").then((m) => m.TourOverlay), { ssr: false, loading: () => <div role="status" className="fixed inset-0 z-[60] …">Cargando el recorrido…</div> })`, renderizado solo con `open`. `onClose` cierra y devuelve el foco al botón con un `ref`. Sin imports estáticos de `src/tour/`.
  - `Hero` acepta `tourLauncher?: ReactNode` y lo renderiza al lado del `WhatsAppButton` dentro del mismo `RevealItem`, en `<div data-testid="hero-actions" className="flex flex-wrap items-center justify-center gap-3">`. `Hero` sigue siendo server.
  - `VenueCard` pasa `tourLauncher={venue.tour ? <TourLauncher scene={venue.tour.scene} venueName={venue.name} theme={venue.theme} /> : undefined}`.

- [ ] **Step 1: Escribir los tests que fallan**

```ts
// TourLauncher.test.tsx — mismos mocks de @/tour/registry y @/tour/webgl que Task 6.
// Si next/dynamic no resuelve bajo Vitest, vi.mock("next/dynamic") con un wrapper React.lazy + Suspense.
const renderLauncher = () => render(<TourLauncher scene="barbatos" venueName="Barbato's" theme={theme} />);
it("muestra Recorrer el salón y no carga la escena antes del toque", () => {
  renderLauncher(); expect(screen.getByRole("button", { name: "Recorrer el salón" })).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); expect(loadTourScene).not.toHaveBeenCalled();
});
it("al tocar abre el diálogo y enfoca Cerrar", async () => {
  renderLauncher(); await userEvent.click(screen.getByRole("button", { name: "Recorrer el salón" }));
  expect(await screen.findByRole("dialog", { name: "Recorrido 3D de Barbato's" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus();
});
it("Cerrar desmonta el diálogo, libera la escena y devuelve el foco al botón", async () => {
  /* abrir, esperar Afuera, click Cerrar → no hay dialog, controller.dispose 1 vez, launcher con foco */
});
it("Escape cierra y devuelve el foco al botón", async () => { /* ídem con {Escape} */ });
it("reabrir monta una escena nueva y libera la anterior una sola vez", async () => { // Review Focus 2
  /* abrir → cerrar → abrir: mount 2 veces, dispose 1 vez, un solo tour-canvas-host en el documento */
});
it("con el sobre abierto, cerrar el visor deja el overflow del body como estaba", async () => {
  render(<CardShell envelope venueName="Barbato's" whatsappHref="https://wa.me/1"><TourLauncher scene="barbatos" venueName="Barbato's" theme={theme} /></CardShell>);
  await userEvent.click(screen.getByRole("button", { name: /Abrir la invitación/ }));
  const before = document.body.style.overflow;
  await userEvent.click(await screen.findByRole("button", { name: "Recorrer el salón" }));
  await userEvent.click(await screen.findByRole("button", { name: "Cerrar" }));
  expect(document.body.style.overflow).toBe(before);
});

// VenueCard.test.tsx (agregar)
it("con tour muestra Recorrer el salón junto al WhatsApp del hero", () => {
  render(<VenueCard venue={{ ...minimalVenue, tour: { scene: "barbatos" } }} />);
  const actions = screen.getByTestId("hero-actions");
  expect(within(actions).getByRole("link", { name: "Consultanos por WhatsApp" })).toBeInTheDocument();
  expect(within(actions).getByRole("button", { name: "Recorrer el salón" })).toBeInTheDocument();
});
it("sin tour no muestra el botón del recorrido", () => {
  render(<VenueCard venue={minimalVenue} />); expect(screen.queryByRole("button", { name: "Recorrer el salón" })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `npx vitest run src/components/venue-tour/TourLauncher.test.tsx src/components/venue-card`
Expected: FAIL.

- [ ] **Step 3: Implementar `TourLauncher` y el slot `tourLauncher` en `Hero`/`VenueCard`**

Botón con la misma altura que el `WhatsAppButton` inline (`rounded-full px-6 py-3 min-h-11`), estilo secundario sobre la foto (p. ej. `bg-white/90 text-primary`), foco visible como el resto. El texto es exactamente `Recorrer el salón`.

- [ ] **Step 4: Correr tests, lint y build**

Run: `npx vitest run && npm run lint && npm run build`
Expected: PASS y build exitoso (borde RSC nuevo: `VenueCard` server renderiza un client component con props nuevas).

- [ ] **Step 5: Commit**

```bash
git add src/components/venue-tour/TourLauncher.tsx src/components/venue-tour/TourLauncher.test.tsx src/components/hero/Hero.tsx src/components/venue-card/VenueCard.tsx src/components/venue-card/VenueCard.test.tsx
git commit -m "feat: add lazy tour launcher next to the hero whatsapp button"
```

---

### Task 8: Página Barbato's como portada, fotos y e2e del recorrido

Ejecutor: usá CodeGraph MCP (`codegraph_explore`) primero si existe índice; grep/Read como fallback.

**Files:**
- Create: `scripts/optimize-barbatos-photos.mjs`, `public/venues/barbatos/{hero.jpg,gallery-1.jpg … gallery-5.jpg,og.png}`
- Modify: `src/content/venues.ts`, `src/domain/venue-repository.test.ts`, `src/tour/registry.test.ts`, `e2e/smoke.spec.ts`, `README.md`
- Create: `e2e/tour.spec.ts`
- Test: `src/content/venues.test.ts`

**Interfaces:**
- Consumes: `Venue.tour` (Task 5), `tourScenes` (Task 5), launcher + overlay (Tasks 6–7), `canvas.dataset.drawCalls` (Task 5).
- Produces: entrada `barbatos` primera en `venues`; `/` redirige a `/barbatos`.

Fotos (decisión de este plan, §12 lo deja a criterio): hero = `01-fachada-frente-atardecer.jpg`; galería en este orden = `03-interior-mesas-redondas`, `04-interior-hacia-hogar`, `06-interior-panoramica`, `05-galeria-trasera-parque`, `02-fachada-frente-noche` (las 6 fotos entre hero y galería). El script usa `sharp` (ya en `node_modules` por `next`; no se agrega como dependencia): hero JPG ancho máx. 1920 calidad 80; galería JPG ancho máx. 1600 calidad 80; OG `og.png` 1200×630 recortada de la fachada 01 (`fit: "cover"`, `position: "attention"`), con `palette: true` para que pese ≤ 300 KB. Los `alt` describen la foto según la tabla §6.1 de la spec.

Datos de la entrada (placeholders marcados): `tagline: "Salón y parque para tus eventos (PLACEHOLDER)"`, `about` con `(PLACEHOLDER)`, `whatsapp: { phone: "+54 9 11 0000-0002" /* PLACEHOLDER */, message: "¡Hola! Vi la tarjeta de Barbato's y quiero consultar por un evento (PLACEHOLDER)" }`, `location.address` con `(PLACEHOLDER)`, `theme` placeholder `{ primary: "#3b4f66", accent: "#c06a55", fontHeading: "var(--font-playfair), Georgia, serif" }` con comentario PLACEHOLDER, `seo: { title: "Barbato's — Salón de eventos (PLACEHOLDER)", description: "… (PLACEHOLDER)", ogImage: "/venues/barbatos/og.png" }`.

- [ ] **Step 1: Escribir los tests unitarios que fallan**

```ts
// venue-repository.test.ts (reemplaza "expone los salones de ejemplo")
it("Barbato's es la portada y los ejemplos siguen", () => {
  expect(getAllSlugs()).toEqual(["barbatos", "salon-ejemplo", "salon-minimo"]);
  const b = getVenueBySlug("barbatos")!;
  expect(b).toMatchObject({ name: "Barbato's", envelope: true, tour: { scene: "barbatos" } }); expect(b.logo).toBeUndefined();
  expect(getVenueBySlug("salon-ejemplo")?.tour).toBeUndefined(); expect(getVenueBySlug("salon-minimo")?.tour).toBeUndefined();
});

// registry.test.ts (agregar)
it("toda venue.tour.scene del contenido tiene escena registrada", () => {
  for (const v of venues) if (v.tour) expect(tourScenes).toHaveProperty(v.tour.scene);
});

// src/content/venues.test.ts
it("las imágenes de Barbato's existen en public/ y la OG es 1200×630", () => {
  const b = getVenueBySlug("barbatos")!;
  for (const src of [b.hero.image, b.seo.ogImage, ...b.gallery!.map((g) => g.src)]) expect(existsSync(join("public", src))).toBe(true);
  expect(b.gallery).toHaveLength(5);
  const png = readFileSync(join("public", b.seo.ogImage)); expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  expect(png.length).toBeLessThanOrEqual(300 * 1024);
});
it("los textos de Barbato's quedan marcados como placeholder", () => {
  const b = getVenueBySlug("barbatos")!;
  for (const text of [b.tagline, b.about!, b.whatsapp.message, b.location!.address, b.seo.title]) expect(text).toContain("(PLACEHOLDER)");
});
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `npx vitest run src/domain src/tour/registry.test.ts src/content`
Expected: FAIL.

- [ ] **Step 3: Generar las fotos y agregar la entrada `barbatos`**

Run: `node scripts/optimize-barbatos-photos.mjs`
Expected: 7 archivos en `public/venues/barbatos/` y el tamaño de cada uno impreso. Después, la entrada primera en `src/content/venues.ts` y una línea en `README.md` ("Agregar un salón": `tour` opcional, escenas en `src/tour/scenes/<id>/`, medidas en `dimensions.ts`).

- [ ] **Step 4: Correr y verificar que pasan**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Escribir los e2e**

`e2e/smoke.spec.ts`: `"la raíz redirige al primer salón"` espera `/\/barbatos$/`.

`e2e/tour.spec.ts` (Pixel 7). Helper `openCard(page)` = `goto("/barbatos")` + tap en `/Abrir la invitación/`. Para reconocer el chunk de three: escuchar `page.on("response")` de `/_next/static/chunks/*.js` y marcar como three el cuerpo que contenga `"MeshStandardMaterial"` y `"#include <"` (literales que sobreviven a la minificación). La aserción positiva después del toque confirma que el detector funciona.

```ts
test("/barbatos responde 200 con el h1 Barbato's", async ({ page }) => {
  const res = await page.goto("/barbatos"); expect(res?.status()).toBe(200);
  await page.getByRole("button", { name: /Abrir la invitación/ }).tap();
  await expect(page.getByRole("heading", { level: 1, name: "Barbato's" })).toBeVisible();
});
test("three no se descarga antes del toque y sí después", async ({ page }) => {
  const threeChunks = trackThreeChunks(page); await openCard(page); await page.waitForLoadState("networkidle");
  expect(threeChunks()).toHaveLength(0);
  await page.getByRole("button", { name: "Recorrer el salón" }).tap();
  await expect(page.getByRole("dialog").locator("canvas")).toBeVisible();
  await expect.poll(() => threeChunks().length).toBeGreaterThan(0);
});
test("el visor abre con canvas, sus botones responden y Cerrar vuelve con scroll y foco", async ({ page }) => {
  /* tap Recorrer → dialog "Recorrido 3D de Barbato's" con canvas; Adentro aria-pressed true; Afuera aria-pressed true;
     Sin techo → botón "Con techo" aria-pressed true; Cerrar → dialog oculto, body overflow "", window.scrollBy(0, 400)
     cambia scrollY, botón "Recorrer el salón" enfocado; whatsapp-floating no tapa el diálogo mientras está abierto
     (elementFromPoint en la esquina inferior derecha está dentro del diálogo) */
});
test("Escape cierra el visor", async ({ page }) => { /* abrir → keyboard Escape → dialog oculto */ });
test("atrás cierra el visor y la página sigue en /barbatos", async ({ page }) => { // Review Focus 3
  /* abrir → page.goBack() → dialog oculto, URL /barbatos.
     abrir → Cerrar → expect.poll(() => page.evaluate(() => history.state?.venueTour ?? null)).toBeNull():
     la entrada apilada se quitó, así que el próximo "atrás" sale de la tarjeta como siempre y no queda un paso fantasma */
});
test("la vista Afuera dibuja menos de 150 draw calls", async ({ page }) => {
  /* abrir → canvas[data-draw-calls] → Number(...) < 150 */
});
test("sin WebGL muestra el fallback y no baja three", async ({ page }) => {
  await page.addInitScript(() => { const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) { return /webgl/.test(type) ? null : orig.call(this, type, ...rest); } as typeof orig; });
  /* openCard → tap Recorrer → texto "Tu dispositivo no puede mostrar el recorrido 3D", botón Cerrar, threeChunks() vacío */
});
test.describe("con prefers-reduced-motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("el visor abre y los botones funcionan", async ({ page }) => { /* abrir → Adentro/Afuera/Sin techo cambian aria-pressed → Cerrar */ });
});
```

- [ ] **Step 6: Correr build y e2e**

Run: `npm run build && npm run test:e2e`
Expected: build exitoso (cambia el contenido que consume `src/app/`) y todos los e2e PASS, incluidos los de `salon-ejemplo` y `salon-minimo`. Si la vista Afuera supera 150 draw calls, bajar con más instancing/merge en `tables`/`garland`/`park` antes de seguir, no relajar el umbral.

- [ ] **Step 7: Commit**

```bash
git add scripts/optimize-barbatos-photos.mjs public/venues/barbatos src/content src/domain/venue-repository.test.ts src/tour/registry.test.ts e2e README.md
git commit -m "feat: publish barbatos venue as demo cover with 3d tour"
```

---

### Task 9: Verificación final

Ejecutor: usá CodeGraph MCP (`codegraph_explore`) primero si existe índice; grep/Read como fallback.

**Files:**
- Ninguno nuevo (solo correcciones si algo falla, en la task dueña de ese código).

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: reporte de verificación (tamaño del chunk de three, draw calls medidos).

- [ ] **Step 1: Suite completa**

Run: `npm run lint && npx tsc --noEmit && npm test && npm run build && npm run test:e2e`
Expected: todo en verde.

- [ ] **Step 2: Aislamiento de three**

Run: `grep -rlE "from ['\"]three" src --include='*.ts' --include='*.tsx' | grep -v '^src/tour/'`
Expected: sin salida.

- [ ] **Step 3: Medir el chunk de three del build**

Run: `grep -l "MeshStandardMaterial" .next/static/chunks/*.js | xargs ls -l` y `gzip -c <chunk> | wc -c` por archivo.
Expected: el chunk existe y **no** figura entre los scripts del HTML de `/barbatos` (`curl -s localhost:3100/barbatos | grep -c <nombre-del-chunk>` → 0 con `npm run start -- -p 3100`). Anotar tamaño crudo y gzip, y el `data-draw-calls` medido en el e2e, para el reporte del PR.

- [ ] **Step 4: Revisión visual contra el v6**

Abrir `/barbatos` en `npm run start`, tocar el sobre y "Recorrer el salón": vista Afuera y Adentro comparables con el prototipo v6 (frente a contraluz, chapa azul, pérgola, anexo, 3 ventanales al fondo, hogar con caño, mesas). Diferencias de geometría se corrigen en la task dueña del builder.

- [ ] **Step 5: Commit (solo si hubo correcciones)**

```bash
git add -A
git commit -m "fix: address final verification findings for venue 3d tour"
```
