# Recorrido 3D del salón Barbato's — Diseño

**Fecha:** 2026-10-20
**Estado:** listo para aprobación del usuario
**Relacionado:** `2026-10-15-venue-promo-card-design.md` (tarjeta base)

Convención de este doc: lo que decidió el usuario figura como **decidido**. Lo que propone este diseño figura como **decisión del diseño (a revisar)**.

## 1. Intención

Las fotos muestran partes del salón; un recorrido 3D muestra el lugar completo: cómo se ubican salón, galería, parque y patio, y cómo se ve adentro con mesas. Para quien está decidiendo dónde hacer su evento eso vale más que otra foto, y le da a la tarjeta algo que la competencia no tiene.

Se arma **por código en three.js**, sin modelo externo: no hay una herramienta de foto a 3D que sirva para esto, y con geometría paramétrica las medidas se corrigen cambiando números.

**Primera iteración, incompleta a propósito (decidido).** El usuario avisó que faltan varios elementos adentro y afuera del salón; los va a traer con más fotos y medidas. Esta entrega cubre lo que tiene el v6 y deja la arquitectura lista para sumar elementos (§8.1).

## 2. Objetivos

- Botón **"Recorrer el salón"** junto al botón de WhatsApp del hero, que abre un visor 3D **a pantalla completa**.
- Escena del salón Barbato's (salón + parque) en estilo C semi-realista, **portada del prototipo aprobado v6**.
- Cámara libre tipo editor 3D: girar, mover (pan) y zoom con los dedos; se puede entrar al salón.
- Botones del visor: **Afuera**, **Adentro**, **Sin techo / Con techo** y **Cerrar**.
- Medidas guardadas como **constantes con nombre**, expresadas como **distancias desde paredes** (lo que da un medidor láser), en un solo archivo fácil de editar.
- Escena **extensible**: agregar un elemento nuevo es agregar un builder y registrarlo, sin tocar los existentes.
- Nueva página **Barbato's**, que pasa a ser la **portada de la demo**, con el recorrido habilitado.

## 3. No-objetivos (por ahora)

- Medidas exactas: esta versión usa medidas **estimadas a ojo**. Las medidas láser no tienen fecha.
- Los elementos del salón que todavía no se relevaron (llegan con fotos y medidas nuevas).
- Modelo importado (GLB/FBX), fotogrametría o texturas fotográficas.
- Colisiones con paredes, caminar en primera persona, física.
- Recorridos 3D para otros salones (la arquitectura los permite; no se construyen).
- Animación de la escena: fuego animado, ciclo día/noche, rotación automática.
- Textos, WhatsApp y dirección reales de Barbato's: quedan como placeholders (§7).

## 4. Anti-objetivos (lo que NO puede pasar)

- **three.js en el bundle inicial.** La página tiene que pesar lo mismo que hoy hasta que el usuario toque el botón.
- **Que se trabe en un celular de gama media**: tirones al girar, el navegador cerrando la pestaña por memoria, el teléfono que se calienta con la escena quieta.
- **Que la cámara se pierda**: debajo del piso, a kilómetros, mirando a la nada, sin forma de volver. Siempre tiene que haber una salida de un toque (Afuera/Adentro).
- **Que el visor rompa la página**: scroll trabado al cerrar, foco perdido, el botón flotante de WhatsApp encima del visor, un contexto WebGL que queda vivo después de cerrar.
- **Una pantalla en blanco** si no hay WebGL o falla la descarga del chunk.
- **Que agregar un elemento obligue a reescribir la escena** o a tocar builders de otros elementos.

## 5. Decidido por el usuario

