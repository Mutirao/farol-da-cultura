# Infraestrutura — spike Skaffold (U-Skaffold, fora do plano numerado)

Objetivo: validar `docker build` + render de manifestos para `apps/painel` e
`workers/coleta` neste monorepo, sem tocar no cluster compartilhado
(`kubectl config current-context` = `default`, o mesmo cluster onde roda o
Helm release legado `farol`/`farol-dev` de `raspagem-farol`, hoje com Flux
gerindo só infraestrutura de apoio).

## Decisão do usuário (16/11/2026)

- Backend: Supabase **hospedado** (não self-hosted no cluster).
- Alvo Kubernetes: painel (`apps/painel`) e worker de coleta
  (`workers/coleta`), via Skaffold — mesmo padrão já usado por
  `raspagem-farol` (`skaffold.yaml` + Helm, cluster `caicara-dev`).
- Escopo autorizado nesta etapa: **preparar e validar localmente**. Nenhum
  `skaffold run`/`skaffold dev`/`skaffold deploy`/`kubectl apply` foi
  executado contra o cluster.

## O que existe aqui

- `apps/painel/Dockerfile` + `nginx.conf`: build estático servido por
  `nginx-unprivileged`. Variáveis `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_PUBLISHABLE_KEY` (chave pública/anon) são build args — nunca
  `service_role`.
- `workers/coleta/Dockerfile`: imagem que roda
  `pnpm --filter @farol/coleta run importar` como usuário não-root `node`.
  `SUPABASE_URL`/`SUPABASE_SECRET_KEY` só em tempo de execução via Secret do
  Kubernetes, nunca copiados para a imagem.
- `infra/k8s/dev/`: manifestos simples (sem Helm) num namespace isolado
  `farol-unificado-dev` — deliberadamente distinto de `farol`/`farol-dev`
  (ocupados pelo release legado) para não colidir nem interferir nele.
  O CronJob nasce `suspend: true`; ativá-lo é gate humano.
- `skaffold.yaml` (raiz): `build.local.push: false`; `deploy.kustomize`
  aponta para `infra/k8s/dev`. Não há profile `prod` ainda — produção
  depende de decisões pendentes (registro de imagens, ingress/domínio,
  gestão de segredos, e se o legado em `farol`/`farol-dev` será substituído
  ou convive por um tempo).

## Validado nesta etapa

- `docker build -f apps/painel/Dockerfile .` — build ok, serve `/` com
  HTTP 200 num contêiner local.
- `docker build -f workers/coleta/Dockerfile .` — build ok; rodado sem
  `SUPABASE_URL`/`SUPABASE_SECRET_KEY` falha exatamente com o guard esperado
  do próprio `importar.ts` (prova que o script roda de verdade na imagem).
- `skaffold diagnose` / `skaffold render --offline` / `skaffold build
  --push=false` (ver histórico de comandos da sessão).

## Pendências explícitas (não resolvidas aqui)

- Capacidade/volume do Supabase hospedado (plano Free) sob carga de
  painel+coleta — evidência humana, não deste spike.
- Registro de imagens para publicação real (hoje só local); se for
  `ghcr.io/mutirao/...` como o legado, precisa decisão + login.
- Profile `prod`, ingress/domínio e o destino do release legado
  `farol`/`farol-dev` (convivência ou substituição) — gate humano separado.
