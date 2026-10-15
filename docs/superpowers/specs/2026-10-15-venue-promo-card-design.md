# Tarjeta interactiva promocional para salón de eventos — Diseño

**Fecha:** 2026-10-15
**Estado:** aprobado en brainstorming

## Objetivo

Pieza comercial web con estética de invitación interactiva (estilo creactivasinvitaciones.com) para promocionar un salón de eventos y que los visitantes consulten por WhatsApp para contratar eventos. Se comparte por link (WhatsApp/redes) y el uso principal es en celular.

- **Fase 1 (esta spec):** una tarjeta para un único salón.
- **Fase futura (fuera de alcance):** producto multi-cliente con panel de estadísticas y mensajes de contacto.

### Criterios de éxito

- Carga rápida en móvil.
- Preview correcta al pegar el link en WhatsApp (Open Graph).
- El CTA abre WhatsApp con un mensaje pre-armado.
- Agregar un salón nuevo solo requiere datos e imágenes, sin tocar componentes.

## Contenido

Página vertical, mobile-first, con animaciones al hacer scroll.

1. **Sobre** (opcional, flag `envelope`): sobre cerrado con logo y la leyenda "tocá para abrir". Al abrirlo, una animación revela la tarjeta. Con `envelope: false` la página entra directo al hero.
2. **Hero:** foto principal, nombre, eslogan y botón de WhatsApp.
3. **Sobre nosotros:** texto breve.
4. **Tipos de eventos:** tarjetas o íconos.
5. **Galería:** grilla o carrusel con vista ampliada al tocar una imagen.
6. **Servicios y capacidad.**
7. **Ubicación:** dirección, Google Maps embebido y botón "Cómo llegar".
8. **CTA final:** "¿Hacemos tu evento acá?" y botón de WhatsApp con mensaje pre-armado.
9. **Footer:** contacto siempre visible; los íconos de redes se muestran solo si `socials` tiene datos.

Reglas transversales:

- El botón flotante de WhatsApp es visible en toda la página una vez abierto el sobre (o desde el inicio si `envelope: false`).
- Todos los botones de WhatsApp (hero, CTA final y flotante) usan el mismo `whatsapp.message`.
- Hero, CTA y footer son siempre obligatorios. Las demás secciones (sobre nosotros, tipos de eventos, galería, servicios, ubicación) son opcionales: si no hay datos, no se renderizan.
- Sin música, sin RSVP, sin countdown.

## Arquitectura

**Principio:** los componentes no conocen al salón, solo reciben datos.

### Estructura

```
src/
  app/
    [slug]/page.tsx      → SSG (generateStaticParams) + generateMetadata (OG)
    page.tsx             → redirige al primer slug devuelto por getAllSlugs()
    not-found.tsx        → 404 simple
  content/venues.ts      → datos de los salones (hoy uno)
  domain/venue.ts        → tipo Venue (contrato)
  domain/venue-repository.ts → getVenueBySlug(slug), getAllSlugs()
  components/ envelope/ hero/ about/ event-types/ gallery/ services/ location/ cta/ footer/ whatsapp-button/
  lib/whatsapp.ts        → buildWhatsAppLink(phone, message) → https://wa.me/<digits>?text=<encoded>
public/venues/<slug>/    → imágenes y logo
```

### Contrato

```ts
type Venue = {
  slug: string
  name: string
  tagline: string
  theme: { primary: string; accent: string; fontHeading: string }
  envelope: boolean
  whatsapp: { phone: string; message: string }
  hero: { image: string }
  about?: string
  eventTypes?: { label: string; icon: string }[]
  gallery?: { src: string; alt: string }[]
  services?: { capacity?: number; items: string[] }
  location?: { address: string; mapsUrl: string; embedUrl: string }
  socials?: { instagram?: string; facebook?: string }
  seo: { title: string; description: string; ogImage: string }
}
```

El repository es el único punto que sabe de dónde vienen los datos. En la fase producto se reemplaza por una fuente de base de datos sin tocar páginas ni componentes.

**Theming:** `theme` se inyecta como variables CSS en el contenedor de la página.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Motion (ex Framer Motion) para el sobre y las animaciones de scroll
- `next/image`
- Deploy en Vercel

**Por qué Next y no una SPA:** las meta tags OG para la preview de WhatsApp tienen que venir en el HTML generado en el server o de forma estática.

## Comportamiento y accesibilidad

- El sobre se opera por tap, click o teclado (Enter/Espacio), con rol y label accesibles.
- Se respeta `prefers-reduced-motion` (animaciones reducidas).
- Todas las imágenes llevan `alt`.
- El mapa va en un iframe con lazy loading.

## Manejo de errores

- Slug inexistente → `notFound()`.
- Secciones opcionales sin datos → no se renderizan.
- Los datos se validan con tipos TS en build: un campo obligatorio faltante hace que no compile.
- La validación en runtime (Zod) se difiere a la fase con base de datos.

## Testing

- **Vitest:**
  - `buildWhatsAppLink`: limpieza del teléfono a dígitos y encoding del mensaje.
  - Repository: slug existente, slug inexistente y `getAllSlugs`.
- **Playwright (smoke):**
  - Abrir la tarjeta, tocar el sobre y verificar que el contenido sea visible.
  - El `href` del CTA coincide con el link `wa.me` esperado.
  - Variante con `envelope: false`: entra directo al hero.
- Sin tests unitarios exhaustivos de markup estático.

## Fuera de alcance (fase futura)

- Panel de administración y login.
- Base de datos.
- Estadísticas (futuro tracking de clics vía `/go/[slug]`, que registra y redirige).
- Formulario de contacto.
- Música.
- Multi-cliente real.
- Pagos.

## Pendiente del usuario (contenido)

Datos reales del salón: nombre, eslogan, textos, fotos, logo, número de WhatsApp, dirección, redes y colores.

Hasta tenerlos se usa un salón de ejemplo, con datos de placeholder claramente marcados en `venues.ts`.
