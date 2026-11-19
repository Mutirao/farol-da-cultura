-- S0.4 — public.curar_evento: só authenticated com curador ativo aprova ou
-- rejeita, confere version (concorrência otimista), não altera export_*,
-- space_match_* ou mapas_import_*, e a agenda pública fica intocada.
-- Ver supabase/migrations/20261117000700_curadoria_minima.sql.

begin;
select plan(23);

-- ============ Fixtures (transação com rollback) ============
create temp table t (nome text primary key, valor jsonb);
grant all on t to service_role, authenticated;
grant select on t to anon;

insert into auth.users (id, aud, role, email, created_at, updated_at)
values ('71000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
        'curadoria-curador@teste.local', now(), now());
insert into public.users (id, email, is_active, role)
values (9741, 'curadoria-curador@teste.local', true, 'curator');
insert into private.curator_identities (auth_user_id, user_id)
values ('71000000-0000-0000-0000-000000000001', 9741);

-- authenticated sem vínculo de curador ativo (usuário existe, mas não tem
-- linha em curator_identities).
insert into auth.users (id, aud, role, email, created_at, updated_at)
values ('71000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
        'curadoria-sem-vinculo@teste.local', now(), now());

insert into t values ('agenda_antes', jsonb_build_object(
  'eventos', (select count(*) from public.eventos),
  'datas', (select count(*) from public.eventos_datas),
  'espacos', (select count(*) from public.espacos)));

insert into public.sources (slug, name, kind) values ('curadoria-teste', 'Curadoria teste', 'ticket_platform');

insert into public.events (
  source_id, external_id, title, raw_json, curation_status,
  export_status, space_match_status, mapas_import_status
)
select id, 'pgtap-curar-1', 'Evento para curar', '{"event":{"id":1}}'::jsonb, 'pending',
  'not_exported', 'unmatched', 'not_reported'
from public.sources where slug = 'curadoria-teste';

insert into t
select 'evento1', jsonb_build_object('id', e.id, 'version', e.version)
from public.events e where e.external_id = 'pgtap-curar-1';

-- ============ Assinatura e privilégios ============
select has_function('public', 'curar_evento', array['integer', 'integer', 'text'],
  'curar_evento(integer, integer, text) existe');
select is_definer('public', 'curar_evento', array['integer', 'integer', 'text'],
  'curar_evento é security definer');
select ok((select 'search_path=""' = any (p.proconfig) from pg_proc p
           where p.oid = 'public.curar_evento(integer,integer,text)'::regprocedure),
  'curar_evento fixa search_path vazio');
select ok(has_function_privilege('authenticated',
  'public.curar_evento(integer,integer,text)', 'execute'), 'authenticated executa');
select ok(not has_function_privilege('anon',
  'public.curar_evento(integer,integer,text)', 'execute'), 'anon não tem execute');
select ok(not has_function_privilege('service_role',
  'public.curar_evento(integer,integer,text)', 'execute'), 'service_role não tem execute');
select ok(not exists (
  select 1 from pg_proc p, aclexplode(p.proacl) a
  where p.oid = 'public.curar_evento(integer,integer,text)'::regprocedure
    and a.grantee = 0), 'PUBLIC não tem execute');

-- ============ anon nega ============
set local role anon;
select throws_ok(
  $$select public.curar_evento(
      (select (valor->>'id')::int from t where nome = 'evento1'), 1, 'approved')$$,
  '42501', 'permission denied for function curar_evento', 'anon não executa curar_evento');
reset role;

-- ============ authenticated sem vínculo de curador ativo nega ============
set local role authenticated;
set local request.jwt.claims to '{"sub":"71000000-0000-0000-0000-000000000002"}';
select throws_ok(
  $$select public.curar_evento(
      (select (valor->>'id')::int from t where nome = 'evento1'), 1, 'approved')$$,
  '42501', 'curar_evento: operador sem vínculo de curador ativo',
  'authenticated sem vínculo de curador ativo não cura');
reset role;

