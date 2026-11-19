@AGENTS.md

## Específico do Claude Code

- Plugins instalados (`--scope project`): feature-dev, code-review, pr-review-toolkit, code-simplifier, security-guidance, commit-commands, hookify, skill-creator, frontend-design, typescript-lsp, expo, context7. `supabase` fica fora de propósito (MCP sem escopo/leitura — ver abaixo).
- Hooks ativos: `PreToolUse Bash` → `guard-bash.sh` (bloqueia segredos/produção mesmo via wrappers); `PostToolUse Edit|MultiEdit|Write` → `biome.sh` (formata e reporta diagnóstico); `Stop` → `typecheck.sh` (`--affected`, guarda `stop_hook_active`).
- MCPs disponíveis (`.mcp.json`): `supabase-local` (local, leitura/escrita), `supabase-dev` (hospedado, `read_only=true`, `project_ref` via env), `shadcn`. Expo e Context7 vêm pelos plugins.
- Sandbox nega leitura de `.env.production*`, `*.jks`, `*.keystore`, `key.properties`.
- Skills de comunidade fixadas por SHA/tag em `skills-lock.json` (`.agents/skills/`); skills do projeto em `.claude/skills/` — `farol-native-ui` prevalece sobre as skills oficiais `expo-ui`/`expo-router` quando divergirem (ver `docs/adr/0001-divergencias-plano-docs-2026-11.md`).
- **Arquivos de instrução de agente** (este arquivo e `AGENTS.md`) exigem aprovação síncrona do usuário para serem criados/editados por um agente — não tente contornar essa proteção.

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