- Recorrido 3D de Barbato's (salón + parque) **generado por código en three.js**, sin modelo externo.
- **Estilo C semi-realista**: `MeshStandardMaterial`, texturas procedurales en canvas (piedra, tablas de madera, chapa acanalada, pedregullo), sombras, apliques cálidos. Con color; nada de estilo AutoCAD gris.
- **Orientación:** el frente mira al **este**. Luz de atardecer baja y cálida desde atrás (oeste, lado parque/galería), así que el frente queda a contraluz.
- **Edificio** (fuente de verdad: prototipo v6, §6):
  - Salón rectangular con techo a dos aguas de **chapa azul** (tono **sin confirmar**, el usuario no lo conoce; `ROOF_COLOR = #3b4f66`), paredes terracota y zócalo de piedra.
  - **Anexo de piedra** en el extremo izquierdo, que llega hacia el fondo hasta el borde del techo de la galería.
  - **Frente:** pérgola negra de listones; puerta doble de vidrio centrada (la puerta SALIDA); ventanas negras cuadriculadas, 1 a la izquierda y 3 a la derecha.
  - **Fondo:** galería techada con **solo 3 ventanales grandes** que ocupan unos 20 m.
  - **Interior:**
    - 5 cerchas de hierro negro bajo un cielorraso de madera; paredes de bloque gris.
    - Chimenea de piedra de piso a techo, con hogar, en la pared corta derecha, y una ventana a cada lado.
    - Caño de chimenea exterior que sale de la cumbrera justo encima del hogar.
    - Alfombra roja central hasta el hogar.
    - Mesas redondas y rectangulares de madera con sillas negras.
  - **Exterior:** parque de pasto con muro perimetral, árboles y guirnalda de luces; patio de pedregullo al frente.
- **Faltan elementos** adentro y afuera; llegan después con fotos y medidas. Esta entrega es una primera iteración.
- **Cámara libre** tipo editor 3D (girar, pan, zoom con dedos, entrar al salón).
- Se abre a **pantalla completa** al tocar "Recorrer el salón", con **carga diferida**: three.js se descarga recién en ese toque.
- Botón **"Recorrer el salón" junto al botón de WhatsApp del hero**.
- Botones finales del visor: **Afuera**, **Adentro**, **Sin techo**, y uno para **cerrar**.
- Sale **ahora con medidas estimadas**; se perfecciona después con medidas láser (sin fecha) y más fotos.
- **Página Barbato's:**
  - Es la **portada de la demo**: va **primera** en `venues` (la raíz redirige ahí).
  - `salon-ejemplo` y `salon-minimo` quedan como páginas accesibles por su slug.
  - Usa el **sobre de entrada** (`envelope: true`). Sin logo, el sobre muestra el nombre.
  - Hero y galería con las **6 fotos del usuario** (§6.1); OG derivada de una de ellas.
  - Textos, WhatsApp y dirección como **placeholders marcados `(PLACEHOLDER)`**.
  - Nombre **"Barbato's"** tal cual (apóstrofo recto), **sin logo**.
- Commits convencionales, sin atribución de IA.

## 6. Referencias versionadas

La fuente de verdad son las copias en el repo (las originales en `/tmp` y en el escritorio son descartables).

**Prototipo aprobado v6:** `docs/superpowers/specs/assets/2026-10-20-venue-3d-prototype-v6.html` (three.js 0.170.0 desde CDN jsDelivr vía `importmap`).

> **Nota:** es un **fragmento** pensado para el visor del brainstorming, no un documento completo: no tiene `<!doctype>`, `<html>` ni `<head>`, y usa `var(--border)` y `var(--text-secondary)`, que definía ese visor. Abierto suelto, el navegador lo muestra en modo quirks, sin borde en el contenedor ni color en la nota. La escena 3D funciona igual (necesita internet para el CDN). No se reescribió.

**El builder porta esta geometría, no la reinventa.** Materiales, texturas procedurales (con sus semillas `rng`), luces y vistas de cámara salen de ahí. Las posiciones se re-expresan como offsets desde paredes (§6.2) preservando el resultado visual.

### 6.1 Fotos del salón

En `docs/superpowers/specs/assets/barbatos-photos/`:

| Archivo | Qué muestra |
|---|---|
| `01-fachada-frente-atardecer.jpg` | Fachada (frente) al atardecer: pérgola, anexo de piedra, caño de chimenea |
| `02-fachada-frente-noche.png` | Frente de noche |
| `03-interior-mesas-redondas.png` | Interior con mesas redondas |
| `04-interior-hacia-hogar.png` | Interior mirando hacia el hogar |
| `05-galeria-trasera-parque.png` | Galería trasera y parque |
| `06-interior-panoramica.png` | Panorámica interior |

