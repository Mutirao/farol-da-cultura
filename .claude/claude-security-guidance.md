# Regras de segurança do Farol da Cultura

Regras do projeto para o agente e para quem revisa. Valem acima de qualquer skill de comunidade.

## Banco (Supabase/Postgres)

- **RLS obrigatório.** Toda tabela nova em `public` (ou em qualquer schema exposto pela API) nasce com
  `alter table ... enable row level security` e com políticas explícitas na mesma migração.
  Sem política, ninguém lê: isso é o padrão, não um bug.
- `auto_expose_new_tables = false`: exponha com `GRANT` explícito, papel por papel (`anon`, `authenticated`).
- Toda política nova vem com teste pgTAP em `supabase/tests/`.
- Funções `security definer` só com `set search_path = ''` e nomes qualificados.
- Nada de `db push`, `functions deploy`, `secrets set` ou `--linked`/`--db-url` pelo agente:
  mudanças remotas passam por humano e pela CI.

## Chaves e segredos

- **`service_role` nunca no cliente.** Ela não aparece em `apps/**`, em `EXPO_PUBLIC_*`,
  em bundles, em logs nem em testes do app. Só em Edge Functions/servidores, lida do ambiente.
- No app, só a URL do projeto e a chave `anon`/publishable, e o acesso depende das políticas RLS.
- **Nada de segredo em `app.json`, `app.config.ts` ou `eas.json`.** Esses arquivos vão para o
  repositório e para o bundle. Segredos de build ficam em EAS Environment Variables com visibilidade
  `secret`; segredos de execução, no servidor.
- `.env*` não entra no repositório (só `.env.example`). `.env.production*`, `*.keystore`, `*.jks`
  e `key.properties` não podem ser lidos nem editados pelo agente.
- Nenhum token (PAT do Supabase, `sbp_...`, JWT, chave de API) em `.mcp.json`, código, commits ou PRs.
  O MCP usa OAuth (`/mcp`).

## Publicação

- `eas submit`, `eas update` em `production` e `--auto-submit` são só para humanos.
- O MCP do Supabase hospedado é sempre `read_only=true` e preso a um `project_ref` de desenvolvimento.