-- ============ status inválido e evento inexistente ============
set local role authenticated;
set local request.jwt.claims to '{"sub":"71000000-0000-0000-0000-000000000001"}';
select throws_ok(
  $$select public.curar_evento(
      (select (valor->>'id')::int from t where nome = 'evento1'), 1, 'publicado')$$,
  '22023', 'curar_evento: status deve ser approved ou rejected',
  'status fora de approved/rejected é recusado');
select throws_ok(
  $$select public.curar_evento(-1, 1, 'approved')$$,
  '23503', 'curar_evento: evento coletado não encontrado',
  'evento inexistente é recusado');
reset role;

-- ============ curador aprova (version confere) ============
set local role authenticated;
set local request.jwt.claims to '{"sub":"71000000-0000-0000-0000-000000000001"}';
insert into t select 'r1', public.curar_evento(
  (select (valor->>'id')::int from t where nome = 'evento1'),
  (select (valor->>'version')::int from t where nome = 'evento1'),
  'approved');
reset role;

select is((select valor ->> 'curation_status' from t where nome = 'r1'), 'approved',
  'r1: curation_status vira approved');
select ok((select valor ->> 'curation_at' from t where nome = 'r1') is not null,
  'r1: curation_at registrado');
select results_eq(
  $$select curation_status, version, export_status, space_match_status, mapas_import_status
    from public.events where external_id = 'pgtap-curar-1'$$,
  $$values ('approved', 1, 'not_exported', 'unmatched', 'not_reported')$$,
  'aprovar não altera version, export_status, space_match_status ou mapas_import_status');

-- ============ version divergente recusa ============
set local role authenticated;
set local request.jwt.claims to '{"sub":"71000000-0000-0000-0000-000000000001"}';
select throws_ok(
  $$select public.curar_evento(
      (select (valor->>'id')::int from t where nome = 'evento1'), 999, 'rejected')$$,
  '23505', 'curar_evento: version divergente, recarregue o evento',
  'version divergente é recusada, sem alterar curation_status');
reset role;

select is((select curation_status from public.events where external_id = 'pgtap-curar-1'),
  'approved', 'curation_status permanece approved após tentativa com version divergente');

-- ============ curador rejeita (version ainda confere) ============
set local role authenticated;
set local request.jwt.claims to '{"sub":"71000000-0000-0000-0000-000000000001"}';
insert into t select 'r2', public.curar_evento(
  (select (valor->>'id')::int from t where nome = 'evento1'),
  (select version from public.events where external_id = 'pgtap-curar-1'),
  'rejected');
reset role;

select is((select valor ->> 'curation_status' from t where nome = 'r2'), 'rejected',
  'r2: curador pode corrigir para rejected (version não mudou)');
select is((select version from public.events where external_id = 'pgtap-curar-1'), 1,
  'version continua 1 depois de aprovar e rejeitar');

-- ============ argumentos obrigatórios ============
set local role authenticated;
set local request.jwt.claims to '{"sub":"71000000-0000-0000-0000-000000000001"}';
select throws_ok(
  $$select public.curar_evento(null, 1, 'approved')$$,
  '22023', 'curar_evento: evento e version são obrigatórios',
  'evento nulo é recusado');
select throws_ok(
  $$select public.curar_evento(
      (select (valor->>'id')::int from t where nome = 'evento1'), null, 'approved')$$,
  '22023', 'curar_evento: evento e version são obrigatórios',
  'version nula é recusada');
reset role;

-- ============ agenda pública intocada ============
select is(jsonb_build_object(
    'eventos', (select count(*) from public.eventos),
    'datas', (select count(*) from public.eventos_datas),
    'espacos', (select count(*) from public.espacos)),
  (select valor from t where nome = 'agenda_antes'),
  'nada novo em public.eventos, eventos_datas ou espacos depois da curadoria');
select is((select count(*) from public.eventos where nome = 'Evento para curar'), 0::bigint,
  'evento coletado não aparece em public.eventos');

set local role anon;
select throws_ok($$select count(*) from public.events$$, '42501', null,
  'anon continua sem ler public.events depois da curadoria');
reset role;

select * from finish();
rollback;
