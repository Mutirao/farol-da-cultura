@../AGENTS.md

## Específico de `supabase/`

- CLI fixado em `3.1.0`, instalado como devDependency do workspace (`pnpm supabase <comando>`).
- `config.toml`: Postgres 17, `auto_expose_new_tables = false` (GRANT explícito obrigatório em toda migração com RLS — padrão da skill `farol-rls`).
- Hospedado: plano Free, projeto único `farol-dev` em `sa-east-1`. Sem `farol-hml`. Projeto Free pausa após ~7 dias de inatividade.
- Nenhum `supabase db push` nesta fase — permissão negada explicitamente em `.claude/settings.json`, inclusive via `npx`/`pnpm exec`/`pnpm dlx`.
- `service_role` nunca no cliente; MCP `supabase-dev` é `read_only=true` com `project_ref` vindo de variável de ambiente, nunca hardcoded.
