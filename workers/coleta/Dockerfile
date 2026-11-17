# syntax=docker/dockerfile:1.7
# Worker de coleta (workers/coleta): roda `pnpm --filter @farol/coleta run
# importar` como Job/CronJob. Build de contexto = raiz do monorepo (pnpm
# workspace). Segredos (SUPABASE_URL/SUPABASE_SECRET_KEY) só em tempo de
# execução via Secret do Kubernetes — nunca copiados para a imagem.
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
RUN pnpm install --frozen-lockfile --strict-peer-dependencies --prod=false

FROM deps AS runtime
COPY packages/tsconfig packages/tsconfig
COPY workers/coleta workers/coleta
WORKDIR /repo/workers/coleta
USER node
CMD ["pnpm", "run", "importar"]