Son referencia del modelo **y** contenido de la página: el builder genera versiones web (redimensionadas, JPG/WebP) en `public/venues/barbatos/` para hero, galería y OG (PNG 1200×630, recortada de una foto de fachada). Los originales de `docs/` no se sirven.

### 6.2 Modelo de medidas: offsets desde paredes

**Decisión del diseño (a revisar).** El v6 ubica todo con coordenadas absolutas. Un medidor láser da otra cosa: **distancia desde una pared o esquina**. Para que pasar a medidas reales sea copiar números:

- `dimensions.ts` guarda **medidas base** (largo, ancho, altos, espesores) y, para cada elemento, **su pared o esquina de referencia + offsets** desde ella (p. ej. "ventana frente 2: a 15,5 m de la esquina frente-izquierda").
- `layout.ts` (puro, sin three) **deriva las coordenadas** de la escena a partir de eso.
- El builder **convierte los absolutos del v6 a offsets** y verifica que el resultado visual sea el mismo. Absolutos a convertir:
  - ventanas del frente `frontWins` x = −5,5 · 4 · 7 · 10;
  - tramo de ventanales del fondo `BW_SPAN0/1` = ±10,05;
  - filas de mesas x = −9 · −5,5 · −2 · 1,5 · 5;
  - point lights, árboles;
  - muro del parque (`yz1 = −26`, `yx = 21`);
  - postes y techo de la galería, hoy calculados desde `−hx`.

Constantes del v6 (metros; +z = **este**/frente, −z = **oeste**/galería/parque; origen en el centro del salón):

| Grupo | Valores del v6 |
|---|---|
| Salón | `L=24` (largo, eje x), `W=12` (ancho, eje z), alto de pared `WH=3.5`, cumbrera `RH=7`, espesor de muro `T=0.3` |
| Ventanas frente | 1,7 × 1,7 m, base a 1,2 m; centros en x = −5,5 · 4 · 7 · 10 (1 izq + 3 der) |
| Puerta frente | doble, centrada en x=0, 2,5 × 2,7 m, parante central y barral |
| Ventanales fondo | 3 ventanales en el tramo x −10,05…10,05 (≈20 m), 2 pilares de 0,5 m (cada uno ≈6,37 m de ancho), alto 2,8 m, base 0,1 m, cuadrícula 6×3 |
| Hastial derecho | ventanas de 1,4 × 1,7 m en z = ±3,8, a los lados del hogar |
| Zócalo de piedra | alto 0,8 m, espesor 0,42 m, cortado en las aberturas |
| Cerchas | 5, en x = −8, −4, 0, 4, 8 (tirante, pendolón, pares) |
| Chimenea | bloque de piedra 1,2 × 5,8 × 2,8 contra el hastial derecho; caño exterior centrado encima, que sale 1,8 m sobre la cumbrera |
| Anexo de piedra | 6 m de ancho, 3,2 m de alto, de z=+4 hasta z=−9,35 (borde exterior del techo de la galería) |
| Pérgola | a 3 m del frente, alto 3,4 m, columnas de listones en x = ±2,4 |
| Galería | 3 m de profundidad (techo 3,4 m), postes cada 4 m |
| Parque | muro perimetral de 1,1 m hasta z=−26, x=±21; 8 árboles; guirnalda con postes en z=−17 |
| Patio | pedregullo de 30 × 10 m al frente; vereda de cemento |
| Interior | 5 filas de mesas en x = −9, −5,5, −2, 1,5, 5, alternando redondas (6 sillas) y rectangulares (6 sillas), a z=±3,4; alfombra de 1,8 m de ancho hasta el hogar |
| Color del techo | `ROOF_COLOR = '#3b4f66'` (sin confirmar) |
| Vistas | `out`: pos (19, 10, 23) → target (−1, 2.5, 0); en pantallas angostas (aspecto < 1,1) se aleja ×1,5. `in`: pos (−11.2, 1.75, 0) → target (−4, 1.5, 0) |
| Luces | hemisférica `#ffd2a8`/`#5a4634` 1,25; sol `#ffb36b` 3,0 en (6, 10, −48) con sombra; 5 point lights cálidas `#ffb466`; niebla y fondo `#e7a77a` |

Los derivados (ancho de los ventanales, centros, cortes del zócalo, posición del caño) se **calculan**, no se copian como números sueltos. Si cambia una medida base, cada elemento se mueve con la pared a la que está anclado.

