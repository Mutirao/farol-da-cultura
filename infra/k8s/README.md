# Infraestrutura — spike Skaffold (U-Skaffold, fora do plano numerado)

Objetivo: validar `docker build` + render de manifestos para `apps/painel` e
`workers/coleta` neste monorepo, sem tocar no cluster compartilhado
(`kubectl config current-context` = `default`, o mesmo cluster onde roda o
Helm release legado `farol`/`farol-dev` de `raspagem-farol`, hoje com Flux
gerindo só infraestrutura de apoio).

## Decisões do usuário (16-17/11/2026)

- Backend: Supabase **hospedado** (não self-hosted no cluster). Capacidade do
  plano atual confirmada como suficiente para o volume de hoje (17/11/2026);
  revisitar se painel+coleta crescerem.
- Alvo Kubernetes: painel (`apps/painel`) e worker de coleta
  (`workers/coleta`), via Skaffold — mesmo padrão já usado por
  `raspagem-farol` (`skaffold.yaml` + Helm, cluster `caicara-dev`).
- Registro de imagens: `ghcr.io/mutirao/farol-da-cultura-painel` e
  `-coleta` (mesmo padrão de `ghcr.io/mutirao/raspagem-farol`); publicar de
  verdade exige `docker login ghcr.io` fora desta sessão.
- Ingress/domínio: `*.farol.app`; o painel usa `painel.farol.app` via
  Traefik (`ingressClassName: traefik`), TLS na borda do Cloudflare — mesmo
  padrão do release legado (`raspagem.mutirao.org.br`, sem cert-manager).
  DNS do subdomínio ainda precisa apontar para os IPs do LoadBalancer do
  Traefik (ver `kubectl get ingress -A`); isso é operação fora deste repo.
- Namespace legado: `farol`/`farol-dev` (Helm release `raspagem-farol`)
  continua ativo sem ser tocado; o novo trabalho usa namespaces próprios
  (`farol-unificado`/`farol-unificado-dev`) para não colidir.
- Escopo autorizado nesta etapa: **preparar e validar localmente**. Nenhum
  `skaffold run`/`skaffold dev`/`skaffold deploy`/`kubectl apply` real, nem
  push de verdade a `ghcr.io`, foi executado contra infraestrutura externa.

## O que existe aqui

- `apps/painel/Dockerfile` + `nginx.conf`: build estático servido por
  `nginx-unprivileged`. Variáveis `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_PUBLISHABLE_KEY` (chave pública/anon) são build args — nunca
  `service_role`.
- `workers/coleta/Dockerfile`: imagem que roda
  `pnpm --filter @farol/coleta run importar` como usuário não-root `node`.
  `SUPABASE_URL`/`SUPABASE_SECRET_KEY` só em tempo de execução via Secret do
  Kubernetes, nunca copiados para a imagem.
- `infra/k8s/dev/`: manifestos simples (sem Helm), namespace
  `farol-unificado-dev`, imagens locais sem registro. CronJob nasce
  `suspend: true`; ativá-lo é gate humano.
- `infra/k8s/prod/`: mesmo desenho, namespace `farol-unificado`, imagens
  `ghcr.io/mutirao/farol-da-cultura-*` com `imagePullSecrets: ghcr-cred`
  (Secret criado fora deste repositório, nunca commitado — mesma convenção
  do `ghcr-cred` em ns `farol`), e `Ingress` em `painel.farol.app`. CronJob
  também nasce `suspend: true`.
- `skaffold.yaml` (raiz): profile padrão = dev (`build.local.push: false`,
  manifestos em `infra/k8s/dev`); profile `prod` troca para as imagens
  `ghcr.io/mutirao/...` com `push: true` e manifestos em `infra/k8s/prod`.

## Validado nesta etapa

- `docker build -f apps/painel/Dockerfile .` — build ok, serve `/` com
  HTTP 200 num contêiner local.
