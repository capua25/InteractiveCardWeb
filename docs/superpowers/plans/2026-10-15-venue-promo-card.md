# Tarjeta promocional para salón de eventos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una tarjeta web interactiva, mobile-first, que promocione un salón de eventos (sobre animado opcional, hero, secciones opcionales, galería con lightbox, mapa, CTA) y lleve al visitante a WhatsApp con un mensaje pre-armado, con preview Open Graph correcta al compartir el link.

**Architecture:** Next.js App Router con SSG: `src/app/[slug]/page.tsx` genera una página estática por salón a partir de un repository (`src/domain/venue-repository.ts`), que es el único que conoce `src/content/venues.ts`. Los componentes son "tontos": reciben datos del tipo `Venue`, nunca lo importan del contenido. La frontera cliente es mínima: `CardShell` (`'use client'`) maneja el estado abierto/cerrado del sobre y el botón flotante, y recibe las secciones renderizadas en el server como `children`; además solo son cliente `Envelope`, `Gallery` y `ScrollReveal`.

**Tech Stack:** Next.js 16.4.2 (App Router, Turbopack), React 19.3.0, TypeScript 5, Tailwind CSS 4, Motion 14.3.0 (`motion/react`), Vitest 5 + Testing Library + jsdom, Playwright 1.64.1, deploy en Vercel.

**Spec:** docs/superpowers/specs/2026-10-15-venue-promo-card-design.md

## Global Constraints

- Uso principal en celular: página vertical, mobile-first, carga rápida en móvil.
- Preview correcta al pegar el link en WhatsApp (Open Graph): las meta tags OG tienen que venir en el HTML generado en el server o de forma estática.
- El CTA abre WhatsApp con un mensaje pre-armado: `buildWhatsAppLink(phone, message)` → `https://wa.me/<digits>?text=<encoded>`.
- Agregar un salón nuevo solo requiere datos e imágenes, sin tocar componentes.
- Los componentes no conocen al salón, solo reciben datos.
- El repository es el único punto que sabe de dónde vienen los datos.
- `theme` se inyecta como variables CSS en el contenedor de la página.
- El botón flotante de WhatsApp es visible en toda la página una vez abierto el sobre (o desde el inicio si `envelope: false`).
- Todos los botones de WhatsApp (hero, CTA final y flotante) usan el mismo `whatsapp.message`.
- Hero, CTA y footer son siempre obligatorios. Las demás secciones (sobre nosotros, tipos de eventos, galería, servicios, ubicación) son opcionales: si no hay datos, no se renderizan.
- Footer: contacto siempre visible; los íconos de redes se muestran solo si `socials` tiene datos.
- Sin música, sin RSVP, sin countdown.
- El sobre se opera por tap, click o teclado (Enter/Espacio), con rol y label accesibles.
- Se respeta `prefers-reduced-motion` (animaciones reducidas) → `MotionConfig reducedMotion="user"` en `CardShell`.
- Todas las imágenes llevan `alt`.
- El mapa va en un iframe con lazy loading (`loading="lazy"` + `title`).
- Slug inexistente → `notFound()` (respuesta HTTP 404 real).
- Los datos se validan con tipos TS en build: un campo obligatorio faltante hace que no compile. Sin Zod (diferido).
- Datos de ejemplo con placeholder claramente marcado en `venues.ts`.
- Versiones verificadas con `npm view` / instalación real el 2026-10-15 (instalar exactas con `-E`): `next@16.4.2`, `react@19.3.0` y `react-dom@19.3.0` (los que fija create-next-app 16.4.2), `motion@14.3.0`, `tailwindcss@^4` (resuelve 4.3.3) + `@tailwindcss/turbopack@^4` (lo trae el template; NO hay `postcss.config`), `eslint-config-next@16.4.2`, `typescript@^5`, `@types/node@^24` (vitest 5 exige `^22 || >=24`; el `^20` del template rompe con ERESOLVE), `vitest@5.0.5`, `@vitejs/plugin-react@6.1.2` (trae vite 8), `jsdom@30.1.3`, `@testing-library/react@16.3.3`, `@testing-library/dom@10.4.2`, `@testing-library/jest-dom@7.0.1`, `@testing-library/user-event@14.6.8`, `@playwright/test@1.64.1`. Node 24.
- Next 16: `params` en páginas y `generateMetadata` es una `Promise` (usar los tipos globales `PageProps<"/[slug]">` y `LayoutProps<"/">`).
- `next.config.ts` SIN `cacheComponents` ni `partialPrefetching` (el template los activa): con Cache Components un slug inexistente responde 200 en vez de 404 y `dynamicParams` no está disponible. Verificado en prototipo.
- La imagen OG es PNG 1200×630 (WhatsApp no muestra SVG en previews). Las demás imágenes placeholder son SVG locales en `public/venues/<slug>/` (next/image las sirve sin optimizar automáticamente). Sin hosts de imágenes externos.
- `fontHeading` es un string CSS `font-family`. El layout carga una sola fuente con `next/font/google` (Playfair Display, variable `--font-playfair`), que los salones pueden usar como `"var(--font-playfair), Georgia, serif"`.
- Regla del usuario: toda tarea que toque `src/app/` o agregue `'use client'`/`'use server'` corre `npm run build` y espera éxito.
- Commits con conventional commits, sin `Co-Authored-By` ni atribución a IA.

## Review Focus

1. Teléfono cargado con `+`, espacios, guiones y paréntesis (`"+54 9 (11) 1234-5678"`) → el link queda `https://wa.me/5491112345678?...` (solo dígitos). Test en Task 1.
2. Mensaje con acentos, emojis, `&`, `?`, `#` y salto de línea → se codifica con `encodeURIComponent`, el link no tiene hash y `searchParams.get("text")` devuelve el mensaje idéntico. Test en Task 1.
3. Salón con solo los campos obligatorios (sin `about`, `eventTypes`, `gallery`, `services`, `location`, `socials`, `logo`) → renderiza hero, CTA y footer sin romper y sin secciones opcionales ni nav de redes. Tests en Task 7 (unit) y Task 8 (e2e `salon-minimo`).
4. Slug inexistente (`/no-existe`) → status HTTP 404 con la página `not-found` (no 200: ver `cacheComponents` en Global Constraints). Test e2e en Task 8.
5. `envelope: false` → no hay sobre, el contenido es accesible y el botón flotante de WhatsApp es visible desde el primer render. Tests en Task 4 (unit `CardShell`) y Task 8 (e2e).

---

### Task 1: Scaffolding del proyecto, tooling de tests y `buildWhatsAppLink`

**Files:**
- Create (scaffold): `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.gitignore`, `AGENTS.md`, `README.md`, `next-env.d.ts`, `public/*`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/favicon.ico`
- Modify: `next.config.ts`, `src/app/globals.css`, `.gitignore`, `package.json`
- Create: `vitest.config.mts`, `vitest.setup.ts`, `playwright.config.ts`, `src/lib/whatsapp.ts`
- Test: `src/lib/whatsapp.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `buildWhatsAppLink(phone: string, message: string): string` en `@/lib/whatsapp` → `https://wa.me/<solo dígitos de phone>?text=<encodeURIComponent(message)>`; tira `Error('Número de WhatsApp inválido: "<phone>"')` si `phone` no tiene dígitos.
  - Utilidades Tailwind del theme: `bg-primary`, `text-primary`, `border-primary`, `bg-accent`, `text-accent`, `outline-accent`, `font-heading` (mapeadas a las variables CSS `--venue-primary`, `--venue-accent`, `--venue-font-heading`).
  - Scripts npm: `dev`, `build`, `start`, `lint`, `test` (`vitest run`), `test:watch`, `test:e2e` (`playwright test`).
  - Alias de imports `@/*` → `src/*` (en Next y en Vitest).
  - Setup global de Vitest con matchers de jest-dom, `cleanup` y stub de `IntersectionObserver`.

- [ ] **Step 0: Scaffold con create-next-app**

`create-next-app .` dentro de `/home/capua25/workspace/InteractiveCardWeb` FALLA (verificado): el nombre del directorio tiene mayúsculas y npm no lo acepta como nombre de paquete. Por eso se scaffoldea en un directorio temporal con nombre en minúsculas y se copian los archivos (sin `.git`, sin pisar `docs/`):