## 7. Integración con el modelo de datos

La tarjeta ya sigue la regla de que los componentes no conocen al salón y solo reciben datos. El recorrido se suma igual que cualquier campo opcional.

**Decisión del diseño (a revisar):** un campo opcional nuevo en `Venue` (`src/domain/venue.ts`):

```ts
/** Escenas 3D disponibles. Cada una es código three.js en src/tour/scenes/<id>/. */
export type TourSceneId = "barbatos";

export type Venue = {
  // ...
  /** Si existe, el hero muestra "Recorrer el salón" junto al WhatsApp. */
  tour?: { scene: TourSceneId };
};
```

- `VenueCard` le pasa a `Hero` el lanzador **solo si `venue.tour` existe** (p. ej. una prop/slot opcional que `Hero` renderiza al lado de `WhatsAppButton`). `salon-ejemplo` y `salon-minimo` no tienen `tour`.
- La geometría **no** va en `venues.ts`: es código propio de cada escena. El dato del salón solo dice *qué* escena usar. Así `Venue` sigue siendo serializable, cosa que importa para la fase futura con base de datos.
- Un registro (`src/tour/registry.ts`) mapea `TourSceneId → () => import("./scenes/<id>")`. Un test verifica que cada `venue.tour.scene` del contenido exista en el registro.

**Nueva entrada en `src/content/venues.ts`:**

- **Primera del array** (decidido): `src/app/page.tsx` redirige al primer slug, así que la raíz pasa a `/barbatos`. El e2e `"la raíz redirige al primer salón"` (`e2e/smoke.spec.ts`, ~línea 67-69) se actualiza a `/barbatos`.
- `slug: "barbatos"` (decisión del diseño, a revisar: sin apóstrofo, la URL queda `/barbatos`), `name: "Barbato's"`, sin `logo`, `envelope: true`, `tour: { scene: "barbatos" }`.
- `hero.image`, `gallery` y `seo.ogImage` desde `public/venues/barbatos/` (§6.1).
- `tagline`, textos, `whatsapp`, dirección y `theme` con **placeholders `(PLACEHOLDER)`**, como el resto de `venues.ts`.
- `generateStaticParams` ya toma los slugs del repositorio: `/barbatos` sale como SSG sin tocar `[slug]/page.tsx` (`dynamicParams = false` se mantiene).

## 8. Arquitectura y módulos

**Principio:** three.js vive en módulos **sin React**, detrás de una interfaz chica. React solo arma el overlay, los botones y el ciclo de vida. Así la escena se testea y evoluciona sin pasar por componentes, y el componente se testea sin WebGL.

```
src/components/venue-tour/
  TourLauncher.tsx       'use client': botón "Recorrer el salón" + estado open;
                         renderiza <TourOverlay> con next/dynamic({ ssr: false })
                         solo cuando open === true. Va en el CTA del hero.
  TourOverlay.tsx        'use client': diálogo a pantalla completa (portal),
                         botones, foco, Escape, bloqueo de scroll, chequeo
                         WebGL, estados cargando/error; importa la escena con import()
src/tour/                (sin React; único lugar que importa "three")
  types.ts               TourController, TourView = "out" | "in", TourScene,
                         SceneElement
  registry.ts            TourSceneId → () => import("./scenes/<id>")
  webgl.ts               hasWebGL(): chequeo barato antes de bajar three
  engine/
    viewer.ts            createViewer(container, scene, quality) → TourController:
                         renderer, cámara, OrbitControls, PMREM, render on demand,
                         ResizeObserver, límites de cámara, dispose()
    quality.ts           pickQuality(): pixel ratio, tamaño de shadow map, antialias
    primitives.ts        box, cyl, extrudeWall, rectHole, frame, scaleBoxUV (del v6)
    textures.ts          canvasTex, noise, rng y texturas procedurales (del v6)
    materials.ts         fábrica de materiales con caché (del v6)
  scenes/barbatos/
    dimensions.ts        medidas base + offsets desde paredes, colores (§6.2)
    layout.ts            derivados puros: offsets → coordenadas, centros de
                         ventanales, cortes de zócalo, mesas (sin three, testeables)
    elements/            un builder por elemento o conjunto: walls, roof,
                         front-openings, back-windows, annex, pergola, gallery,
                         chimney, trusses, tables, park, patio...
    elements/index.ts    ELEMENTS: lista ordenada de builders registrados
    lights.ts            sol, hemisférica, point lights
    views.ts             VIEWS out/in + ajuste para pantallas angostas
    index.ts             export de TourScene { build, lights, views, background }
```

