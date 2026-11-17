-- U1.2 — Acesso de curadoria: RLS das dez tabelas legadas, grants mínimos,
-- vínculo UUID↔inteiro e current_curator(). Ver docs/PLANO-UNIFICADO-2026-11-16.md §6.

begin;
select plan(24);

-- ============ Fixtures (transação com rollback) ============
insert into auth.users (id, aud, role, email, created_at, updated_at)
values ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
        'curador@teste.local', now(), now()),
       ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
        'semvinculo@teste.local', now(), now());

insert into public.users (id, email, is_active, role)
values (9001, 'curador@teste.local', true, 'curator');

insert into private.curator_identities (auth_user_id, user_id)
values ('11111111-1111-1111-1111-111111111111', 9001);

insert into public.sources (id, slug, name)
values (9001, 'fonte-teste', 'Fonte Teste');

insert into public.events (id, source_id, external_id, title, raw_json)
values (9001, 9001, 'ext-1', 'Evento bruto de teste', '{}'::jsonb);

insert into public.job_runs (id, job_type, source_id, status, owner)
values (9001, 'collect', 9001, 'succeeded', 'sympla:teste');

insert into public.exports (id, checksum_sha256, schema_version, created_by, row_count)
values (9001, 'abc123', 'v1', 'curador@teste.local', 1);

insert into public.connectors (id, source_id, type)
values (9001, 9001, 'crawler');

insert into public.login_tokens (id, user_id, token_hash, expires_at)
values (9001, 9001, 'hash-teste', now() + interval '1 hour');

-- Fixture de agenda publicada: a leitura pública mobile precisa continuar intacta.
insert into public.espacos (id, fonte, id_externo, nome, publicado)
overriding system value
values (9901, 'mapa-cultural-ce', 'espaco-teste', 'Espaço Teste', true);
insert into public.eventos (id, fonte, id_externo, nome, publicado)
overriding system value
values (9901, 'mapa-cultural-ce', 'evento-teste', 'Evento Público Teste', true);
insert into public.eventos_datas (id, evento_id, espaco_id, id_externo, inicio)
overriding system value
values (9901, 9901, 9901, 'principal', '2030-01-10T22:00:00Z');

-- ============ RLS habilitado nas dez tabelas ============
select is((select count(*) from pg_tables t
           join pg_class c on c.relname = t.tablename
           join pg_namespace n on n.oid = c.relnamespace and n.nspname = t.schemaname
           where t.schemaname = 'public' and c.relrowsecurity
             and t.tablename in ('sources','connectors','events','spaces',
                 'event_space_candidates','job_runs','exports','export_items',
                 'users','login_tokens')), 10::bigint,
  'RLS habilitado nas dez tabelas legadas');

-- ============ 1. anon sem acesso ao bruto ============
set local role anon;
select throws_ok(
  $$select * from public.events$$,
  '42501', null, 'anon não lê events (sem grant)');
select throws_ok(
  $$select * from public.exports$$,
  '42501', null, 'anon não lê exports (sem grant)');
select throws_ok(
  $$select public.current_curator()$$,
  '42501', null, 'anon não executa current_curator');

-- ============ 2. authenticated sem vínculo não vê o bruto ============
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222"}';
select is(public.current_curator(), null::integer, 'sem vínculo: current_curator null');
select is((select count(*) from public.events), 0::bigint,
  'authenticated sem vínculo não lê events');

-- ============ 3. curador ativo lê o permitido ============
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111"}';
select is(public.current_curator(), 9001, 'vínculo ativo: current_curator devolve id inteiro');
select is((select count(*) from public.events where id = 9001), 1::bigint,
  'curador ativo lê events');
select is((select count(*) from public.sources where id = 9001), 1::bigint,
  'curador ativo lê sources');
select is((select count(*) from public.job_runs where id = 9001), 1::bigint,
  'curador ativo lê job_runs');
select is((select count(*) from public.exports where id = 9001), 1::bigint,
  'curador ativo lê metadados de exports');

-- ============ 6. configurações, tokens, base64 e bruto restrito ficam fechados ============
select throws_ok(
  $$select * from public.connectors$$,
  '42501', null, 'curador não lê connectors (configurações)');
select throws_ok(
  $$select * from public.login_tokens$$,
  '42501', null, 'curador não lê login_tokens');
select throws_ok(
  $$select * from public.users$$,
  '42501', null, 'curador não lê users diretamente');
select throws_ok(
  $$select csv_content_base64 from public.exports$$,
  '42501', null, 'csv_content_base64 fora do SELECT do curador');

-- ============ 8. escrita direta negada ============
select throws_ok(
  $$insert into public.events (source_id, external_id, title, raw_json)
    values (9001, 'ext-2', 'X', '{}'::jsonb)$$,
  '42501', null, 'curador não insere events diretamente');
select throws_ok(
  $$update public.events set title = 'Y' where id = 9001$$,
  '42501', null, 'curador não atualiza events diretamente');
select throws_ok(
  $$delete from public.events where id = 9001$$,
  '42501', null, 'curador não remove events diretamente');

-- ============ 4. inativo com o mesmo sub perde acesso ============
reset role;
update public.users set is_active = false where id = 9001;
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111"}';
select is(public.current_curator(), null::integer, 'inativo: current_curator null');
select is((select count(*) from public.events), 0::bigint,
  'inativo com mesmo JWT não lê events');

-- ============ 5. papel incorreto negado ============
reset role;
update public.users set is_active = true, role = 'admin' where id = 9001;
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111"}';
select is(public.current_curator(), null::integer, 'papel diferente de curator: null');
select is((select count(*) from public.events), 0::bigint,
  'papel incorreto não lê events');

-- ============ 9. agenda pública continua legível por anon ============
reset role;
set local role anon;
select is((select count(*) from public.eventos where id = 9901 and publicado), 1::bigint,
  'anon continua lendo evento publicado');
select is((select count(*) from public.eventos_datas where id = 9901), 1::bigint,
  'anon continua lendo datas publicadas');

select * from finish();
rollback;
