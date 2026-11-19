# syntax=docker/dockerfile:1.7
# Hospedagem estática única (S0.8): painel administrativo (apps/painel,
# build Vite) e export web do aplicativo público (apps/app, Expo Router
# output "single") na mesma imagem, servidos por nginx não privilegiado com
# dois hosts virtuais (ver deploy/nginx.conf) e fallback de SPA em cada um.
# Build de contexto = raiz do monorepo (pnpm workspace). Uso local:
# `skaffold build` (ver skaffold.yaml na raiz) ou
# `docker build -f deploy/Dockerfile -t farol-web:local .`.
#
# Build args públicos only — nunca chave secreta/service_role nesta imagem:
#   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY         (painel, Vite)
#   EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (app, Expo)
# Ver deploy/README.md.

FROM node:26.10.0-bookworm-slim AS deps
WORKDIR /repo
RUN npm install --global pnpm@12.18.0
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY packages/tokens/package.json packages/tokens/package.json
COPY packages/ui-native/package.json packages/ui-native/package.json
COPY packages/i18n/package.json packages/i18n/package.json
COPY apps/app/package.json apps/app/package.json
COPY apps/painel/package.json apps/painel/package.json
COPY workers/coleta/package.json workers/coleta/package.json
RUN pnpm install --frozen-lockfile --strict-peer-dependencies

# --- painel administrativo (Vite, build estático em apps/painel/dist) ---
FROM deps AS build-painel
COPY packages packages
COPY apps/painel apps/painel
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_PUBLISHABLE_KEY=""
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL} \
    VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
RUN pnpm --filter @farol/painel run build

# --- aplicativo público, export web (Expo Router, output "single") ---
FROM deps AS build-app
COPY packages packages
COPY apps/app apps/app
# packages/tokens/dist (native.ts, theme.css) é gerado, não commitado
# (.gitignore do pacote) e fica fora do contexto via **/dist no
# .dockerignore — precisa ser construído aqui antes do export, já que
# apps/app (e packages/ui-native, via workspace) importa @farol/tokens/native.
# O script de build chama `biome format`: o biome.json do pacote usa
# extends: "//" (config raiz do monorepo), então a config raiz e os plugins
# GritQL que ela referencia precisam estar no contexto também.
COPY biome.json biome.json
COPY tooling/biome-plugins tooling/biome-plugins
RUN pnpm --filter @farol/tokens run build
ARG EXPO_PUBLIC_SUPABASE_URL=""
ARG EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=""
ENV EXPO_PUBLIC_SUPABASE_URL=${EXPO_PUBLIC_SUPABASE_URL} \
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY} \
    CI=1
WORKDIR /repo/apps/app
RUN npx expo export --platform web

# --- runtime: nginx não privilegiado, dois hosts, sem shell de build ---
FROM nginxinc/nginx-unprivileged:1.29.3-alpine AS runtime
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-painel /repo/apps/painel/dist /usr/share/nginx/html/painel
COPY --from=build-app /repo/apps/app/dist /usr/share/nginx/html/app
EXPOSE 8080