Contrato entre React y three (decisión del diseño, a revisar):

```ts
export type TourController = {
  setView(view: TourView): void;
  setRoofVisible(visible: boolean): void;
  dispose(): void;
};
```

### 8.1 Escena extensible: un builder por elemento

**Decisión del diseño (a revisar).** Para que sumar los elementos que faltan no obligue a reescribir la escena:

```ts
export type SceneElement = {
  id: string;                       // "pergola", "tables", ...
  /** "roof" = se oculta con Sin techo. */
  group?: "root" | "roof";
  build(ctx: BuildContext): THREE.Object3D;
};
// BuildContext: { layout, materials, textures, primitives }
```

- `build()` de la escena recorre `ELEMENTS` y agrega cada objeto a `root` o `roofGroup`. No conoce elementos concretos.
- Agregar un elemento = sus medidas en `dimensions.ts`, sus derivados en `layout.ts` si hacen falta, un archivo en `elements/` y una línea en `ELEMENTS`. **No se tocan los otros builders.**
- Los recortes que un elemento le impone a otro (p. ej. aberturas que cortan el zócalo) salen de `layout.ts`, no de que un builder llame a otro.
- Cada builder es responsable de lo que crea; `dispose()` recorre la escena entera, así que un elemento nuevo no necesita limpieza propia.

### Carga diferida (verificado en `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`)

- `next/dynamic(..., { ssr: false })` **solo funciona en Client Components**. En un Server Component da error. Por eso el `dynamic` vive en `TourLauncher` (`'use client'`); `Hero` puede seguir siendo server y renderizarlo.
- Un Server Component que importa dinámicamente un Client Component **no** hace code splitting automático. Otra razón para que el corte esté del lado cliente.
- Renderizar el componente dinámico **solo cuando `open`** hace que el chunk se pida al tocar (patrón "load on demand" de la guía). Dentro de `TourOverlay`, el `import()` del registro baja `three` y la escena en un chunk aparte.
- Regla dura: **ningún archivo fuera de `src/tour/` importa `"three"`**, y `TourLauncher` no importa nada de `src/tour/` de forma estática salvo `webgl.ts`, que no usa three. Conviene una regla de lint `no-restricted-imports` (decisión del diseño, a revisar).
- **Dependencia nueva:** `three` y `@types/three`. El repo fija versiones exactas (`motion 14.3.0`, `next 16.4.2`), así que van **con versión exacta**. El v6 usó `0.170.0`; el builder elige la estable vigente al instalar y verifica que `OrbitControls` y `RoomEnvironment` (`three/examples/jsm/...` o `three/addons/...`) resuelvan con Turbopack.

### Overlay y accesibilidad

Sigue los patrones que ya existen en `CardShell` y en el `Lightbox` de `Gallery`:

