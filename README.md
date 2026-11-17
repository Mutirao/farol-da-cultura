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

Status medido no repositório em 17/11/2026. "Fase 0" é a fatia mais fina de
cada frente que se liga à seguinte; ver [roadmap](docs/ROADMAP.md).

| Frente                 | Onde                             | Existe hoje                                                                                                 | Fase 0                                     |
| ---------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| F1 Dados               | `supabase/`                      | agenda pública com RLS, baseline das 10 tabelas da coleta legada, vínculo de curador, guard de fonte; pgTAP | não iniciada (vínculo institucional, S0.2) |
| F2 Coleta/scrapers     | `workers/sympla` (proposto)      | nada no repo; legado Sympla em `raspagem-farol`                                                             | não iniciada (S0.3)                        |
| F3 Painel              | `apps/painel`                    | prova de composição React-admin + ra-supabase, sem login nem ações                                          | não iniciada (S0.4)                        |
| F4 Envio/incorporação  | painel + RPCs                    | nada no repo                                                                                                | não iniciada (S0.4, S0.6)                  |
| F5 Sincronização       | `workers/coleta`                 | importador da API do Mapa Cultural do Ceará, testado, agendamento desligado                                 | não iniciada (instância de teste, S0.5)    |
| F6 App público         | `apps/app`                       | demonstração Android com agenda, filtros, detalhes e favoritos; web não habilitado; iOS sem build           | não iniciada (web, S0.7)                   |
| F7 Hospedagem/operação | `.github/`, `deploy/` (proposto) | CI de lint, tipos, testes, pgTAP e export do app; sem artefato de hospedagem                                | não iniciada (S0.8)                        |

A coluna "Fase 0" só muda para "ok" quando o teste ponta a ponta da corrente
(S0.9) e a verificação independente (S0.10) passarem.

## Documentação

- [Roadmap](docs/ROADMAP.md): Fase 0 por frente, roadmap mínimo e melhorias.
- [Ontologia e fluxo institucional](docs/ONTOLOGIA-E-FLUXO.md): termos, entidades,
  proveniência, instâncias/bases/cidades e etapas do fluxo.
- [Plano unificado](docs/PLANO-UNIFICADO-2026-11-16.md): contratos, tarefas U0–U8 e gates.
- [ADR-0009](docs/adr/0009-ecossistema-institucional.md): decisões aprovadas em
  2026-11-17 e relação com os ADRs anteriores.
- [Plano mobile](docs/PLANO-APP-MOBILE.md) e [Fase 0 da fundação](docs/PLANO-FASE-0-REVISADO.md):
  histórico das entregas e pendências, sem limitar o escopo atual.

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
[sincronização](workers/coleta/README.md).

## Licença

[AGPL-3.0](LICENSE) (`AGPL-3.0-only`).
