# Farol da Cultura — AGENTS.md

Guia operacional do monorepo. Fonte de verdade para convenções; `CLAUDE.md` importa este arquivo e adiciona só o que é específico do Claude Code.

## Comandos

- `pnpm install` — instala dependências do workspace (pnpm 12.18.0, lockfile congelado em CI).
- `pnpm turbo run typecheck test` — tipos e testes em todos os pacotes afetados. **Nunca** `turbo run lint` nem `expo lint`: `apps/app` ainda tem `"lint": "expo lint"`, que instala ESLint e suja manifests. O único lint é `pnpm biome ci .` (regra em `docs/PLANO-UNIFICADO-2026-11-16.md` §6).
- `pnpm biome ci .` — único formatter/linter do projeto; roda no CI como job `check`.
- `pnpm supabase start` / `pnpm supabase db reset` / `pnpm supabase test db` — ambiente Supabase local (Docker) + pgTAP de fumaça.
- `pnpm --filter <pkg> <script>` — roda um script só nesse pacote do workspace.
- `cd apps/app && APP_VARIANT=development npx expo start --dev-client` — Metro para o app (raiz do router é `apps/app/src/app/`, convenção `src/`).

## Estrutura do monorepo

- `apps/app/` — aplicativo público Expo SDK 58 (4 abas nativas: agenda, mapa, favoritos, conta). Raiz do router: `src/app/`. Escopo do produto: Android, iOS e web (ADR-0009); `app.config.ts` habilita as três plataformas e a web tem favoritos próprios no navegador (trilha U8).
- `apps/painel/` — painel administrativo separado: React-admin 5 + ra-supabase 4 (D6 revisada, ADR-0008). Tem login por código, lista de coletados, aprovação, curadoria em lote, exportação CSV/JSON e estado do vínculo coletado ↔ institucional.
- `packages/tokens/` — `@farol/tokens`: paleta, contraste testado, gera `dist/native.ts` e `dist/theme.css`.
- `packages/ui-native/` — `@farol/ui-native`: 8 módulos finos sobre `@expo/ui` universal (Button, Toggle, ListSection, Sheet, Collection, SearchField, Select, NativeUIProvider), `accessibilityLabel` obrigatório.
- `packages/i18n/` — i18next + expo-localization, pt-BR.
- `packages/tsconfig/` — tsconfig base compatível com TS 7.
- `workers/coleta/` — sincronização da agenda a partir da API do Mapa Cultural do Ceará (piloto), guard autorizado só para `mapa-cultural-ce`. `workers/sympla/` (`@farol/sympla`) já tem parser e normalização de fixture; novos scrapers ficam em pacotes próprios.
- `supabase/` — config local, migrations, testes pgTAP, seed.
- `docs/` — plano unificado vigente (`docs/PLANO-UNIFICADO-2026-11-16.md`), ontologia e fluxo (`docs/ONTOLOGIA-E-FLUXO.md`), ADRs, checklists, relatórios e históricos (Fase 0, plano mobile, `docs/relatorios/portao-0.md`).
- `.claude/` — settings, hooks, skills do projeto (`.claude/skills/`) e de comunidade (`.agents/skills/`).
- `.github/workflows/` — CI: `ci.yml` (lint/typecheck/test + gitleaks), `agent-tools.yml` (hooks + skills check), `supabase-smoke.yml` (pgTAP), `app-ci.yml` (expo-doctor/export), `e2e.yml` (esqueleto ponta a ponta), `coleta.yml` (importação agendada, inerte até a variável de repositório `COLETA_ATIVA=true`).

## Convenções

- TypeScript fixado em `~6.0.3` via catalog do pnpm (Expo SDK 58 exige essa faixa); tsconfig já compatível com TS 7.
- pnpm `12.18.0` fixado em `packageManager`; catálogo centraliza versões compartilhadas (react, vitest, zod etc.).
- Biome é o único formatter e linter — nunca Prettier/ESLint. `biome.json` raiz é `root: true`; pacotes podem ter `biome.json` aninhado só para overrides locais (ex.: `packages/tokens`).
- Regra `noRestrictedImports`: `@expo/ui*` só pode ser importado dentro de `packages/ui-native/**`.
- Plugins GritQL do Biome: cor hex fora de `packages/tokens/**` é erro; texto JSX fixo em `apps/**` é aviso (i18n obrigatório).
- Todo PR = uma tarefa do [`docs/ROADMAP.md`](docs/ROADMAP.md) (Fase 0, S0.x) ou do [`docs/PLANO-UNIFICADO-2026-11-16.md`](docs/PLANO-UNIFICADO-2026-11-16.md) (U0–U8), com branch próprio e CI obrigatório antes do merge. `docs/PLANO-FASE-0-REVISADO.md` é histórico: não implemente tarefas dele.
- Documentação: [`docs/README.md`](docs/README.md) é o índice e a vigência de cada arquivo. Documento novo ou reescrito declara status no topo (`Vigente` / `Histórico` / `Stub`); plano encerrado vira histórico, não ordem de serviço.
- Identificadores do app por `APP_VARIANT`: `br.com.farol.cultura.dev` (development), `.preview` (preview), `br.com.farol.cultura` (production).

## Regras de segurança (resumo — detalhe completo em `.claude/claude-security-guidance.md`)