- `role="dialog"`, `aria-modal="true"`, `aria-label="Recorrido 3D de Barbato's"`.
- **Foco:** al abrir va al botón Cerrar (como `autoFocus` del Lightbox); al cerrar vuelve al botón "Recorrer el salón" del hero. Tab se mantiene dentro del diálogo.
- **Escape** cierra (listener en `window`, como `Gallery`).
- **Portal y tema** (decisión del diseño, a revisar): el botón del hero está dentro de un `RevealItem`, que aplica `transform` (Motion), y `position: fixed` dentro de un ancestro transformado deja de ser relativo al viewport. Por eso el overlay se renderiza con **`createPortal` a `document.body`**. Al salir del wrapper de `VenueCard`, pierde las variables de tema que este pone con `style={themeToCssVars(venue.theme)}`: la raíz del overlay **vuelve a aplicar `themeToCssVars`** (`src/lib/theme.ts`) para que `--venue-primary` / `--venue-accent` funcionen.
- **Capas:** `FloatingWhatsApp` es `z-40` y el sobre y el Lightbox son `z-50`; el overlay va en `z-50` o más, para que el WhatsApp flotante no quede encima.
- **Sobre y bloqueo de scroll** (decisión del diseño, a revisar). Hay dos bloqueos sobre `document.body.style.overflow`:
  - `CardShell` lo fija en `hidden` **mientras el sobre está cerrado** y restaura el valor previo al abrirlo o desmontarse.
  - El overlay lo fija en `hidden` mientras está abierto.
  - No se pisan porque **el overlay solo puede abrirse con el sobre ya abierto**: con el sobre cerrado, el contenido (hero incluido) está `inert`, así que el botón no responde. Cuando el overlay se abre, el bloqueo de `CardShell` ya se liberó.
  - Patrón: el overlay guarda `previous = body.style.overflow` al abrir y lo restaura en el cleanup (cerrar o desmontar), igual que `CardShell`. Son bloqueos anidados LIFO, sin contador global.
  - Test que lo fija: con sobre abierto, `overflow` vuelve al valor previo al cerrar el visor. Si en el futuro se pudiera abrir el visor con el sobre cerrado, hace falta un contador de bloqueos compartido.
- Botones del visor:
  - Afuera y Adentro: grupo con `aria-pressed` sobre la vista activa.
  - Sin techo / Con techo: toggle con `aria-pressed` y texto que cambia, como en el v6.
  - Todos con un área táctil de al menos 44 px.
- El canvas lleva `touch-action: none` (así los gestos no hacen scroll ni zoom de página), `aria-hidden` y un texto visible de ayuda: "Girar: arrastrá · Zoom: pellizcá · Mover: dos dedos".
- **Botón atrás de Android** (decisión del diseño, a revisar): al abrir, `history.pushState`, y `popstate` cierra el visor. Si no, "atrás" saca al usuario de la tarjeta. Queda a criterio del builder si complica el flujo.
- **Reduced motion:** el v6 salta de vista sin animar, y así queda por defecto. Si el builder agrega transiciones de cámara o un fundido de apertura, respetan `useShouldAnimate()` / `MotionConfig reducedMotion="user"` (salto instantáneo con reduced motion). Nada de rotación automática.

### Fallbacks y errores

- **Sin WebGL:** `hasWebGL()` corre antes de bajar three (crea un canvas y pide `webgl2` o `webgl`). Si falla, el overlay muestra "Tu dispositivo no puede mostrar el recorrido 3D" con el botón Cerrar. No se descarga nada.
- **Falla la descarga del chunk** (red móvil) o tira error el build de la escena: mensaje con **Reintentar** y Cerrar, nunca pantalla en blanco.
- **Contexto WebGL perdido** (`webglcontextlost`): mismo mensaje de error con Reintentar.
- **Cargando:** indicador dentro del overlay mientras baja el chunk y se arman texturas y PMREM.

## 9. Cámara: libre pero sin perderse

El v6 usa `OrbitControls` con `maxPolarAngle = 0.495π` (no baja del piso), `minDistance = 0.3`, `maxDistance = 90` y `zoomToCursor = true`. Se mantiene, y se suma (decisión del diseño, a revisar):

- **Límite del target**: en cada `change`, el `controls.target` se recorta a la caja del lote (≈ x ±25, z −28…+16, y 0…8, derivada de `layout.ts`). Así el pan no se lleva la escena fuera de cuadro.
- **Afuera y Adentro siempre visibles**: son el "volver a casa" de un toque.
- Atravesar paredes con zoom se acepta: es como el usuario "entra" con la cámara libre. Las colisiones son no-objetivo.

## 10. Presupuesto de rendimiento

Objetivo: girar sin tirones en un Android de gama media y **cero trabajo de GPU con la escena quieta**.

