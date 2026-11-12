@AGENTS.md

## Específico do Claude Code

- Plugins instalados (`--scope project`): feature-dev, code-review, pr-review-toolkit, code-simplifier, security-guidance, commit-commands, hookify, skill-creator, frontend-design, typescript-lsp, expo, context7. `supabase` fica fora de propósito (MCP sem escopo/leitura — ver abaixo).
- Hooks ativos: `PreToolUse Bash` → `guard-bash.sh` (bloqueia segredos/produção mesmo via wrappers); `PostToolUse Edit|MultiEdit|Write` → `biome.sh` (formata e reporta diagnóstico); `Stop` → `typecheck.sh` (`--affected`, guarda `stop_hook_active`).
- MCPs disponíveis (`.mcp.json`): `supabase-local` (local, leitura/escrita), `supabase-dev` (hospedado, `read_only=true`, `project_ref` via env), `shadcn`. Expo e Context7 vêm pelos plugins.
- Sandbox nega leitura de `.env.production*`, `*.jks`, `*.keystore`, `key.properties`.
- Skills de comunidade fixadas por SHA/tag em `skills-lock.json` (`.agents/skills/`); skills do projeto em `.claude/skills/` — `farol-native-ui` prevalece sobre as skills oficiais `expo-ui`/`expo-router` quando divergirem (ver `docs/adr/0001-divergencias-plano-docs-2026-11.md`).
- **Arquivos de instrução de agente** (este arquivo e `AGENTS.md`) exigem aprovação síncrona do usuário para serem criados/editados por um agente — não tente contornar essa proteção.
