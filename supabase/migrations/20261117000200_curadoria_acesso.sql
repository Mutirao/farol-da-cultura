-- U1.2 — Fechar acesso às dez tabelas legadas de coleta e habilitar o vínculo
-- de curadoria. Ver docs/PLANO-UNIFICADO-2026-11-16.md §6.1/§6.2.
--
-- Estado anterior: as tabelas do baseline (20261117000100) herdaram grants de
-- anon/authenticated via default privileges, sem RLS. Esta migração revoga,
-- concede o mínimo e liga RLS em todas. As políticas públicas das cinco
-- tabelas mobile não são tocadas.

create schema if not exists private;

-- Vínculo entre a identidade do Supabase Auth (uuid) e o usuário inteiro
-- legado. auth.users.id não substitui public.users.id.
create table private.curator_identities (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  user_id integer not null unique references public.users (id) on delete cascade
);

-- Recibo de idempotência de execuções de worker: o run key (uuid) identifica
-- replay após perda de resposta; a RPC consulta antes de gravar de novo.
create table private.recibos_idempotencia (
  chave uuid primary key,
  origem text not null,
  job_run_id integer references public.job_runs (id) on delete set null,
  criado_em timestamp with time zone not null default now ()
);

-- Identidade mínima do operador a partir da sessão. Nunca confia em e-mail,
-- papel ou user_metadata enviados pelo cliente; desativação vale imediatamente,
-- inclusive para JWT ainda não expirado.
create or replace function public.current_curator ()
  returns integer
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select u.id
  from private.curator_identities ci
  join public.users u on u.id = ci.user_id
  where ci.auth_user_id = auth.uid ()
    and u.is_active
    and u.role = 'curator'
  limit 1
$$;

revoke all on function public.current_curator () from public, anon;
grant execute on function public.current_curator () to authenticated;

-- Fecha tudo que veio dos default privileges: anon sem nenhum grant nas dez.
revoke all on public.sources, public.connectors, public.events, public.spaces,
  public.event_space_candidates, public.job_runs, public.exports,
  public.export_items, public.users, public.login_tokens
from anon, authenticated;

-- Leitura de operador: apenas via RLS + current_curator(), nunca escrita.
grant select on public.events, public.sources, public.spaces, public.job_runs
to authenticated;

-- exports só expõe metadados; csv_content_base64 fica fora dos privilégios
-- de coluna do painel e só sai por download autenticado (U4).
grant select (
  id, checksum_sha256, schema_version, row_count, created_by, status,
  created_at, updated_at
) on public.exports to authenticated;

-- RLS: sem política = negado por padrão. connectors, event_space_candidates,
-- export_items, users e login_tokens ficam sem nenhuma política de leitura.
alter table public.sources enable row level security;
alter table public.connectors enable row level security;
alter table public.events enable row level security;
alter table public.spaces enable row level security;
alter table public.event_space_candidates enable row level security;
alter table public.job_runs enable row level security;
alter table public.exports enable row level security;
alter table public.export_items enable row level security;
alter table public.users enable row level security;
alter table public.login_tokens enable row level security;

create policy ler_curador on public.events
  for select to authenticated
  using (public.current_curator () is not null);

create policy ler_curador on public.sources
  for select to authenticated
  using (public.current_curator () is not null);

create policy ler_curador on public.spaces
  for select to authenticated
  using (public.current_curator () is not null);

create policy ler_curador on public.job_runs
  for select to authenticated
  using (public.current_curator () is not null);

create policy ler_metadados on public.exports
  for select to authenticated
  using (public.current_curator () is not null);