| Tema | v6 | Final |
|---|---|---|
| Bundle inicial | n/a | **0 bytes de three** antes del toque. Se verifica en e2e (§11) |
| Pixel ratio | `min(dpr, 2)` | `min(dpr, 1.5)` en mobile (`pointer: coarse` o ancho < 768), `min(dpr, 2)` en desktop (decisión del diseño, a revisar) |
| Shadow map | 2048² `PCFSoftShadowMap` | **1024²** en mobile, 2048² en desktop |
| Render | on demand (`controls.change`) | Igual: **sin loop `requestAnimationFrame` permanente**. Solo se renderiza en `change`, resize, cambio de vista o de techo. Con damping activado, loop solo mientras dure el damping |
| Draw calls | ~cientos de meshes (≈120 solo en sillas) | Sillas y patas de mesa con `InstancedMesh` (las bombitas de la guirnalda ya lo usan), o `mergeGeometries` por material. Meta: menos de ~150 draw calls; el builder mide con `renderer.info` |
| Texturas | canvas 128–256 px | Igual (son baratas). `anisotropy` limitada a `min(4, capabilities.getMaxAnisotropy())` |
| Luces | 1 direccional con sombra + 5 point + hemisférica | Igual; las point lights sin sombra |
| Al cerrar | n/a | `dispose()` completo: geometrías, materiales, texturas, env map del PMREM, `PMREMGenerator`, `OrbitControls`, `ResizeObserver`, listeners, `renderer.dispose()` + `forceContextLoss()`, y quitar el canvas. Reabrir reconstruye la escena; el chunk JS queda en caché |

El peso del chunk de three se **mide en el build** (sin número fijo acá); se reporta en el PR. Los elementos que se sumen después entran en el mismo presupuesto de draw calls.

## 11. Testing

WebGL no corre en jsdom, y el canvas 2D de jsdom tampoco dibuja sin el paquete `canvas`. Por eso lo que se testea en unit es la lógica pura y el componente con la escena mockeada; la escena real se prueba en e2e.

**Unit (Vitest + jsdom, `src/**/*.test.ts(x)`):**

- `layout.ts`:
  - las coordenadas derivadas de los offsets reproducen los absolutos del v6 (tabla §6.2);
  - los 3 ventanales cubren ≈20 m con 2 pilares;
  - las ventanas del frente quedan 1 a la izquierda y 3 a la derecha de la puerta;
  - el caño queda sobre el hogar;
  - el anexo llega al borde del techo de la galería;
  - **anclaje:** al cambiar `L` o `W`, los elementos anclados a una pared se mueven con esa pared y conservan su offset (p. ej. alargar `L` corre el hogar y sus ventanas con el hastial derecho; las ventanas del frente mantienen su distancia a la esquina de referencia).
- `elements`: cada `id` de `ELEMENTS` es único; `build()` de la escena agrega todo lo registrado (con un builder falso registrado de prueba, sin tocar los demás).
- `registry`: toda `venue.tour.scene` en `venues.ts` tiene escena registrada; `barbatos` tiene `tour`, `salon-ejemplo` y `salon-minimo` no.
- `venues`: `barbatos` es el primero del array.
- `VenueCard` / `Hero`: muestra "Recorrer el salón" junto al WhatsApp solo si `venue.tour` existe (en la línea de `sections.test.tsx`).
- `TourOverlay` / `TourLauncher` con `vi.mock` del registro (un `TourController` falso):
  - se abre al tocar y el foco va a Cerrar;
  - Escape y Cerrar cierran, y el foco vuelve al botón;
  - `body.style.overflow` se fija y se restaura al valor previo;
  - la raíz del portal lleva las variables de tema;
  - Afuera, Adentro y Sin techo llaman a `setView` / `setRoofVisible`, y `aria-pressed` refleja el estado;
  - `dispose()` se llama al cerrar y al desmontar;
  - con `hasWebGL()` en false aparece el fallback y **no** se llama al loader;
  - con el loader rechazado aparece Reintentar.

**E2E (Playwright, proyecto `mobile-chrome` / Pixel 7; Chromium headless tiene WebGL por software):**

- La raíz redirige a **`/barbatos`** (se actualiza `e2e/smoke.spec.ts`). `/barbatos` responde 200 con el h1 "Barbato's". `/salon-ejemplo` y `/salon-minimo` siguen respondiendo.
- Todos los e2e de `/barbatos` **abren el sobre primero** y recién después tocan "Recorrer el salón".
- **Carga diferida:** escuchando `page.on("request")`, ningún chunk de three se pide antes del tap y sí después. El builder define cómo reconocer ese chunk con Turbopack (por ejemplo, por su contenido o su tamaño).
- Abrir sobre → tap en "Recorrer el salón" → aparece el diálogo con un `canvas`; Afuera, Adentro y Sin techo responden; Cerrar y Escape vuelven a la página con scroll funcionando y foco en el botón.
- **Sin WebGL:** un `addInitScript` que hace que `getContext("webgl"/"webgl2")` devuelva `null` → mensaje de fallback.
- `reducedMotion: "reduce"` → el visor abre y los botones funcionan.
- Opcional: screenshot de la vista Afuera como referencia visual (sin comparación estricta de píxeles: varía por GPU).

