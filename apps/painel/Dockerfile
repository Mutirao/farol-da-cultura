# syntax=docker/dockerfile:1.7
# Painel administrativo (apps/painel): build estático servido por nginx não
# privilegiado. Build de contexto = raiz do monorepo (pnpm workspace).
# Uso local: `skaffold build` ou `docker build -f apps/painel/Dockerfile .`
# Sem segredo nesta imagem: as variáveis VITE_* são a chave pública (anon) do
# Supabase, nunca service_role (ver apps/painel/README.md).
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

FROM deps AS build
COPY packages packages
COPY apps/painel apps/painel
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_PUBLISHABLE_KEY=""
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL} \
    VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
RUN pnpm --filter @farol/painel run build

FROM nginxinc/nginx-unprivileged:1.29.3-alpine AS runtime
COPY apps/painel/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/painel/dist /usr/share/nginx/html
EXPOSE 8080
