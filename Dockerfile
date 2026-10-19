# syntax=docker/dockerfile:1

# Alpine (musl): sharp publica binarios precompilados para linuxmusl, no hace falta libc6-compat.
# Node >= 24.15 (package.json engines); el tag 24 resuelve a la última 24.x.
FROM node:24-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
WORKDIR /app
# Las páginas son SSG: NEXT_PUBLIC_SITE_URL se inlinea en el build (og:image).
# Sin ella las URLs absolutas apuntarían a localhost, así que el build falla.
ARG NEXT_PUBLIC_SITE_URL
RUN test -n "$NEXT_PUBLIC_SITE_URL" || (echo "ERROR: falta --build-arg NEXT_PUBLIC_SITE_URL (ej. https://tusalon.com.ar)" >&2; exit 1)
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