**Build:** el cambio toca `'use client'`, `next/dynamic` y `app/`, así que **siempre `npm run build`** (Vitest no compila con Turbopack).

## 12. Qué queda a criterio del builder

- Estructura interna de `primitives.ts` y de cada builder de `elements/`, mientras la geometría resultante sea la del v6.
- Cómo se nombran las paredes/esquinas de referencia en `dimensions.ts`.
- Instancing contra merge de geometrías para bajar draw calls.
- Si las vistas se animan (con reduced motion, siempre salto instantáneo) y si se activa el damping de `OrbitControls`.
- Diseño visual del overlay, del botón en el hero junto al WhatsApp (tokens de `globals.css`, `--venue-primary` / `--venue-accent`), del indicador de carga y del texto de ayuda.
- Qué foto va de hero, el orden de la galería y el recorte de la OG.
- El manejo del botón atrás (§8).
- Detalles de calidad: antialias, `toneMappingExposure`, resolución de texturas, siempre que se mantenga el estilo C aprobado.
- Granularidad de commits (convencionales, sin atribución de IA).

## 13. Decisiones del diseño (a revisar)

1. Campo `tour?: { scene: TourSceneId }` en `Venue` + registro de escenas; la geometría vive en código, no en `venues.ts`.
2. Slug `barbatos` (sin apóstrofo en la URL).
3. **Botón en el hero:** se interpreta "junto al WhatsApp" como **un único lanzador en el CTA del hero, sin sección propia** (se descarta la sección después de la galería). **Interpretación a confirmar por el usuario.**
4. three.js aislado en `src/tour/` (sin React) detrás de `TourController`; regla de lint que prohíbe importar `three` fuera de ahí.
5. `next/dynamic({ ssr: false })` en `TourLauncher` (cliente) + `import()` de la escena en `TourOverlay`.
6. `three` y `@types/three` con versión exacta, estable vigente al instalar.
7. Overlay con `createPortal` a `document.body`, re-aplicando `themeToCssVars` en su raíz.
8. Bloqueos de scroll anidados (CardShell → overlay), cada uno restaura su valor previo; válido porque el overlay solo se abre con el sobre abierto.
9. **Modelo de medidas por offsets desde paredes** (`dimensions.ts`) con coordenadas derivadas en `layout.ts`; conversión de los absolutos del v6 preservando el resultado visual.
10. **Escena extensible:** un builder por elemento/conjunto en `elements/`, registrado en `ELEMENTS`; agregar uno no toca los demás.
11. Botón atrás de Android cierra el visor (`pushState`/`popstate`).
12. Límite del target de cámara a la caja del lote, además de los límites del v6.
13. Calidad por dispositivo: pixel ratio 1,5 y shadow map 1024 en mobile; 2 y 2048 en desktop.
14. Render on demand sin loop permanente; instancing de sillas y mesas; `dispose()` completo al cerrar.
15. Fotos originales versionadas en `docs/`, versiones web derivadas en `public/venues/barbatos/`.

## 14. Preguntas abiertas

Resueltas por el usuario (ver §5): portada y orden de `venues`, sobre, fotos, ubicación del botón, nombre, versionado del prototipo.

Siguen abiertas, sin bloquear esta entrega:

- **Color de la chapa del techo:** sigue `#3b4f66`; el usuario no conoce el tono. Se corrige cuando haya referencia.
- **Medidas láser:** sin fecha. Mientras tanto todo queda estimado en `dimensions.ts`.
- **Elementos faltantes:** el usuario los trae con fotos y medidas; entran como builders nuevos (§8.1).
- **Contenido real** (textos, WhatsApp, dirección, colores del tema): placeholders hasta que llegue.
- **Confirmar la interpretación del botón** (decisión 3 de §13).
