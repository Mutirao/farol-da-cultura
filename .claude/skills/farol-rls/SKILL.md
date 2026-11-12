---

name: farol-rls
description: Use when changing Supabase grants, RLS or pgTAP.
---

# Privilégios, RLS e pgTAP

## Fontes e pré-requisitos

Leia V18 no §3 e F0-06/F0-09a de `docs/PLANO-FASE-0-REVISADO.md`,
`.claude/claude-security-guidance.md` e `supabase/config.toml`.
`auto_expose_new_tables = false` aproxima o local do cloud: RLS não concede privilégio SQL.
Migrações de domínio só entram na Fase 1; esta skill não autoriza mudanças remotas.

## Procedimento

1. Liste schema exposto, papéis (`anon`, `authenticated`, servidor), operações e propriedade dos registros. Diferencie visitante sem sessão de usuário anônimo do Supabase Auth (que usa `authenticated`).
2. Para toda tabela nova exposta, inclua **GRANT explícito + ENABLE ROW LEVEL SECURITY + políticas explícitas na mesma migração**. Escolha privilégios mínimos, não `GRANT ALL`; revogue permissões herdadas indesejadas. Para schema próprio, avalie `USAGE`, sem expor schemas internos por conveniência.
3. Defina `USING` para leitura/linhas existentes e `WITH CHECK` para inserção/estado novo, conforme a operação. Para dados pessoais, vincule ao usuário autenticado; visibilidade pública precisa de condição de publicação explícita.
4. Funções `security definer` precisam de `set search_path = ''`, nomes qualificados e auditoria de `EXECUTE` por papel; não use função privilegiada para contornar uma política incompleta.
5. Na mesma entrega, escreva pgTAP em `supabase/tests/` para grants efetivos e RLS. Execute consultas com papéis reais e claims JWT de usuários diferentes, não apenas como proprietário/superusuário.

### Exemplo mínimo (somente leitura pública, adaptar ao domínio)

```sql
begin;
create table public.exemplo_publicado (
  id bigint primary key,
  publicado boolean not null default false
);
revoke all on table public.exemplo_publicado from anon, authenticated;
grant select on table public.exemplo_publicado to anon, authenticated;
alter table public.exemplo_publicado enable row level security;
create policy ler_publicados on public.exemplo_publicado
  for select to anon, authenticated
  using (publicado = true);
commit;
```

Esse exemplo não concede escrita nem modela os eventos reais. Se usar sequência/identity ou RPC, avalie privilégios desses objetos separadamente.

## Verificação

- pgTAP cobre: grant permitido, operação sem grant negada, RLS habilitado, leitura permitida e invisibilidade de linha privada/não publicada.
- Para dados por usuário: usuário A não lê/edita dados de B; inserção ou alteração de proprietário é negada. Inclua os papéis sem sessão, autenticado e anônimo autenticado quando aplicáveis.
- Isole fixtures com transação/rollback, declare `plan(...)` e finalize com `finish()`.
- Com Docker e stack local: `pnpm supabase start`, `pnpm supabase db reset`, `pnpm supabase test db`. Anexe saída e exit codes; testes só como `service_role` não provam RLS.
- Frontmatter de todas as skills: `bash .claude/skills/farol-rls/scripts/validate-skills.sh` (Bash, Python 3 e PyYAML).

## Armadilhas

Sem GRANT, o cliente recebe erro antes de RLS; com GRANT e sem política, RLS nega por padrão.
Não desligue RLS para fazer um teste passar. `service_role` contorna RLS e nunca entra no cliente.
Não rode `db push` nem deploy remoto pelo agente.
