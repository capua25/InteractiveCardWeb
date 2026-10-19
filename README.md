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

## Deploy en Vercel (demo)

1. Importar el repo en [vercel.com/new](https://vercel.com/new) (Next se detecta solo, sin configuración extra).
2. `NEXT_PUBLIC_SITE_URL` es opcional: si no se setea, se usa el dominio de producción de Vercel (`VERCEL_PROJECT_PRODUCTION_URL`). Setearla si se agrega un dominio propio. Ver `src/lib/site-url.ts`.
3. Verificar la preview pegando el link en WhatsApp.

> El plan Hobby es de uso no comercial. Para un cliente real, pasar a Pro o al deploy con Docker/VPS (abajo).

## Deploy con Docker (VPS)

Alternativa para producción con cliente real.

Next se genera con `output: "standalone"` y se empaqueta en una imagen Docker (Node 24 alpine, usuario no-root, puerto 3000).

`NEXT_PUBLIC_SITE_URL` (p. ej. `https://tusalon.com.ar`, el dominio público de la tarjeta) se inlinea **en el build**, porque las páginas son SSG: se pasa como `--build-arg`, no al correr el contenedor. Si falta, el build falla (de lo contrario `og:image` apuntaría a `localhost` y la preview en WhatsApp no mostraría la imagen). Ver `src/lib/site-url.ts`.

```bash
docker build --build-arg NEXT_PUBLIC_SITE_URL=https://tusalon.com.ar -t interactivecard .
docker run -d --name interactivecard -p 127.0.0.1:3000:3000 --restart unless-stopped interactivecard
```

Requiere **Node >= 24.15** para desarrollo local (jsdom 30.1.3 exige `^24.15.0` en la rama 24).

> Pendiente: integración con Nginx (reverse proxy + TLS) y docker-compose; se documentan aparte.

Verificar la preview pegando el link en WhatsApp.
