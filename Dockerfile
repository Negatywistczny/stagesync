# syntax=docker/dockerfile:1

# StageSync v5 — API + static web (ADR 0004)
# Immutable image; mount ./data → /app/data.
# Version injected via ARG APP_VERSION at build time (release.yml / compose).

FROM node:20-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages
COPY data/library/library.template.json data/library/library.template.json
COPY data/library/seed-projects data/library/seed-projects

RUN pnpm install --frozen-lockfile \
 && pnpm --filter @stagesync/shared build \
 && pnpm --filter @stagesync/server build \
 && pnpm --filter @stagesync/web build \
 && mkdir -p /app/web \
 && cp -R apps/web/dist/. /app/web/

FROM build AS runtime
ARG APP_VERSION
ENV NODE_ENV=production
ENV PORT=4000
ENV STAGESYNC_DATA_DIR=/app/data
ENV STAGESYNC_STATIC_DIR=/app/web
ENV npm_package_version=${APP_VERSION:-5.0.0}

RUN mkdir -p /app/data/library /app/data/projects /app/data/logs \
 && chown -R node:node /app/data

USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/server/dist/index.js"]