```bash
SCAFFOLD_DIR="$(mktemp -d)"
cd "$SCAFFOLD_DIR" && npx -y create-next-app@16.4.2 interactivecardweb \
  --ts --app --tailwind --eslint --src-dir --import-alias "@/*" \
  --use-npm --skip-install --disable-git --yes
rsync -a "$SCAFFOLD_DIR/interactivecardweb/" /home/capua25/workspace/InteractiveCardWeb/
rm -rf "$SCAFFOLD_DIR"
cd /home/capua25/workspace/InteractiveCardWeb && ls -a
```

Expected: aparecen `AGENTS.md README.md eslint.config.mjs next-env.d.ts next.config.ts package.json public src tsconfig.json .gitignore` junto a `docs/` y `.git/` (intactos). Verificar que `package.json` tenga `"name": "interactivecardweb"` y NO tenga `babel-plugin-react-compiler`.

- [ ] **Step 0b: Ajustar `next.config.ts`** (quitar `cacheComponents` y `partialPrefetching`; mantener el loader de Tailwind para Turbopack)

Reemplazar todo el contenido de `next.config.ts`:

```ts
import type { NextConfig } from "next";

// Sin cacheComponents/partialPrefetching: con Cache Components un slug
// inexistente responde 200 (streaming) en vez de 404 y no existe dynamicParams.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
```

- [ ] **Step 0c: Instalar dependencias exactas y browsers de Playwright**

```bash
cd /home/capua25/workspace/InteractiveCardWeb
npm install
npm install -E motion@14.3.0
npm install -D -E @types/node@24.19.2 vitest@5.0.5 @vitejs/plugin-react@6.1.2 jsdom@30.1.3 \
  @testing-library/react@16.3.3 @testing-library/dom@10.4.2 @testing-library/jest-dom@7.0.1 \
  @testing-library/user-event@14.6.8 @playwright/test@1.64.1
npx playwright install chromium
npm pkg set scripts.test="vitest run" scripts.test:watch="vitest" scripts.test:e2e="playwright test"
```

Expected: sin errores `ERESOLVE` (si aparece, es porque `@types/node` quedó en `^20`).

- [ ] **Step 0d: Configurar Vitest, Playwright, CSS del theme y `.gitignore`**

`vitest.config.mts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
```

`vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom no implementa IntersectionObserver; Motion lo usa para whileInView.
class IntersectionObserverStub implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly scrollMargin = "0px";
  readonly thresholds = [0];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
globalThis.IntersectionObserver ??= IntersectionObserverStub;

afterEach(() => cleanup());
```

