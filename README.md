# Farol da Cultura

Ecossistema de informações culturais apoiado nas instâncias de Mapas Culturais:
aplicativo público **Android, iOS e web**, painel administrativo separado,
múltiplos scrapers/conectores, instâncias conectadas e cidades.

Mapas Culturais é a referência institucional. A coleta externa passa por
normalização, curadoria e incorporação na instância; só depois da confirmação
pela API pode alimentar a agenda pública do Farol. Supabase apoia a operação e
a projeção de leitura, sem substituir essa referência.

## Como as frentes se conectam

```text
 F2 Coleta/scrapers          F3 Painel (curador)          F4 Envio/incorporação
 redes, plataformas  ──►  coletado restrito ──► aprovar ──► exportar ──► registrar ID no Mapas
 (workers/sympla)          (Supabase, F1)        (apps/painel)                │
                                                                              ▼
                                                     Instância de Mapas Culturais (API)
                                                                              │
 F6 App público  ◄── agenda (projeção) ◄── F5 Sincronização (workers/coleta) ◄┘
 Android/iOS/web      (Supabase, F1)        + confirmação do vínculo coletado ↔ institucional

 F7 Hospedagem/operação: painel e app web no mesmo modelo; CI; agendamentos.
```

A agenda pública só recebe o que vem da API de uma instância. Scrapers e painel
nunca escrevem nela diretamente. O vocabulário está em
[ontologia e fluxo](docs/ONTOLOGIA-E-FLUXO.md).

## Estado por frente

Status medido no repositório em 19/11/2026. "Fase 0" é a fatia mais fina de
cada frente que se liga à seguinte; ver [roadmap](docs/ROADMAP.md).

| Frente                 | Onde                  | Existe hoje                                                                                                                                                                                             | Fase 0          |
| ---------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| F1 Dados               | `supabase/`           | agenda pública com RLS, baseline da coleta legada, curadoria, vínculo coletado ↔ institucional (`registrar_incorporacao`/`confirmar_incorporacao`); pgTAP cobrindo agenda, curadoria, vínculo e leitura | ok (S0.2)       |
| F2 Coleta/scrapers     | `workers/sympla`      | `@farol/sympla`: lê detalhes locais e grava via `registrar_coleta_minima`; sem descoberta online, paginação ou cron                                                                                     | ok (S0.3)       |
| F3 Painel              | `apps/painel`         | React-admin + ra-supabase com login por código, lista de coletados, aprovar e exportar CSV/JSON                                                                                                         | ok (S0.4)       |
| F4 Envio/incorporação  | painel + RPCs         | painel registra a incorporação e mostra o estado do vínculo; `workers/coleta` confere ID e conteúdo na instância e confirma                                                                             | ok (S0.4, S0.6) |
| F5 Sincronização       | `workers/coleta`      | importador da API do Mapa Cultural com `MAPA_CULTURAL_BASE` só local; instância de teste em `scripts/instancia-teste`; agendamento desligado                                                            | ok (S0.5)       |
| F6 App público         | `apps/app`            | agenda, filtros, detalhes e favoritos; Android, iOS e web habilitados em `app.config.ts`, com favoritos próprios no navegador; iOS sem build (H3)                                                       | ok (S0.7)       |
| F7 Hospedagem/operação | `.github/`, `deploy/` | CI de lint, tipos, testes, pgTAP, export do app e e2e; imagem estática única para painel e app web, manifests k8s via Skaffold, sem deploy                                                              | ok (S0.8)       |

A Fase 0 passou no teste ponta a ponta da corrente (S0.9, `pnpm e2e:esqueleto`)
e na verificação independente (S0.10); ver
[relatório da Fase 0 por frente](docs/relatorios/fase0-frentes.md). Pendências
abertas registradas no relatório:

- corrida TOCTOU entre a leitura em `workers/coleta/src/confirmar.ts` e a gravação
  em `confirmar_incorporacao` (P2, U3.3);
- falta de unicidade em `(base, tipo_entidade, mapas_id)` em
  `private.vinculos_institucionais` (U1.5);
- `deploy/k8s/web.yaml` sem `ingressClassName` nem TLS (gate humano);
- 13 avisos de texto fixo sem i18n no painel.

## Documentação

Índice completo, ordem de leitura e vigência de cada arquivo: [docs/README.md](docs/README.md).

- [Roadmap](docs/ROADMAP.md): Fase 0 por frente, marcos M1–M5 e melhorias.
- [Ontologia e fluxo institucional](docs/ONTOLOGIA-E-FLUXO.md): glossário único do
  domínio, proveniência, instâncias/bases/cidades e etapas do fluxo.
- [Plano unificado](docs/PLANO-UNIFICADO-2026-11-16.md): contratos, tarefas U0–U8 e gates.
- [Plano dos crawlers](docs/plans/2026-11-19-gitnexus-plan-crawler-quatro-fontes.md):
  pesquisa e etapas U2 na ordem **Sympla → Outgo → Ingresse → Bilheteria Digital**.
  Implementação e ativação estão pendentes.
- [ADR-0009](docs/adr/0009-ecossistema-institucional.md): decisões aprovadas em
  2026-11-17 e relação com os ADRs anteriores.
- [Setup da máquina](docs/setup-maquina.md): versões de Node, pnpm, eas-cli e gitleaks.

Histórico congelado, não orienta trabalho novo: [plano mobile](docs/PLANO-APP-MOBILE.md),
[Fase 0 da fundação](docs/PLANO-FASE-0-REVISADO.md) e [relatórios](docs/relatorios/portao-0.md).

## Requisitos

- Node 26 (`.nvmrc`)
- pnpm 12.18.0 (`packageManager`)
- Docker, para o Supabase local

## Comandos

```bash
pnpm install
pnpm biome ci .                    # único linter/formatter; não use `expo lint`
pnpm turbo run typecheck test
pnpm supabase start                # Supabase local
pnpm supabase test db              # pgTAP
pnpm --filter @farol/painel dev    # painel
cd apps/app && APP_VARIANT=development npx expo start --dev-client   # app
```

Cada pacote tem seu README: [app](apps/app/README.md), [painel](apps/painel/README.md),
[coleta externa](workers/sympla/README.md) e
[sincronização institucional](workers/coleta/README.md).

## Licença

[AGPL-3.0](LICENSE) (`AGPL-3.0-only`).