- `docker build -f workers/coleta/Dockerfile .` — build ok; rodado sem
  `SUPABASE_URL`/`SUPABASE_SECRET_KEY` falha exatamente com o guard esperado
  do próprio `importar.ts` (prova que o script roda de verdade na imagem).
- `skaffold diagnose` (default e `-p prod`).
- `skaffold build --push=false` (default e `-p prod --push=false`, só para
  gerar tags locais de validação — o profile `prod` real usa `push: true`,
  nunca executado nesta sessão).
- `skaffold render --offline --digest-source=local` (default e `-p prod`) +
  `kubectl apply --dry-run=client` sobre o resultado — schema válido para
  Namespace, Deployment, Service, CronJob e Ingress, sem contato com o
  cluster.

## Evidência do legado — leitura apenas

O release legado vive no namespace `farol` (deployment `farol`, CNPG
`farol-postgres`, CronJobs `farol-collect-web` (03:00), `farol-match-events` (04:00)
e `farol-synchronize-spaces` (02:00), ingress `raspagem.mutirao.org.br` — classe
`traefik`) e permanece lá sem ser tocado. O trabalho novo fica em
`farol-unificado{,-dev}` e **lê** o legado de fora, pelo DNS do cluster.

- Namespace é a fronteira de Secret no Kubernetes. Dividir `farol` com o legado
  só para enxergá-lo daria ao deployment novo o mesmo escopo de credenciais
  (Supabase, SMTP, Postgres antigo). A leitura é remota por isso, não por falta
  de acesso: não há `NetworkPolicy` neste repositório, então os serviços de
  `farol` já respondem a partir de `farol-unificado`.
- **Um escritor por escopo.** Nenhum manifesto deste repositório escreve no
  `farol-postgres` nem dispara os CronJobs do legado; a curadoria nova escreve
  só no Supabase.

Leituras que destravam pendências:

| Pendência                         | O que coletar no legado                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------- |
| U4.1 — CSV de 29 colunas          | Bytes e hash de uma exportação real, para virar fixture de `packages/compat-csv`                  |
| U4.4 — matching e sync de espaços | Logs de `match-events` e `synchronize-spaces`: frequência, falhas, saída                          |
| U6.1/U6.2 — dados reais           | Restore read-only do `farol-postgres` para um banco local isolado; nunca no banco de demonstração |

Forma dos comandos, verificados no cluster em 19/11/2026 (serviços do CNPG:
`farol-postgres-rw`/`-ro`/`-r`):

```bash
kubectl -n farol logs -l job-name=<cronjob>-<timestamp>      # logs de uma execução
kubectl -n farol port-forward svc/farol-postgres-ro 55432:5432  # só leitura
```

Os CronJobs não têm `startingDeadlineSeconds`: **disparo perdido não é
recuperado**, e o control-plane é uma máquina de desktop, não um servidor
dedicado. Um ciclo que caia em horário com a máquina desligada simplesmente não
roda e não gera evento. Não tratar `lastScheduleTime` antigo como falha da
coleta sem antes distinguir isso de uma retirada institucional (ver
[ontologia §6](../docs/ONTOLOGIA-E-FLUXO.md)).

A captura de evidência não é gate humano. O restore de dados reais continua
dependente de autorização e de destino (U6.1/U6.2).

## Pendências explícitas (não resolvidas aqui)

- `docker login ghcr.io` + primeiro push real das imagens — gate humano
  (credencial).
- Criar os Secrets `ghcr-cred` e `coleta-mapa-cultural-ce` nos namespaces
  `farol-unificado`/`farol-unificado-dev` — nunca neste repositório.
- Apontar o DNS de `painel.farol.app` (e demais subdomínios de
  `*.farol.app` conforme forem necessários) para o cluster.
- Primeiro `skaffold run -p prod` (ou `skaffold deploy`) contra o cluster —
  gate humano separado; ativação do CronJob de coleta é outro gate humano
  independente (nasce suspenso nos dois profiles).