`playwright.config.ts` (los tests e2e llegan en la Task 8):

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3100" },
  projects: [{ name: "mobile-chrome", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: "npm run build && npm run start -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

Reemplazar todo `src/app/globals.css`:

```css
@import "tailwindcss";

/* Valores por defecto; cada salón los pisa con themeToCssVars() en su contenedor. */
:root {
  --venue-primary: #7a1f3d;
  --venue-accent: #d4a373;
  --venue-font-heading: Georgia, serif;
}

@theme inline {
  --color-primary: var(--venue-primary);
  --color-accent: var(--venue-accent);
  --font-heading: var(--venue-font-heading);
}

body {
  background: #fffaf5;
  color: #262626;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
```

Agregar al final de `.gitignore`:

```bash
cat >> .gitignore <<'EOF'

# playwright
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
EOF
```

- [ ] **Step 1: Write the failing test** — `src/lib/whatsapp.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { buildWhatsAppLink } from "@/lib/whatsapp";

describe("buildWhatsAppLink", () => {
  it("arma el link wa.me con el teléfono y el mensaje", () => {
    expect(buildWhatsAppLink("5491112345678", "Hola")).toBe(
      "https://wa.me/5491112345678?text=Hola",
    );
  });

  // Review Focus 1
  it("deja solo dígitos cuando el teléfono trae +, espacios, guiones y paréntesis", () => {
    expect(buildWhatsAppLink("+54 9 (11) 1234-5678", "Hola")).toBe(
      "https://wa.me/5491112345678?text=Hola",
    );
  });

  // Review Focus 2
  it("codifica acentos, emojis, &, ?, # y saltos de línea sin perder información", () => {
    const message = "¿Hola! Quiero info de cumpleaños & casamientos 🎉 #2027\nGracias";
    const link = buildWhatsAppLink("5491112345678", message);
    const url = new URL(link);

    expect(link).toBe(`https://wa.me/5491112345678?text=${encodeURIComponent(message)}`);
    expect(url.hash).toBe("");
    expect([...url.searchParams.keys()]).toEqual(["text"]);
    expect(url.searchParams.get("text")).toBe(message);
  });

  it("falla si el teléfono no tiene ningún dígito", () => {
    expect(() => buildWhatsAppLink("sin número", "Hola")).toThrow(
      'Número de WhatsApp inválido: "sin número"',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/whatsapp.test.ts`
Expected: FAIL con `Failed to resolve import "@/lib/whatsapp"`.

- [ ] **Step 3: Write minimal implementation** — `src/lib/whatsapp.ts`

```ts
const WHATSAPP_BASE_URL = "https://wa.me/";

export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) {
    throw new Error(`Número de WhatsApp inválido: "${phone}"`);
  }
  return `${WHATSAPP_BASE_URL}${digits}?text=${encodeURIComponent(message)}`;
}
```

- [ ] **Step 4: Run test to verify it passes, then lint and build**

Run: `npm test -- src/lib/whatsapp.test.ts` → Expected: 4 passed.
Run: `npm run lint` → Expected: sin errores.
Run: `npm run build` → Expected: `✓ Compiled successfully` y en la tabla de rutas NO aparece `Cache Components enabled`.

- [ ] **Step 5: Commit**

```bash
git add .gitignore AGENTS.md README.md eslint.config.mjs next.config.ts package.json package-lock.json tsconfig.json public src vitest.config.mts vitest.setup.ts playwright.config.ts
git commit -m "feat: scaffold next app with test tooling and whatsapp link builder"
```

---

### Task 2: Contrato `Venue`, contenido de ejemplo, repository e imágenes placeholder

**Files:**
- Create: `src/domain/venue.ts`, `src/content/venues.ts`, `src/domain/venue-repository.ts`, `scripts/make-og-placeholder.mjs`
- Create (assets): `public/venues/salon-ejemplo/{hero,logo,gallery-1,gallery-2,gallery-3}.svg`, `public/venues/salon-ejemplo/og.png`, `public/venues/salon-minimo/hero.svg`, `public/venues/salon-minimo/og.png`
- Test: `src/domain/venue-repository.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces (en `@/domain/venue`): tipos `Venue`, `VenueTheme`, `EventType`, `GalleryImage`, `VenueServices`, `VenueLocation`, `VenueSocials` (definición completa abajo; `logo?: string` es opcional y lo usa el sobre).
- Produces (en `@/content/venues`): `venues: Venue[]` con `salon-ejemplo` (todos los campos, `envelope: true`, teléfono `"+54 9 11 0000-0000"`, mensaje `"¡Hola! Vi la tarjeta del salón y quiero consultar por un evento 🎉"`) y `salon-minimo` (solo obligatorios, `envelope: false`).
- Produces (en `@/domain/venue-repository`): `type VenueRepository = { getVenueBySlug(slug: string): Venue | undefined; getAllSlugs(): string[] }`, `createVenueRepository(source: readonly Venue[]): VenueRepository`, y las funciones ligadas al contenido real `getVenueBySlug(slug: string): Venue | undefined` y `getAllSlugs(): string[]`.

- [ ] **Step 1: Write the failing test** — `src/domain/venue-repository.test.ts`

```ts
import { describe, expect, it } from "vitest";
import type { Venue } from "@/domain/venue";
import {
  createVenueRepository,
  getAllSlugs,
  getVenueBySlug,
} from "@/domain/venue-repository";

const baseVenue: Venue = {
  slug: "uno",
  name: "Salón Uno",
  tagline: "Eslogan",
  theme: { primary: "#000000", accent: "#ffffff", fontHeading: "serif" },
  envelope: true,
  whatsapp: { phone: "5491100000000", message: "Hola" },
  hero: { image: "/venues/uno/hero.svg" },
  seo: { title: "Salón Uno", description: "Desc", ogImage: "/venues/uno/og.png" },
};

describe("createVenueRepository", () => {
  const repo = createVenueRepository([baseVenue, { ...baseVenue, slug: "dos", name: "Salón Dos" }]);

  it("devuelve el salón cuando el slug existe", () => {
    expect(repo.getVenueBySlug("dos")?.name).toBe("Salón Dos");
  });

  it("devuelve undefined cuando el slug no existe", () => {
    expect(repo.getVenueBySlug("no-existe")).toBeUndefined();
  });

  it("lista todos los slugs en orden", () => {
    expect(repo.getAllSlugs()).toEqual(["uno", "dos"]);
  });
});

describe("repositorio con el contenido real", () => {
  it("expone los salones de ejemplo", () => {
    expect(getAllSlugs()).toEqual(["salon-ejemplo", "salon-minimo"]);
    expect(getVenueBySlug("salon-ejemplo")?.envelope).toBe(true);
    expect(getVenueBySlug("salon-minimo")?.envelope).toBe(false);
  });

  it("no repite slugs", () => {
    const slugs = getAllSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/domain/venue-repository.test.ts`
Expected: FAIL con `Failed to resolve import "@/domain/venue"` (o `@/domain/venue-repository`).

- [ ] **Step 3: Write minimal implementation**

`src/domain/venue.ts`:

```ts
export type VenueTheme = {
  primary: string;
  accent: string;
  /** Valor CSS de font-family, p. ej. "var(--font-playfair), Georgia, serif". */
  fontHeading: string;
};

/** `icon` es un emoji (se renderiza decorativo, con aria-hidden). */
export type EventType = { label: string; icon: string };

export type GalleryImage = { src: string; alt: string };

export type VenueServices = { capacity?: number; items: string[] };

export type VenueLocation = {
  address: string;
  mapsUrl: string;
  embedUrl: string;
};

export type VenueSocials = { instagram?: string; facebook?: string };

export type Venue = {
  slug: string;
  name: string;
  tagline: string;
  /** Logo que se muestra en el sobre; si falta, el sobre muestra el nombre. */
  logo?: string;
  theme: VenueTheme;
  envelope: boolean;
  whatsapp: { phone: string; message: string };
  hero: { image: string };
  about?: string;
  eventTypes?: EventType[];
  gallery?: GalleryImage[];
  services?: VenueServices;
  location?: VenueLocation;
  socials?: VenueSocials;
  /** ogImage: PNG/JPG 1200×630 (WhatsApp no muestra SVG). */
  seo: { title: string; description: string; ogImage: string };
};
```

`src/content/venues.ts`:

```ts
import type { Venue } from "@/domain/venue";

// ⚠️ PLACEHOLDER: todos los datos de este archivo son de ejemplo.
// Reemplazarlos por los datos reales del salón (nombre, textos, fotos, logo,
// WhatsApp, dirección, redes y colores) antes de publicar.
export const venues: Venue[] = [
  {
    slug: "salon-ejemplo",
    name: "Salón Ejemplo (PLACEHOLDER)",
    tagline: "Tu evento, como lo soñaste (PLACEHOLDER)",
    logo: "/venues/salon-ejemplo/logo.svg",
    theme: {
      primary: "#7a1f3d",
      accent: "#d4a373",
      fontHeading: "var(--font-playfair), Georgia, serif",
    },
    envelope: true,
    whatsapp: {
      phone: "+54 9 11 0000-0000",
      message: "¡Hola! Vi la tarjeta del salón y quiero consultar por un evento 🎉",
    },
    hero: { image: "/venues/salon-ejemplo/hero.svg" },
    about:
      "PLACEHOLDER — Somos un salón familiar con más de 20 años organizando cumpleaños, casamientos y eventos corporativos.",
    eventTypes: [
      { label: "Casamientos", icon: "💍" },
      { label: "Cumpleaños de 15", icon: "👑" },
      { label: "Infantiles", icon: "🎈" },
      { label: "Corporativos", icon: "💼" },
    ],
    gallery: [
      { src: "/venues/salon-ejemplo/gallery-1.svg", alt: "Salón principal decorado (placeholder)" },
      { src: "/venues/salon-ejemplo/gallery-2.svg", alt: "Mesa de dulces (placeholder)" },
      { src: "/venues/salon-ejemplo/gallery-3.svg", alt: "Pista de baile (placeholder)" },
    ],
    services: {
      capacity: 200,
      items: ["Catering propio", "DJ e iluminación", "Ambientación", "Estacionamiento"],
    },
    location: {
      address: "Av. Siempreviva 742, Buenos Aires (PLACEHOLDER)",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Obelisco+Buenos+Aires",
      embedUrl: "https://www.google.com/maps?q=Obelisco+Buenos+Aires&output=embed",
    },
    socials: {
      instagram: "https://www.instagram.com/",
      facebook: "https://www.facebook.com/",
    },
    seo: {
      title: "Salón Ejemplo — Eventos (PLACEHOLDER)",
      description: "Consultá por tu evento en Salón Ejemplo. (PLACEHOLDER)",
      ogImage: "/venues/salon-ejemplo/og.png",
    },
  },
  {
    // PLACEHOLDER: salón mínimo, solo campos obligatorios y sin sobre.
    slug: "salon-minimo",
    name: "Salón Mínimo (PLACEHOLDER)",
    tagline: "Solo lo esencial (PLACEHOLDER)",
    theme: {
      primary: "#1d3557",
      accent: "#e9c46a",
      fontHeading: "Georgia, serif",
    },
    envelope: false,
    whatsapp: { phone: "5491100000001", message: "Hola, quiero consultar por una fecha" },
    hero: { image: "/venues/salon-minimo/hero.svg" },
    seo: {
      title: "Salón Mínimo (PLACEHOLDER)",
      description: "Salón de ejemplo con solo los datos obligatorios. (PLACEHOLDER)",
      ogImage: "/venues/salon-minimo/og.png",
    },
  },
];
```

`src/domain/venue-repository.ts`:

```ts
import { venues } from "@/content/venues";
import type { Venue } from "@/domain/venue";

export type VenueRepository = {
  getVenueBySlug: (slug: string) => Venue | undefined;
  getAllSlugs: () => string[];
};

// Único punto que sabe de dónde vienen los datos. En la fase con base de datos
// se reemplaza la fuente sin tocar páginas ni componentes.
export function createVenueRepository(source: readonly Venue[]): VenueRepository {
  return {
    getVenueBySlug: (slug) => source.find((venue) => venue.slug === slug),
    getAllSlugs: () => source.map((venue) => venue.slug),
  };
}

const repository = createVenueRepository(venues);

export const getVenueBySlug = repository.getVenueBySlug;
export const getAllSlugs = repository.getAllSlugs;
```

`scripts/make-og-placeholder.mjs` (genera un PNG liso 1200×630 sin dependencias):

```js
// Genera un PNG liso 1200x630 (placeholder de imagen Open Graph).
// Uso: node scripts/make-og-placeholder.mjs <salida.png> <hex-color-sin-#>
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { deflateSync } from "node:zlib";

const [out, hex = "7a1f3d"] = process.argv.slice(2);
if (!out) throw new Error("Uso: node scripts/make-og-placeholder.mjs <salida.png> <hex-color>");
const width = 1200;
const height = 630;
const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type RGB
const row = Buffer.alloc(1 + width * 3);
for (let x = 0; x < width; x++) row.set([r, g, b], 1 + x * 3);
const raw = Buffer.concat(Array.from({ length: height }, () => row));

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`OK ${out} (${png.length} bytes)`);
```

Assets placeholder (correr desde la raíz del repo):

```bash
mkdir -p public/venues/salon-ejemplo public/venues/salon-minimo
cat > public/venues/salon-ejemplo/hero.svg <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="100%" height="100%" fill="#7a1f3d"/><text x="50%" y="50%" fill="#f6e7d8" font-family="Georgia, serif" font-size="48" text-anchor="middle" dominant-baseline="middle">Foto principal (placeholder)</text></svg>
EOF
cat > public/venues/salon-ejemplo/gallery-1.svg <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="100%" height="100%" fill="#a33b5c"/><text x="50%" y="50%" fill="#ffffff" font-family="Georgia, serif" font-size="48" text-anchor="middle" dominant-baseline="middle">Galería 1 (placeholder)</text></svg>
EOF
cat > public/venues/salon-ejemplo/gallery-2.svg <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="100%" height="100%" fill="#d4a373"/><text x="50%" y="50%" fill="#3d0f1f" font-family="Georgia, serif" font-size="48" text-anchor="middle" dominant-baseline="middle">Galería 2 (placeholder)</text></svg>
EOF
cat > public/venues/salon-ejemplo/gallery-3.svg <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="100%" height="100%" fill="#5c162e"/><text x="50%" y="50%" fill="#f6e7d8" font-family="Georgia, serif" font-size="48" text-anchor="middle" dominant-baseline="middle">Galería 3 (placeholder)</text></svg>
EOF
cat > public/venues/salon-ejemplo/logo.svg <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="96" fill="#7a1f3d" stroke="#d4a373" stroke-width="8"/><text x="100" y="100" fill="#d4a373" font-family="Georgia, serif" font-size="72" text-anchor="middle" dominant-baseline="central">SE</text></svg>
EOF
cat > public/venues/salon-minimo/hero.svg <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="100%" height="100%" fill="#1d3557"/><text x="50%" y="50%" fill="#e9c46a" font-family="Georgia, serif" font-size="48" text-anchor="middle" dominant-baseline="middle">Foto principal (placeholder)</text></svg>
EOF
node scripts/make-og-placeholder.mjs public/venues/salon-ejemplo/og.png 7a1f3d
node scripts/make-og-placeholder.mjs public/venues/salon-minimo/og.png 1d3557
file public/venues/salon-ejemplo/og.png
```

Expected: `PNG image data, 1200 x 630, 8-bit/color RGB, non-interlaced`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/domain/venue-repository.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/domain src/content scripts public/venues
git commit -m "feat: add venue contract, placeholder content and repository"
```

---

### Task 3: `WhatsAppButton` (inline y flotante)

**Files:**
- Create: `src/components/whatsapp-button/WhatsAppButton.tsx`
- Test: `src/components/whatsapp-button/WhatsAppButton.test.tsx`

**Interfaces:**
- Consumes: un `href` ya construido con `buildWhatsAppLink` (Task 1); el botón NO arma el link (así todos comparten el mismo).
- Produces: `WhatsAppButton(props: { href: string; label?: string; variant?: "inline" | "floating" }): JSX.Element` en `@/components/whatsapp-button/WhatsAppButton`. Renderiza `<a target="_blank" rel="noopener noreferrer" aria-label={label}>`. `label` por defecto `"Consultanos por WhatsApp"`. La variante `"floating"` es `position: fixed` abajo a la derecha, solo ícono, y lleva `data-testid="whatsapp-floating"`.

- [ ] **Step 1: Write the failing test** — `src/components/whatsapp-button/WhatsAppButton.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WhatsAppButton } from "@/components/whatsapp-button/WhatsAppButton";

