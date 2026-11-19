# S0.8 — hospedagem estática única (painel + app web)

Uma imagem (`deploy/Dockerfile`) serve o painel administrativo
(`apps/painel`, build Vite) e o export web do aplicativo público
(`apps/app`, Expo Router `output: "single"`, ver nota em
`apps/app/app.config.ts`) por nginx não privilegiado, distinguindo os dois
por `Host` (`deploy/nginx.conf`): `painel.farol.local` e `app.farol.local`,
cada um com fallback de SPA próprio. Host desconhecido recebe 404.

Direção (decisão de 16-17/11/2026, `docs/PLANO-UNIFICADO-2026-11-16.md` e
`docs/adr/0009-ecossistema-institucional.md`): Kubernetes/Skaffold para
painel e workers, Supabase hospedado fora do cluster — nunca self-hosted no
cluster. Este diretório implementa o modelo concreto de hospedagem web
(painel + app); o worker de coleta não está aqui (ver "Relação com
`infra/k8s/`" abaixo).

Nesta etapa só foi executado `docker build`/`docker run` local,
`skaffold render`/`skaffold build --push=false` e
`kubectl kustomize ... | kubectl apply --dry-run=client`. Nenhum
`skaffold run`/`dev`/`deploy`, `kubectl apply` real, push de imagem ou
criação de cluster.

## Build

Build args públicos — nunca chave secreta/`service_role` (ver
`AGENTS.md`):

```bash
docker build -f deploy/Dockerfile -t farol-web:local \
  --build-arg VITE_SUPABASE_URL=http://127.0.0.1:54321 \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_exemplo_sintetico \
  --build-arg EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
  --build-arg EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_exemplo_sintetico \
  .
```

Sem os build args, o painel mostra "não configurado" (sem chamada de rede,
ver `apps/painel/src/supabaseClient.ts`) e o app mostra
`agenda.semConfiguracao` — a imagem ainda constrói e serve, só sem dados.
Para uma instância real, use a `PUBLISHABLE_KEY` de `pnpm supabase status
-o json` (local) ou a chave publicável do projeto hospedado.

## Rodar local e verificar

```bash
docker run -d --rm --name farol-web -p 8080:8080 farol-web:local
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: painel.farol.local' http://127.0.0.1:8080/
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: painel.farol.local' http://127.0.0.1:8080/alguma/rota/profunda
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: app.farol.local' http://127.0.0.1:8080/
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: app.farol.local' http://127.0.0.1:8080/evento/1
docker stop farol-web
```

Os quatro devem responder `200` (fallback de SPA cobre a rota profunda nos
dois hosts). Um `Host` desconhecido responde `404`.

## `deploy/k8s/`

`Deployment` (não-root — a imagem base já roda como uid 101 —,
`readOnlyRootFilesystem: true` com `emptyDir` em `/tmp` e
`/var/cache/nginx`, sem `allowPrivilegeEscalation`, capabilities zeradas,
probes com `Host: painel.farol.local` explícito — sem isso cairiam no bloco
`default_server` e dariam 404 —, `resources` de requisição/limite), `Service`
(ClusterIP, porta 80 → `8080`) e `Ingress` com os hosts placeholder
`painel.farol.local`/`app.farol.local` apontando para o mesmo `Service`,
tudo via `kustomization.yaml`. `ingressClassName` fica sem valor fixo
(depende do controller do cluster — ex.: `nginx` num `kind` com o addon
`ingress-nginx`); ajuste por ambiente.

```bash
kubectl kustomize deploy/k8s | kubectl apply --dry-run=client -f -
# ou, com o skaffold já configurado na raiz:
skaffold render
```

Nenhum dos dois comandos cria cluster, faz deploy real ou dá push de
imagem.

## Relação com `infra/k8s/` (spike anterior)

`infra/k8s/` + a versão anterior do `skaffold.yaml` (commits
`4603847`/`cb0d9aa`) eram um spike explicitamente fora do plano numerado
(ver `infra/k8s/README.md`, primeira linha: "fora do plano numerado") que
buildava `apps/painel/Dockerfile` (só o painel, sozinho) e
`workers/coleta/Dockerfile` (CronJob) para `ghcr.io/mutirao/...` e os
namespaces `farol-unificado{,-dev}`. A própria nota de arquitetura de
16-17/11 (`docs/PLANO-UNIFICADO-2026-11-16.md`, linha sobre U8.4) registra
que "o modelo concreto do painel... ainda não está implementado... definir
os dois juntos, sem um segundo modelo só para o web" — este diretório é essa
definição conjunta (S0.8).

O `skaffold.yaml` da raiz foi reescrito para apontar só para
`deploy/Dockerfile`/`deploy/k8s` (um artefato, servindo os dois hosts). Os
arquivos do spike (`apps/painel/Dockerfile`, `apps/painel/nginx.conf`,
`workers/coleta/Dockerfile`, `infra/k8s/**`) **não foram apagados** (fora do
SCOPE deste nó) e continuam válidos como referência, mas não são mais
referenciados pelo `skaffold.yaml` da raiz. Em particular, **a hospedagem do
worker de coleta (`workers/coleta/Dockerfile`, CronJob em
`infra/k8s/*/coleta-cronjob.yaml`) ficou fora deste `skaffold.yaml`** — fica
pendente decidir se ela volta a um `skaffold.yaml` unificado (múltiplos
artifacts) numa etapa futura, ou se o worker de coleta ganha seu próprio
arquivo de configuração.

## Pendências/gates humanos (não resolvidos aqui)

- Registro de imagem e push real (`docker login` num registry, tag
  versionada) — gate humano de credencial, igual ao spike anterior.
- DNS/TLS reais para os hosts de produção (os `*.farol.local` aqui são só
  placeholder para `kind`/teste local).
- `ingressClassName` por cluster, Secrets de ambiente/credenciais e o
  primeiro `kubectl apply`/`skaffold run` contra um cluster de verdade.
- Reconciliar o worker de coleta num `skaffold.yaml` único, se for essa a
  direção (ver seção anterior).