- Nunca segredo em `app.config.ts`, `eas.json` ou qualquer arquivo versionado — use variáveis de ambiente / GitHub Environments.
- RLS obrigatório em toda tabela nova do Supabase, com `GRANT` explícito na mesma migração e teste pgTAP cobrindo (padrão da skill `farol-rls`).
- `service_role` do Supabase nunca é usado no cliente (app/painel) — só em contexto de servidor/CI com variável de ambiente.
- Arquivos de segredo (`*.jks`, `*.keystore`, `key.properties`, `.env.production*`) têm leitura e edição negadas nas permissões do Claude Code.
- Nenhum agente lê ou manipula valores de segredo, mesmo durante contenção do sistema legado — isso é execução humana (ver `docs/checklists/fase-0-contencao.md`).

## Decisões vigentes (Fase 0, aceitas 12/11/2026)

- Observabilidade (H9/ADR-0004): **Expo Observe**, não Sentry.
- Princípio geral: **manter o máximo nativo no Expo** — preferir a camada universal do Expo (`@expo/ui`, Expo Router, Expo Observe) a alternativas de terceiros sempre que uma opção nativa existir, inclusive na variante web (ADR-0005).
- Supabase hospedado: plano Free, projeto único `farol-dev` em `sa-east-1` (sem `farol-hml`).
- Sistemas legados (`farol-cultural`, `importador-idm`, API Node antiga): serão **arquivados**, não remediados item a item — ver nota em `docs/checklists/fase-0-contencao.md`.

## Decisões vigentes (ecossistema institucional, aceitas 17/11/2026 — ADR-0009)

- Mapas Culturais é a referência institucional. Registro coletado só entra na agenda pública do Farol após confirmação na API da instância; preparação fica restrita à operação.
- Vocabulário em `docs/ONTOLOGIA-E-FLUXO.md`: "instância" vale para ambientes independentes e subsites; evento, ocorrência e espaço cultural; fluxo coleta → normalização → curadoria → preparação de envio → incorporação na instância → sincronização da agenda → exibição no aplicativo.
- Escopo: aplicativo Android/iOS/web, painel separado, múltiplos scrapers, instâncias e cidades. Ceará e Sympla/Fortaleza são pilotos, não limites.

## Skills do projeto (`.claude/skills/`)

- `farol-sync-rules` — regras de sincronização/reconciliação de dados entre dispositivo e Supabase.
- `farol-rls` — padrão GRANT + RLS + pgTAP para toda tabela nova.
- `farol-notifications` — regras de notificações (consentimento, deduplicação).
- `farol-performance` — critérios de performance de lista/mapa (medição, não opinião). ADR-0002 (lista) e ADR-0003 (mapa) **ainda não existem**: F0-10/F0-11 não mediram, então a escolha permanece provisória.
- `farol-connector` — contrato de conectores de dados (ex.: coleta/raspagem).
- `farol-native-ui` — wrappers reais de `packages/ui-native`, tokens, checklist de acessibilidade; prevalece sobre as skills oficiais `expo-ui`/`expo-router` em caso de conflito.

Ver também `CLAUDE.md` (específico do Claude Code), [`docs/README.md`](docs/README.md) (índice e vigência de toda a documentação), `docs/PLANO-UNIFICADO-2026-11-16.md` (plano vigente), `docs/ONTOLOGIA-E-FLUXO.md` (glossário único e fluxo), `docs/ROADMAP.md` (ordem de entrega) e `docs/relatorios/portao-0.md` (estado do gate). `docs/PLANO-FASE-0-REVISADO.md` é histórico.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **farol-da-cultura** (1877 symbols, 3530 relationships, 64 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact before editing.** Use `impact({target: "symbolName", direction: "upstream"})` or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .`; report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "main"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- MUST warn on HIGH/CRITICAL `risk` pre-edit; never use `riskSharedAxes` to waive a HIGH/CRITICAL `risk` warning. Compare File/symbol: MCP File omits axes; Graph-RAG expands File.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- **MUST use `query({search_query: "concept"})` for concepts/flows, `context({name: "symbolName"})` for a named symbol, or `impact` for blast radius, on read-only callers, dependencies, imports, or execution flow.** Graph first; text search only for empty/`UNKNOWN`/literals.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource                                          | Use for                                  |
| ------------------------------------------------- | ---------------------------------------- |
| `gitnexus://repo/farol-da-cultura/context`        | Codebase overview, check index freshness |
| `gitnexus://repo/farol-da-cultura/clusters`       | All functional areas                     |
| `gitnexus://repo/farol-da-cultura/processes`      | All execution flows                      |
| `gitnexus://repo/farol-da-cultura/process/{name}` | Step-by-step execution trace             |

## CLI

| Task                                         | Read this skill file                               |
| -------------------------------------------- | -------------------------------------------------- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md`       |
| Blast radius / "What breaks if I change X?"  | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?"             | `.claude/skills/gitnexus-debugging/SKILL.md`       |
| Rename / extract / split / refactor          | `.claude/skills/gitnexus-refactoring/SKILL.md`     |
| Tools, resources, schema reference           | `.claude/skills/gitnexus-guide/SKILL.md`           |
| Index, status, clean, wiki CLI commands      | `.claude/skills/gitnexus-cli/SKILL.md`             |

<!-- gitnexus:end -->
