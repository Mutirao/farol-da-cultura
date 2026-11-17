# Unificação — baseline verificado

**Data:** 2026-11-16. **Loop:** U0.1 do `docs/PLANO-UNIFICADO-2026-11-16.md`.

Ambiente: Node `v26.10.0` (`.nvmrc`), pnpm `12.18.0`, Supabase CLI `3.1.0` (há `3.2.0` disponível — não atualizado nesta etapa).

## Comandos executados e resultados reais

| Comando                                                        | Resultado                                                                                                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node --version`                                               | `v26.10.0`                                                                                                                                                    |
| `pnpm --version`                                               | `12.18.0`                                                                                                                                                     |
| `pnpm biome ci .`                                              | exit 0 — 119 arquivos verificados, **7 avisos** (non-null assertion), 0 erros. O plano citava oito avisos conhecidos; o número real no checkout atual é sete. |
| `pnpm biome format --write docs/PLANO-UNIFICADO-2026-11-16.md` | 1 arquivo reformatado (o plano, por ser `docs/**/*.md` novo, entra no lint; sem essa formatação o `biome ci .` falhava)                                       |
| `pnpm turbo run typecheck test`                                | exit 0 — 9/9 tarefas (5 cached)                                                                                                                               |
| `pnpm supabase start`                                          | exit 0 — stack local no ar (54321/54322)                                                                                                                      |
| `pnpm supabase test db`                                        | exit 0 — 3 arquivos pgTAP, **67 testes**, Result: PASS                                                                                                        |

## Totais de teste observados

- `@farol/app`: 5 arquivos, 61 testes (agenda 41, distancia 8, links 5, favoritos 4, convite 3).
- `@farol/coleta`: 1 arquivo, 31 testes.
- pgTAP: `000_smoke`, `001_agenda_minima`, `002_importar_agenda` — 67 asserts, todos ok.

## Não executado nesta etapa (deliberado)

- Nenhum reset de banco local (`supabase db reset` exige consentimento — o banco pode conter demonstração com dados reais).
- Nenhuma instalação de dependência, build de tokens/app, migração, deploy, coleta viva ou teste em aparelho.
- `npx expo lint` não foi invocado em nenhum momento (Biome é o único linter; `expo lint` autoinstala ESLint e suja o workspace).

## Estado do workspace ao registrar este relatório

- Único arquivo modificado além deste relatório: `docs/PLANO-UNIFICADO-2026-11-16.md` (reformatação Biome, sem mudança de conteúdo).
