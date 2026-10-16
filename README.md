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
   Requiere **Node >= 24.15** (jsdom 30.1.3 exige `^24.15.0` en la rama 24; con 24.14 npm avisa con `EBADENGINE`).
2. Definir `NEXT_PUBLIC_SITE_URL` (p. ej. `https://tusalon.com.ar`) con el dominio público de la tarjeta.
   `src/lib/site-url.ts` lee, en este orden, `NEXT_PUBLIC_SITE_URL`, `VERCEL_PROJECT_PRODUCTION_URL` (la define Vercel automáticamente) y, si ninguna existe, `http://localhost:3000`.
   **Importante:** si ambas variables faltan en producción, las URLs absolutas de Open Graph (`og:image`) apuntan a `localhost` y la preview en WhatsApp no muestra la imagen.
3. Verificar la preview pegando el link en WhatsApp.
