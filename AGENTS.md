# Farol da Cultura — AGENTS.md

Guia operacional do monorepo. Fonte de verdade para convenções; `CLAUDE.md` importa este arquivo e adiciona só o que é específico do Claude Code.

## Comandos

- `pnpm install` — instala dependências do workspace (pnpm 12.18.0, lockfile congelado em CI).
- `pnpm turbo run lint typecheck test` — roda as 3 tarefas em todos os pacotes afetados.
- `pnpm biome ci .` — único formatter/linter do projeto; roda no CI como job `check`.
- `pnpm supabase start` / `pnpm supabase db reset` / `pnpm supabase test db` — ambiente Supabase local (Docker) + pgTAP de fumaça.
- `pnpm --filter <pkg> <script>` — roda um script só nesse pacote do workspace.
- `cd apps/app && APP_VARIANT=development npx expo start --dev-client` — Metro para o app (raiz do router é `apps/app/src/app/`, convenção `src/`).

## Estrutura do monorepo

- `apps/app/` — app Expo SDK 58 (4 abas nativas: agenda, mapa, favoritos, conta). Raiz do router: `src/app/`.
- `apps/painel/` — painel administrativo (Refine Core); nasce na Fase 3.
- `packages/tokens/` — `@farol/tokens`: paleta, contraste testado, gera `dist/native.ts` e `dist/theme.css`.
- `packages/ui-native/` — `@farol/ui-native`: 4 wrappers finos sobre `@expo/ui` universal (Button, Toggle, ListSection, Sheet), `accessibilityLabel` obrigatório.
- `packages/i18n/` — i18next + expo-localization, pt-BR.
- `packages/tsconfig/` — tsconfig base compatível com TS 7.
- `workers/coleta/` — worker de coleta/raspagem; nasce na Fase 1.
- `supabase/` — config local, migrations, testes pgTAP, seed.
- `docs/` — plano revisado, ADRs, checklists, relatórios (incluindo `docs/relatorios/portao-0.md`, o gate da Fase 0).
- `.claude/` — settings, hooks, skills do projeto (`.claude/skills/`) e de comunidade (`.agents/skills/`).
- `.github/workflows/` — CI: `ci.yml` (lint/typecheck/test + gitleaks), `agent-tools.yml` (hooks + skills check), `supabase-smoke.yml` (pgTAP), `app-ci.yml` (expo-doctor/export).

## Convenções

- TypeScript fixado em `~6.0.3` via catalog do pnpm (Expo SDK 58 exige essa faixa); tsconfig já compatível com TS 7.
- pnpm `12.18.0` fixado em `packageManager`; catálogo centraliza versões compartilhadas (react, vitest, zod etc.).
- Biome é o único formatter e linter — nunca Prettier/ESLint. `biome.json` raiz é `root: true`; pacotes podem ter `biome.json` aninhado só para overrides locais (ex.: `packages/tokens`).
- Regra `noRestrictedImports`: `@expo/ui*` só pode ser importado dentro de `packages/ui-native/**`.
- Plugins GritQL do Biome: cor hex fora de `packages/tokens/**` é erro; texto JSX fixo em `apps/**` é aviso (i18n obrigatório).
- Todo PR = uma tarefa da Fase 0/1/2/3/4 (ver `docs/PLANO-FASE-0-REVISADO.md`), com um branch próprio e CI obrigatório antes do merge.
- Identificadores do app por `APP_VARIANT`: `br.com.farol.cultura.dev` (development), `.preview` (preview), `br.com.farol.cultura` (production).

## Regras de segurança (resumo — detalhe completo em `.claude/claude-security-guidance.md`)

- Nunca segredo em `app.json`, `eas.json` ou qualquer arquivo versionado — use variáveis de ambiente / GitHub Environments.
- RLS obrigatório em toda tabela nova do Supabase, com `GRANT` explícito na mesma migração e teste pgTAP cobrindo (padrão da skill `farol-rls`).
- `service_role` do Supabase nunca é usado no cliente (app/painel) — só em contexto de servidor/CI com variável de ambiente.
- Arquivos de segredo (`*.jks`, `*.keystore`, `key.properties`, `.env.production*`) têm leitura e edição negadas nas permissões do Claude Code.
- Nenhum agente lê ou manipula valores de segredo, mesmo durante contenção do sistema legado — isso é execução humana (ver `docs/checklists/fase-0-contencao.md`).

## Decisões vigentes (Fase 0, aceitas 12/11/2026)

- Observabilidade (H9/ADR-0004): **Expo Observe**, não Sentry.
- Princípio geral: **manter o máximo nativo no Expo** — preferir a camada universal do Expo (`@expo/ui`, Expo Router, Expo Observe) a alternativas de terceiros sempre que uma opção nativa existir, inclusive na variante web (ADR-0005).
- Supabase hospedado: plano Free, projeto único `farol-dev` em `sa-east-1` (sem `farol-hml`).
- Sistemas legados (`farol-cultural`, `importador-idm`, API Node antiga): serão **arquivados**, não remediados item a item — ver nota em `docs/checklists/fase-0-contencao.md`.

## Skills do projeto (`.claude/skills/`)

- `farol-sync-rules` — regras de sincronização/reconciliação de dados entre dispositivo e Supabase.
- `farol-rls` — padrão GRANT + RLS + pgTAP para toda tabela nova.
- `farol-notifications` — regras de notificações (consentimento, deduplicação).
- `farol-performance` — critérios de performance de lista/mapa (medição, não opinião; ver ADR-0002/0003).
- `farol-connector` — contrato de conectores de dados (ex.: coleta/raspagem).
- `farol-native-ui` — wrappers reais de `packages/ui-native`, tokens, checklist de acessibilidade; prevalece sobre as skills oficiais `expo-ui`/`expo-router` em caso de conflito.

Ver também `CLAUDE.md` (específico do Claude Code), `docs/PLANO-FASE-0-REVISADO.md` (plano completo) e `docs/relatorios/portao-0.md` (estado do gate).