const href = "https://wa.me/5491100000000?text=Hola";

describe("WhatsAppButton", () => {
  it("renderiza un link a WhatsApp que abre en otra pestaña", () => {
    render(<WhatsAppButton href={href} />);
    const link = screen.getByRole("link", { name: "Consultanos por WhatsApp" });
    expect(link).toHaveAttribute("href", href);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("la variante flotante mantiene el label accesible aunque no muestre texto", () => {
    render(<WhatsAppButton href={href} variant="floating" label="Escribinos" />);
    const link = screen.getByRole("link", { name: "Escribinos" });
    expect(link).toHaveAttribute("data-testid", "whatsapp-floating");
    expect(link).not.toHaveTextContent("Escribinos");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/whatsapp-button`
Expected: FAIL con `Failed to resolve import "@/components/whatsapp-button/WhatsAppButton"`.

- [ ] **Step 3: Write minimal implementation** — `src/components/whatsapp-button/WhatsAppButton.tsx`

```tsx
type WhatsAppButtonProps = {
  href: string;
  label?: string;
  variant?: "inline" | "floating";
};

const variantClasses = {
  inline:
    "inline-flex items-center justify-center gap-2 rounded-full bg-[#25d366] px-6 py-3 text-base font-semibold text-white shadow-md transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25d366]",
  floating:
    "fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25d366]",
} as const;

export function WhatsAppButton({
  href,
  label = "Consultanos por WhatsApp",
  variant = "inline",
}: WhatsAppButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      data-testid={variant === "floating" ? "whatsapp-floating" : undefined}
      className={variantClasses[variant]}
    >
      <WhatsAppIcon />
      {variant === "inline" ? <span>{label}</span> : null}
    </a>
  );
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z" />
    </svg>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/whatsapp-button`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/whatsapp-button
git commit -m "feat: add whatsapp button with inline and floating variants"
```

---

### Task 4: Sobre (`Envelope`) y `CardShell` (frontera cliente, botón flotante, reduced motion)

**Files:**
- Create: `src/components/envelope/Envelope.tsx`, `src/components/card-shell/CardShell.tsx`
- Test: `src/components/envelope/Envelope.test.tsx`, `src/components/card-shell/CardShell.test.tsx`

**Interfaces:**
- Consumes: `WhatsAppButton({ href, label?, variant? })` de `@/components/whatsapp-button/WhatsAppButton` (Task 3); utilidades `bg-primary`, `text-primary`, `bg-accent`, `outline-accent`, `font-heading` (Task 1).
- Produces:
  - `Envelope(props: { venueName: string; logo?: string; onOpen: () => void }): JSX.Element` (`'use client'`) en `@/components/envelope/Envelope`. Overlay fijo a pantalla completa con un `<button>` nativo (Enter/Espacio gratis) con `aria-label="Abrir la invitación de <venueName>"`, la leyenda `"tocá para abrir"`, el logo (`alt="Logo de <venueName>"`) o el nombre si no hay logo. Animaciones de salida (solapa que rota + fade) vía `exit` de Motion.
  - `CardShell(props: { envelope: boolean; venueName: string; logo?: string; whatsappHref: string; children: ReactNode }): JSX.Element` (`'use client'`) en `@/components/card-shell/CardShell`. Estado `opened` inicial `!envelope`. Envuelve todo en `<MotionConfig reducedMotion="user">`. Mientras está cerrado, el contenido (`children`, renderizado en el server) queda en el DOM pero con `aria-hidden` + `inert` (`data-testid="card-content"`). El botón flotante (`WhatsAppButton variant="floating"`) se renderiza solo cuando `opened`.

- [ ] **Step 1: Write the failing tests**

`src/components/envelope/Envelope.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Envelope } from "@/components/envelope/Envelope";

describe("Envelope", () => {
  it("muestra la leyenda y un botón con label accesible", () => {
    render(<Envelope venueName="Salón X" onOpen={() => {}} />);
    expect(screen.getByRole("button", { name: "Abrir la invitación de Salón X" })).toBeInTheDocument();
    expect(screen.getByText("tocá para abrir")).toBeInTheDocument();
  });

  it("muestra el logo cuando hay uno", () => {
    render(<Envelope venueName="Salón X" logo="/venues/x/logo.svg" onOpen={() => {}} />);
    expect(screen.getByAltText("Logo de Salón X")).toBeInTheDocument();
  });

  it("llama a onOpen al hacer click", async () => {
    const onOpen = vi.fn();
    render(<Envelope venueName="Salón X" onOpen={onOpen} />);
    await userEvent.click(screen.getByRole("button", { name: /Abrir la invitación/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it.each([["{Enter}"], [" "]])("se abre con el teclado (%s)", async (key) => {
    const onOpen = vi.fn();
    render(<Envelope venueName="Salón X" onOpen={onOpen} />);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: /Abrir la invitación/ })).toHaveFocus();
    await userEvent.keyboard(key);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
```

`src/components/card-shell/CardShell.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CardShell } from "@/components/card-shell/CardShell";

const href = "https://wa.me/5491100000000?text=Hola";

function renderShell(envelope: boolean) {
  return render(
    <CardShell envelope={envelope} venueName="Salón X" whatsappHref={href}>
      <h1>Contenido de la tarjeta</h1>
    </CardShell>,
  );
}

describe("CardShell", () => {
  it("con sobre: oculta el contenido y el botón flotante hasta abrirlo", () => {
    renderShell(true);
    expect(screen.getByRole("button", { name: "Abrir la invitación de Salón X" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Contenido de la tarjeta" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("whatsapp-floating")).not.toBeInTheDocument();
  });

  it("al abrir el sobre muestra el contenido y el botón flotante", async () => {
    renderShell(true);
    await userEvent.click(screen.getByRole("button", { name: "Abrir la invitación de Salón X" }));
    expect(screen.getByRole("heading", { name: "Contenido de la tarjeta" })).toBeInTheDocument();
    expect(screen.getByTestId("whatsapp-floating")).toHaveAttribute("href", href);
  });

  // Review Focus 5
  it("con envelope: false entra directo: sin sobre y con botón flotante desde el inicio", () => {
    renderShell(false);
    expect(screen.queryByRole("button", { name: /Abrir la invitación/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contenido de la tarjeta" })).toBeInTheDocument();
    expect(screen.getByTestId("whatsapp-floating")).toHaveAttribute("href", href);
  });
});
```

Nota: en jsdom Motion deja `opacity: 0` en estilos iniciales; por eso los unit tests usan `toBeInTheDocument` y la visibilidad real se verifica en Playwright (Task 8).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/envelope src/components/card-shell`
Expected: FAIL con `Failed to resolve import "@/components/envelope/Envelope"` y `"@/components/card-shell/CardShell"`.

- [ ] **Step 3: Write minimal implementation**

`src/components/envelope/Envelope.tsx`:

```tsx
"use client";

import Image from "next/image";
import { motion } from "motion/react";

type EnvelopeProps = {
  venueName: string;
  logo?: string;
  onOpen: () => void;
};

export function Envelope({ venueName, logo, onOpen }: EnvelopeProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary p-6"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5, delay: 0.4 } }}
    >
      <motion.button
        type="button"
        onClick={onOpen}
        aria-label={`Abrir la invitación de ${venueName}`}
        className="relative flex aspect-[4/3] w-full max-w-sm flex-col items-center justify-center gap-4 overflow-hidden rounded-lg bg-[#f6e7d8] text-primary shadow-2xl [perspective:800px] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-accent"
        whileTap={{ scale: 0.97 }}
        exit={{ scale: 1.08, transition: { duration: 0.6 } }}
      >
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1/2 origin-top bg-accent [clip-path:polygon(0_0,100%_0,50%_100%)]"
          exit={{ rotateX: 180, transition: { duration: 0.4 } }}
        />
        {logo ? (
          <Image
            src={logo}
            alt={`Logo de ${venueName}`}
            width={96}
            height={96}
            className="relative z-10 rounded-full"
            priority
          />
        ) : (
          <span className="relative z-10 font-heading text-2xl">{venueName}</span>
        )}
        <span className="relative z-10 text-sm uppercase tracking-widest">tocá para abrir</span>
      </motion.button>
    </motion.div>
  );
}
```

`src/components/card-shell/CardShell.tsx`:

```tsx
"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, MotionConfig } from "motion/react";
import { Envelope } from "@/components/envelope/Envelope";
import { WhatsAppButton } from "@/components/whatsapp-button/WhatsAppButton";

type CardShellProps = {
  envelope: boolean;
  venueName: string;
  logo?: string;
  whatsappHref: string;
  children: ReactNode;
};

// Frontera cliente mínima: solo el estado del sobre y el botón flotante.
// `children` llega renderizado desde el server.
export function CardShell({ envelope, venueName, logo, whatsappHref, children }: CardShellProps) {
  const [opened, setOpened] = useState(!envelope);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {!opened ? (
          <Envelope key="envelope" venueName={venueName} logo={logo} onOpen={() => setOpened(true)} />
        ) : null}
      </AnimatePresence>
      <div aria-hidden={!opened} inert={!opened} data-testid="card-content">
        {children}
      </div>
      {opened ? <WhatsAppButton href={whatsappHref} variant="floating" /> : null}
    </MotionConfig>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass, then build**

Run: `npm test -- src/components/envelope src/components/card-shell`
Expected: 8 passed.
Run: `npm run build` (agrega `'use client'`)
Expected: `✓ Compiled successfully` y TypeScript sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/components/envelope src/components/card-shell
git commit -m "feat: add animated envelope and client card shell"
```

---

### Task 5: `ScrollReveal` y secciones server (Hero, About, EventTypes, Services, Location, FinalCta, Footer)

**Files:**
- Create: `src/components/scroll-reveal/ScrollReveal.tsx`, `src/components/hero/Hero.tsx`, `src/components/about/About.tsx`, `src/components/event-types/EventTypes.tsx`, `src/components/services/Services.tsx`, `src/components/location/Location.tsx`, `src/components/cta/FinalCta.tsx`, `src/components/footer/Footer.tsx`
- Test: `src/components/sections.test.tsx`

**Interfaces:**
- Consumes: `WhatsAppButton` (Task 3); tipos `EventType`, `VenueServices`, `VenueLocation`, `VenueSocials` de `@/domain/venue` (Task 2).
- Produces:
  - `ScrollReveal(props: { children: ReactNode })` (`'use client'`): fade + slide-up con `whileInView`, `viewport={{ once: true, amount: 0.2 }}`. Con reduced motion, el `MotionConfig` de `CardShell` anula el desplazamiento.
  - `Hero(props: { name: string; tagline: string; image: string; whatsappHref: string })` → `<header>` con `<h1>{name}</h1>`, imagen `alt="Foto principal de <name>"` y `WhatsAppButton` inline.
  - `About(props: { text: string })` → sección con `<h2>Sobre nosotros</h2>`.
  - `EventTypes(props: { items: EventType[] })` → `<h2>Tipos de eventos</h2>` + lista (ícono emoji con `aria-hidden`).
  - `Services(props: VenueServices)` → `<h2>Servicios y capacidad</h2>`; "Capacidad: hasta N personas" solo si `capacity !== undefined`.
  - `Location(props: VenueLocation)` → `<h2>Ubicación</h2>`, dirección, `<iframe src={embedUrl} title="Mapa de <address>" loading="lazy">` y link "Cómo llegar" a `mapsUrl`.
  - `FinalCta(props: { whatsappHref: string })` → `<h2>¿Hacemos tu evento acá?</h2>` + `WhatsAppButton label="Consultar disponibilidad"`.
  - `Footer(props: { venueName: string; phone: string; whatsappHref: string; address?: string; socials?: VenueSocials })` → `<footer>` con link de WhatsApp cuyo texto es `phone`, dirección si hay, y `<nav aria-label="Redes sociales">` solo si hay al menos una red cargada.

- [ ] **Step 1: Write the failing test** — `src/components/sections.test.tsx`

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "@/components/footer/Footer";
import { Location } from "@/components/location/Location";
import { Services } from "@/components/services/Services";

describe("Location", () => {
  it("embebe el mapa con lazy loading y title, y linkea a Cómo llegar", () => {
    render(
      <Location
        address="Calle Falsa 123"
        mapsUrl="https://maps.example/dir"
        embedUrl="https://maps.example/embed"
      />,
    );
    const map = screen.getByTitle("Mapa de Calle Falsa 123");
    expect(map.tagName).toBe("IFRAME");
    expect(map).toHaveAttribute("loading", "lazy");
    expect(map).toHaveAttribute("src", "https://maps.example/embed");
    expect(screen.getByRole("link", { name: "Cómo llegar" })).toHaveAttribute("href", "https://maps.example/dir");
  });
});

describe("Services", () => {
  it("muestra la capacidad solo si está definida", () => {
    const { rerender } = render(<Services capacity={150} items={["Catering"]} />);
    expect(screen.getByText("hasta 150 personas")).toBeInTheDocument();
    rerender(<Services items={["Catering"]} />);
    expect(screen.queryByText(/Capacidad/)).not.toBeInTheDocument();
    expect(screen.getByText("Catering")).toBeInTheDocument();
  });
});

describe("Footer", () => {
  const base = {
    venueName: "Salón X",
    phone: "+54 9 11 0000-0000",
    whatsappHref: "https://wa.me/5491100000000?text=Hola",
  };

  it("siempre muestra el contacto", () => {
    render(<Footer {...base} />);
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: base.phone })).toHaveAttribute("href", base.whatsappHref);
  });

  it("no muestra redes si socials no tiene datos", () => {
    render(<Footer {...base} socials={{}} />);
    expect(screen.queryByRole("navigation", { name: "Redes sociales" })).not.toBeInTheDocument();
  });

  it("muestra solo las redes cargadas", () => {
    render(<Footer {...base} socials={{ instagram: "https://instagram.com/x" }} />);
    const nav = screen.getByRole("navigation", { name: "Redes sociales" });
    expect(within(nav).getByRole("link", { name: "Instagram" })).toHaveAttribute("href", "https://instagram.com/x");
    expect(within(nav).queryByRole("link", { name: "Facebook" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/sections.test.tsx`
Expected: FAIL con `Failed to resolve import "@/components/footer/Footer"`.

- [ ] **Step 3: Write minimal implementation**

`src/components/scroll-reveal/ScrollReveal.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

export function ScrollReveal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
```

`src/components/hero/Hero.tsx`:

```tsx
import Image from "next/image";
import { WhatsAppButton } from "@/components/whatsapp-button/WhatsAppButton";

type HeroProps = {
  name: string;
  tagline: string;
  image: string;
  whatsappHref: string;
};

export function Hero({ name, tagline, image, whatsappHref }: HeroProps) {
  return (
    <header className="relative flex min-h-[90svh] items-end overflow-hidden">
      <Image src={image} alt={`Foto principal de ${name}`} fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />
      <div className="relative z-10 flex w-full flex-col items-center gap-4 px-6 pb-16 text-center text-white">
        <h1 className="font-heading text-4xl leading-tight sm:text-5xl">{name}</h1>
        <p className="max-w-md text-lg text-white/90">{tagline}</p>
        <WhatsAppButton href={whatsappHref} />
      </div>
    </header>
  );
}
```

`src/components/about/About.tsx`:

```tsx
import { ScrollReveal } from "@/components/scroll-reveal/ScrollReveal";

export function About({ text }: { text: string }) {
  return (
    <section aria-labelledby="about-title" className="px-6 py-16">
      <ScrollReveal>
        <h2 id="about-title" className="mb-4 text-center font-heading text-3xl text-primary">
          Sobre nosotros
        </h2>
        <p className="mx-auto max-w-prose text-center text-lg leading-relaxed">{text}</p>
      </ScrollReveal>
    </section>
  );
}
```

`src/components/event-types/EventTypes.tsx`:

```tsx
import type { EventType } from "@/domain/venue";
import { ScrollReveal } from "@/components/scroll-reveal/ScrollReveal";

export function EventTypes({ items }: { items: EventType[] }) {
  return (
    <section aria-labelledby="event-types-title" className="bg-primary/5 px-6 py-16">
      <ScrollReveal>
        <h2 id="event-types-title" className="mb-8 text-center font-heading text-3xl text-primary">
          Tipos de eventos
        </h2>
        <ul className="mx-auto grid max-w-md grid-cols-2 gap-4">
          {items.map((item) => (
            <li
              key={item.label}
              className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 text-center shadow-sm"
            >
              <span aria-hidden="true" className="text-4xl">
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
            </li>
          ))}
        </ul>
      </ScrollReveal>
    </section>
  );
}
```

`src/components/services/Services.tsx`:

```tsx
import type { VenueServices } from "@/domain/venue";
import { ScrollReveal } from "@/components/scroll-reveal/ScrollReveal";

export function Services({ capacity, items }: VenueServices) {
  return (
    <section aria-labelledby="services-title" className="px-6 py-16">
      <ScrollReveal>
        <h2 id="services-title" className="mb-6 text-center font-heading text-3xl text-primary">
          Servicios y capacidad
        </h2>
        {capacity !== undefined ? (
          <p className="mb-6 text-center text-lg">
            Capacidad: <strong>hasta {capacity} personas</strong>
          </p>
        ) : null}
        <ul className="mx-auto flex max-w-md flex-col gap-2">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-3 rounded-lg border border-primary/20 px-4 py-3">
              <span aria-hidden="true" className="text-accent">
                ✦
              </span>
              {item}
            </li>
          ))}
        </ul>
      </ScrollReveal>
    </section>
  );
}
```

`src/components/location/Location.tsx`:

```tsx
import type { VenueLocation } from "@/domain/venue";
import { ScrollReveal } from "@/components/scroll-reveal/ScrollReveal";

export function Location({ address, mapsUrl, embedUrl }: VenueLocation) {
  return (
    <section aria-labelledby="location-title" className="bg-primary/5 px-6 py-16">
      <ScrollReveal>
        <h2 id="location-title" className="mb-4 text-center font-heading text-3xl text-primary">
          Ubicación
        </h2>
        <p className="mb-6 text-center text-lg">{address}</p>
        <iframe
          src={embedUrl}
          title={`Mapa de ${address}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="mx-auto mb-6 aspect-[4/3] w-full max-w-md rounded-xl border-0"
        />
        <div className="text-center">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-full border-2 border-primary px-6 py-3 font-semibold text-primary"
          >
            Cómo llegar
          </a>
        </div>
      </ScrollReveal>
    </section>
  );
}
```

`src/components/cta/FinalCta.tsx`:

```tsx
import { ScrollReveal } from "@/components/scroll-reveal/ScrollReveal";
import { WhatsAppButton } from "@/components/whatsapp-button/WhatsAppButton";

export function FinalCta({ whatsappHref }: { whatsappHref: string }) {
  return (
    <section aria-labelledby="cta-title" className="bg-primary px-6 py-20 text-center text-white">
      <ScrollReveal>
        <h2 id="cta-title" className="mb-6 font-heading text-3xl">
          ¿Hacemos tu evento acá?
        </h2>
        <WhatsAppButton href={whatsappHref} label="Consultar disponibilidad" />
      </ScrollReveal>
    </section>
  );
}
```

`src/components/footer/Footer.tsx`:

```tsx
import type { VenueSocials } from "@/domain/venue";

type FooterProps = {
  venueName: string;
  phone: string;
  whatsappHref: string;
  address?: string;
  socials?: VenueSocials;
};

export function Footer({ venueName, phone, whatsappHref, address, socials }: FooterProps) {
  const socialLinks = [
    { name: "Instagram", href: socials?.instagram },
    { name: "Facebook", href: socials?.facebook },
  ].filter((link): link is { name: string; href: string } => Boolean(link.href));

  return (
    <footer className="bg-neutral-900 px-6 pb-28 pt-12 text-center text-sm text-white/80">
      <p className="mb-2 font-heading text-lg text-white">{venueName}</p>
      <p className="mb-1">
        WhatsApp:{" "}
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="underline">
          {phone}
        </a>
      </p>
      {address ? <p className="mb-1">{address}</p> : null}
      {socialLinks.length > 0 ? (
        <nav aria-label="Redes sociales" className="mt-4">
          <ul className="flex justify-center gap-4">
            {socialLinks.map((link) => (
              <li key={link.name}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.name}
                  className="underline"
                >
                  {link.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </footer>
  );
}
```

- [ ] **Step 4: Run test to verify it passes, then build**

Run: `npm test -- src/components/sections.test.tsx`
Expected: 5 passed.
Run: `npm run build` (`ScrollReveal` agrega `'use client'`)
Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Commit**

```bash
git add src/components/scroll-reveal src/components/hero src/components/about src/components/event-types src/components/services src/components/location src/components/cta src/components/footer src/components/sections.test.tsx
git commit -m "feat: add card sections with scroll reveal"
```

---

### Task 6: Galería con vista ampliada (lightbox)

**Files:**
- Create: `src/components/gallery/Gallery.tsx`
- Test: `src/components/gallery/Gallery.test.tsx`

**Interfaces:**
- Consumes: `GalleryImage` de `@/domain/venue` (Task 2); `ScrollReveal` (Task 5).
- Produces: `Gallery(props: { images: GalleryImage[] })` (`'use client'`) en `@/components/gallery/Gallery`. Sección con `<h2>Galería</h2>`, grilla de `<button aria-label="Ampliar imagen: <alt>">`; al tocar abre `<div role="dialog" aria-modal="true" aria-label={alt}>` con la imagen grande y botón "Cerrar" (con foco automático). Cierra con "Cerrar", tocando el fondo o con Escape.

- [ ] **Step 1: Write the failing test** — `src/components/gallery/Gallery.test.tsx`

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Gallery } from "@/components/gallery/Gallery";

const images = [
  { src: "/venues/x/1.svg", alt: "Salón decorado" },
  { src: "/venues/x/2.svg", alt: "Mesa de dulces" },
];

describe("Gallery", () => {
  it("muestra todas las miniaturas con su alt", () => {
    render(<Gallery images={images} />);
    expect(screen.getByAltText("Salón decorado")).toBeInTheDocument();
    expect(screen.getByAltText("Mesa de dulces")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abre la vista ampliada al tocar una imagen y la cierra con el botón", async () => {
    render(<Gallery images={images} />);
    await userEvent.click(screen.getByRole("button", { name: "Ampliar imagen: Mesa de dulces" }));
    const dialog = screen.getByRole("dialog", { name: "Mesa de dulces" });
    expect(within(dialog).getByAltText("Mesa de dulces")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cierra la vista ampliada con Escape", async () => {
    render(<Gallery images={images} />);
    await userEvent.click(screen.getByRole("button", { name: "Ampliar imagen: Salón decorado" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/gallery`
Expected: FAIL con `Failed to resolve import "@/components/gallery/Gallery"`.

- [ ] **Step 3: Write minimal implementation** — `src/components/gallery/Gallery.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { GalleryImage } from "@/domain/venue";
import { ScrollReveal } from "@/components/scroll-reveal/ScrollReveal";

export function Gallery({ images }: { images: GalleryImage[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex === null ? null : images[activeIndex];

  useEffect(() => {
    if (activeIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex]);

  return (
    <section aria-labelledby="gallery-title" className="px-6 py-16">
      <ScrollReveal>
        <h2 id="gallery-title" className="mb-8 text-center font-heading text-3xl text-primary">
          Galería
        </h2>
        <ul className="mx-auto grid max-w-md grid-cols-2 gap-3">
          {images.map((image, index) => (
            <li key={image.src}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Ampliar imagen: ${image.alt}`}
                className="relative block aspect-square w-full overflow-hidden rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 448px) 50vw, 224px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      </ScrollReveal>
      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.alt}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setActiveIndex(null)}
        >
          <button
            type="button"
            autoFocus
            onClick={() => setActiveIndex(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 px-4 py-2 text-white"
          >
            Cerrar
          </button>
          <div className="relative h-[80svh] w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <Image src={active.src} alt={active.alt} fill sizes="100vw" className="object-contain" />
          </div>
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes, then build**

Run: `npm test -- src/components/gallery`
Expected: 3 passed.
Run: `npm run build` (agrega `'use client'`)
Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Commit**

```bash
git add src/components/gallery
git commit -m "feat: add gallery with lightbox"
```

---

### Task 7: `VenueCard` (composición, secciones opcionales y theme como variables CSS)

**Files:**
- Create: `src/lib/theme.ts`, `src/components/venue-card/VenueCard.tsx`
- Test: `src/components/venue-card/VenueCard.test.tsx`

**Interfaces:**
- Consumes: `Venue`, `VenueTheme` (Task 2); `buildWhatsAppLink` (Task 1); `CardShell` (Task 4); `Hero`, `About`, `EventTypes`, `Services`, `Location`, `FinalCta`, `Footer` (Task 5); `Gallery` (Task 6).
- Produces:
  - `themeToCssVars(theme: VenueTheme): CSSProperties` en `@/lib/theme` → `{ "--venue-primary", "--venue-accent", "--venue-font-heading" }`.
  - `VenueCard(props: { venue: Venue })` en `@/components/venue-card/VenueCard` (server component, sin `'use client'`). Construye UNA vez `whatsappHref` y lo pasa a hero, CTA, footer y botón flotante. Contenedor con `data-testid="venue-card"` y `style={themeToCssVars(venue.theme)}`. Renderiza secciones opcionales solo si tienen datos (`about` no vacío, arrays con `length > 0`, `services.items.length > 0`, `location` definido).

- [ ] **Step 1: Write the failing test** — `src/components/venue-card/VenueCard.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Venue } from "@/domain/venue";
import { VenueCard } from "@/components/venue-card/VenueCard";

const minimalVenue: Venue = {
  slug: "minimo",
  name: "Salón Mínimo",
  tagline: "Solo lo esencial",
  theme: { primary: "#112233", accent: "#445566", fontHeading: "Georgia, serif" },
  envelope: false,
  whatsapp: { phone: "+54 9 11 1234-5678", message: "Hola, ¿tienen fecha?" },
  hero: { image: "/venues/minimo/hero.svg" },
  seo: { title: "Salón Mínimo", description: "Desc", ogImage: "/venues/minimo/og.png" },
};

const fullVenue: Venue = {
  ...minimalVenue,
  slug: "completo",
  name: "Salón Completo",
  about: "Somos un salón familiar.",
  eventTypes: [{ label: "Casamientos", icon: "💍" }],
  gallery: [{ src: "/venues/completo/1.svg", alt: "Salón decorado" }],
  services: { capacity: 120, items: ["Catering"] },
  location: {
    address: "Calle Falsa 123",
    mapsUrl: "https://maps.example/dir",
    embedUrl: "https://maps.example/embed",
  },
  socials: { instagram: "https://instagram.com/x" },
};

const OPTIONAL_TITLES = ["Sobre nosotros", "Tipos de eventos", "Galería", "Servicios y capacidad", "Ubicación"];
const expectedHref = "https://wa.me/5491112345678?text=Hola%2C%20%C2%BFtienen%20fecha%3F";

describe("VenueCard", () => {
  // Review Focus 3
  it("con solo campos obligatorios renderiza hero, CTA y footer, sin secciones opcionales", () => {
    render(<VenueCard venue={minimalVenue} />);
    expect(screen.getByRole("heading", { level: 1, name: "Salón Mínimo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "¿Hacemos tu evento acá?" })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    for (const title of OPTIONAL_TITLES) {
      expect(screen.queryByRole("heading", { name: title })).not.toBeInTheDocument();
    }
    expect(screen.queryByRole("navigation", { name: "Redes sociales" })).not.toBeInTheDocument();
  });

  it("con arrays vacíos tampoco renderiza esas secciones", () => {
    render(<VenueCard venue={{ ...minimalVenue, eventTypes: [], gallery: [], services: { items: [] } }} />);
    for (const title of ["Tipos de eventos", "Galería", "Servicios y capacidad"]) {
      expect(screen.queryByRole("heading", { name: title })).not.toBeInTheDocument();
    }
  });

  it("con todos los datos renderiza todas las secciones", () => {
    render(<VenueCard venue={fullVenue} />);
    for (const title of OPTIONAL_TITLES) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    expect(screen.getByRole("navigation", { name: "Redes sociales" })).toBeInTheDocument();
  });

  it("todos los botones de WhatsApp usan el mismo link con el mensaje pre-armado", () => {
    render(<VenueCard venue={minimalVenue} />);
    const whatsappLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("https://wa.me/"));
    // hero + CTA final + footer + flotante
    expect(whatsappLinks).toHaveLength(4);
    for (const link of whatsappLinks) {
      expect(link).toHaveAttribute("href", expectedHref);
    }
  });

  it("inyecta el theme como variables CSS en el contenedor", () => {
    render(<VenueCard venue={minimalVenue} />);
    const container = screen.getByTestId("venue-card");
    expect(container.style.getPropertyValue("--venue-primary")).toBe("#112233");
    expect(container.style.getPropertyValue("--venue-accent")).toBe("#445566");
    expect(container.style.getPropertyValue("--venue-font-heading")).toBe("Georgia, serif");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/venue-card`
Expected: FAIL con `Failed to resolve import "@/components/venue-card/VenueCard"`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/theme.ts`:

```ts
import type { CSSProperties } from "react";
import type { VenueTheme } from "@/domain/venue";

export function themeToCssVars(theme: VenueTheme): CSSProperties {
  return {
    "--venue-primary": theme.primary,
    "--venue-accent": theme.accent,
    "--venue-font-heading": theme.fontHeading,
  } as CSSProperties;
}
```

`src/components/venue-card/VenueCard.tsx`:

```tsx
import type { Venue } from "@/domain/venue";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { themeToCssVars } from "@/lib/theme";
import { CardShell } from "@/components/card-shell/CardShell";
import { Hero } from "@/components/hero/Hero";
import { About } from "@/components/about/About";
import { EventTypes } from "@/components/event-types/EventTypes";
import { Gallery } from "@/components/gallery/Gallery";
import { Services } from "@/components/services/Services";
import { Location } from "@/components/location/Location";
import { FinalCta } from "@/components/cta/FinalCta";
import { Footer } from "@/components/footer/Footer";

export function VenueCard({ venue }: { venue: Venue }) {
  // Un único link para hero, CTA final, footer y botón flotante.
  const whatsappHref = buildWhatsAppLink(venue.whatsapp.phone, venue.whatsapp.message);

  return (
    <div
      style={themeToCssVars(venue.theme)}
      data-testid="venue-card"
      className="min-h-svh bg-[#fffaf5] text-neutral-800"
    >
      <CardShell envelope={venue.envelope} venueName={venue.name} logo={venue.logo} whatsappHref={whatsappHref}>
        <Hero name={venue.name} tagline={venue.tagline} image={venue.hero.image} whatsappHref={whatsappHref} />
        <main>
          {venue.about ? <About text={venue.about} /> : null}
          {venue.eventTypes?.length ? <EventTypes items={venue.eventTypes} /> : null}
          {venue.gallery?.length ? <Gallery images={venue.gallery} /> : null}
          {venue.services?.items.length ? <Services {...venue.services} /> : null}
          {venue.location ? <Location {...venue.location} /> : null}
          <FinalCta whatsappHref={whatsappHref} />
        </main>
        <Footer
          venueName={venue.name}
          phone={venue.whatsapp.phone}
          whatsappHref={whatsappHref}
          address={venue.location?.address}
          socials={venue.socials}
        />
      </CardShell>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/venue-card`
Expected: 5 passed. Luego `npm test` completo → todo verde.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme.ts src/components/venue-card
git commit -m "feat: compose venue card with optional sections and theme vars"
```

---

### Task 8: Rutas (`/[slug]` SSG + OG, `/` redirect, 404), layout y smoke e2e

**Files:**
- Create: `src/lib/site-url.ts`, `src/app/[slug]/page.tsx`, `src/app/not-found.tsx`, `e2e/smoke.spec.ts`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`
- Delete: `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg` (assets del template)
- Test: `src/lib/site-url.test.ts`, `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `getVenueBySlug(slug: string): Venue | undefined`, `getAllSlugs(): string[]` de `@/domain/venue-repository` (Task 2); `VenueCard({ venue })` (Task 7); contenido de `salon-ejemplo` / `salon-minimo` (Task 2); `data-testid="whatsapp-floating"` (Task 3); label `"Consultar disponibilidad"` del CTA final (Task 5); aria-label del sobre `"Abrir la invitación de <name>"` (Task 4).
- Produces:
  - `getSiteUrl(env?: Record<string, string | undefined>): URL` en `@/lib/site-url` (prioridad: `NEXT_PUBLIC_SITE_URL` → `https://${VERCEL_PROJECT_PRODUCTION_URL}` → `http://localhost:3000`). Se usa como `metadataBase`.
  - Rutas: `/` (307 al primer slug), `/salon-ejemplo` y `/salon-minimo` (SSG), cualquier otro slug → 404 con `not-found.tsx`.

- [ ] **Step 1: Write the failing tests**

`src/lib/site-url.test.ts`:

```ts
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
```

`e2e/smoke.spec.ts`:

```ts
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
  await expect(page).toHaveURL(/\/salon-ejemplo$/);
});

test.describe("con prefers-reduced-motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("el sobre sigue abriendo y muestra el contenido", async ({ page }) => {
    await page.goto("/salon-ejemplo");
    await page.getByRole("button", { name: /Abrir la invitación/ }).tap();
    await expect(page.getByRole("heading", { level: 1, name: "Salón Ejemplo (PLACEHOLDER)" })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/site-url.test.ts`
Expected: FAIL con `Failed to resolve import "@/lib/site-url"`.
Run: `npm run test:e2e`
Expected: FAIL — `/salon-ejemplo` y `/salon-minimo` devuelven 404 (todavía no existe la ruta), la raíz muestra la página del template.

- [ ] **Step 3: Write minimal implementation**

`src/lib/site-url.ts`:

```ts
export function getSiteUrl(env: Record<string, string | undefined> = process.env): URL {
  if (env.NEXT_PUBLIC_SITE_URL) return new URL(env.NEXT_PUBLIC_SITE_URL);
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return new URL(`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`);
  return new URL("http://localhost:3000");
}
```

Reemplazar todo `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${playfair.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
```

`src/app/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllSlugs, getVenueBySlug } from "@/domain/venue-repository";
import { VenueCard } from "@/components/venue-card/VenueCard";

// Slugs fuera de generateStaticParams → 404 (requiere cacheComponents desactivado).
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const venue = getVenueBySlug(slug);
  if (!venue) return {};

  return {
    title: venue.seo.title,
    description: venue.seo.description,
    openGraph: {
      type: "website",
      locale: "es_AR",
      url: `/${venue.slug}`,
      siteName: venue.name,
      title: venue.seo.title,
      description: venue.seo.description,
      images: [{ url: venue.seo.ogImage, width: 1200, height: 630, alt: venue.name }],
    },
  };
}

export default async function VenuePage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const venue = getVenueBySlug(slug);
  if (!venue) notFound();

  return <VenueCard venue={venue} />;
}
```

Reemplazar todo `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getAllSlugs } from "@/domain/venue-repository";

export default function Home() {
  const [firstSlug] = getAllSlugs();
  if (!firstSlug) throw new Error("No hay salones cargados en src/content/venues.ts");
  redirect(`/${firstSlug}`);
}
```

`src/app/not-found.tsx`:

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-heading text-3xl">No encontramos esta tarjeta</h1>
      <p>Revisá el link que te compartieron.</p>
      <Link href="/" className="underline">
        Ir al inicio
      </Link>
    </main>
  );
}
```

Borrar assets del template:

```bash
git rm public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg
```

- [ ] **Step 4: Run tests to verify they pass, then build**

Run: `npm test` → Expected: todos los unit tests en verde (incluye 3 de `site-url`).
Run: `npm run build` → Expected: `✓ Compiled successfully` y en la tabla de rutas `● /salon-ejemplo` y `● /salon-minimo` (SSG). No debe aparecer `◐ (Partial Prerender)`.
Run: `npm run test:e2e` → Expected: `8 passed`.
Run: `npm run lint` → Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/lib/site-url.ts src/lib/site-url.test.ts src/app e2e public
git commit -m "feat: add static venue routes with open graph, redirect and 404"
```

---

### Task 9: README (agregar un salón, tests y deploy)

**Files:**
- Modify: `README.md` (reemplaza el del template)

**Interfaces:**
- Consumes: estructura y scripts de las Tasks 1–8 (`npm test`, `npm run test:e2e`, `scripts/make-og-placeholder.mjs`, `src/content/venues.ts`, `NEXT_PUBLIC_SITE_URL`).
- Produces: documentación; sin código.

- [ ] **Step 1: Escribir `README.md`** (reemplazar todo el contenido)

````markdown
# Tarjeta interactiva para salón de eventos

Tarjeta web mobile-first (estilo invitación) para promocionar un salón y recibir consultas por WhatsApp.
Next.js 16 (App Router, SSG) + Tailwind 4 + Motion.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000 → redirige al primer salón
```

## Agregar un salón

1. Crear `public/venues/<slug>/` con las imágenes: foto principal, logo (opcional), galería (opcional)
   y una imagen OG **PNG o JPG de 1200×630** (WhatsApp no muestra SVG en la preview).
   Para un placeholder: `node scripts/make-og-placeholder.mjs public/venues/<slug>/og.png 7a1f3d`.
2. Agregar un objeto `Venue` en `src/content/venues.ts` (el tipo está en `src/domain/venue.ts`).
   - Obligatorios: `slug`, `name`, `tagline`, `theme`, `envelope`, `whatsapp`, `hero`, `seo`.
   - Opcionales (si faltan, la sección no se muestra): `logo`, `about`, `eventTypes`, `gallery`,
     `services`, `location`, `socials`.
   - `whatsapp.phone` acepta cualquier formato (`+54 9 11 1234-5678`): se limpia a dígitos.
   - `theme.fontHeading` es un `font-family` CSS; `"var(--font-playfair), Georgia, serif"` usa la fuente ya cargada.
   - `location.embedUrl`: en Google Maps → Compartir → Insertar un mapa → copiar el `src` del iframe.
3. La tarjeta queda en `/<slug>`. No hace falta tocar componentes: si falta un campo obligatorio, el build no compila.

## Tests

```bash
npm test           # Vitest (unit + componentes)
npm run test:e2e   # Playwright (build + start en :3100, emulando un Pixel 7)
```

La primera vez: `npx playwright install chromium`.

## Deploy en Vercel

1. Importar el repo en Vercel (framework Next.js detectado automáticamente, sin configuración extra).
2. Opcional: definir `NEXT_PUBLIC_SITE_URL` (p. ej. `https://tusalon.com.ar`) si se usa un dominio propio;
   si no, las URLs absolutas de Open Graph usan el dominio de producción de Vercel.
3. Verificar la preview pegando el link en WhatsApp.
````

- [ ] **Step 2: Verificar que todo sigue verde**

Run: `npm test && npm run test:e2e`
Expected: todos los tests pasan.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add readme with venue setup, tests and deploy"
```
