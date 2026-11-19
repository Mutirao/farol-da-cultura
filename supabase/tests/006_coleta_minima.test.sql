-- S0.3 — public.registrar_coleta_minima: só service_role, upsert restrito em
-- public.events, idempotência por run key, recoleta preserva curadoria e
-- nada chega à agenda pública. Ver supabase/migrations/20261117000600_coleta_minima.sql.

begin;
select plan(39);

-- ============ Fixtures (transação com rollback) ============
create temp table t (nome text primary key, valor jsonb);
grant all on t to service_role;
grant select on t to anon, authenticated;

insert into auth.users (id, aud, role, email, created_at, updated_at)
values ('63000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
        'coleta-curador@teste.local', now(), now());
insert into public.users (id, email, is_active, role)
values (9631, 'coleta-curador@teste.local', true, 'curator');
insert into private.curator_identities (auth_user_id, user_id)
values ('63000000-0000-0000-0000-000000000001', 9631);

insert into t values ('agenda_antes', jsonb_build_object(
  'eventos', (select count(*) from public.eventos),
  'datas', (select count(*) from public.eventos_datas),
  'espacos', (select count(*) from public.espacos)));

insert into t values ('lote1', $$[
  {"external_id": "pgtap-1", "title": "Show de teste", "source_url": "https://www.sympla.com.br/evento/show-de-teste/1",
   "starts_at": "2030-01-10T19:00:00-03:00", "ends_at": "2030-01-10T22:00:00-03:00",
   "venue_name": "Teatro Teste", "venue_address": "Rua A, Fortaleza, CE", "city": "Fortaleza",
   "modality": "in_person", "collection_status": "included", "collection_reason": null,
   "normalized_title": "show teste teatro teste", "raw_json": {"event": {"id": 1}}},
  {"external_id": "pgtap-2", "title": "Oficina sem data", "starts_at": null, "city": null,
   "modality": "unknown", "collection_status": "incomplete",
   "collection_reason": "missing_start,missing_city,unknown_modality", "raw_json": {"event": {"id": 2}}}
]$$);

-- Mesmo lote com o título de pgtap-1 alterado: recoleta com conteúdo novo.
insert into t
select 'lote2', jsonb_set(valor, '{0,title}', '"Show de teste (nova data)"')
from t where nome = 'lote1';

-- ============ Assinatura e privilégios ============
select has_function('public', 'registrar_coleta_minima', array['uuid', 'text', 'jsonb'],
  'registrar_coleta_minima(uuid, text, jsonb) existe');
select is_definer('public', 'registrar_coleta_minima', array['uuid', 'text', 'jsonb'],
  'registrar_coleta_minima é security definer');
select ok((select 'search_path=""' = any (p.proconfig) from pg_proc p
           where p.oid = 'public.registrar_coleta_minima(uuid,text,jsonb)'::regprocedure),
  'registrar_coleta_minima fixa search_path vazio');
select ok(has_function_privilege('service_role',
  'public.registrar_coleta_minima(uuid,text,jsonb)', 'execute'), 'service_role executa');
select ok(not has_function_privilege('anon',
  'public.registrar_coleta_minima(uuid,text,jsonb)', 'execute'), 'anon não tem execute');
select ok(not has_function_privilege('authenticated',
  'public.registrar_coleta_minima(uuid,text,jsonb)', 'execute'), 'authenticated não tem execute');
select ok(not exists (
  select 1 from pg_proc p, aclexplode(p.proacl) a
  where p.oid = 'public.registrar_coleta_minima(uuid,text,jsonb)'::regprocedure
    and a.grantee = 0), 'PUBLIC não tem execute');

-- ============ Quem não é service_role não executa ============
set local role anon;
select throws_ok(
  $$select public.registrar_coleta_minima(gen_random_uuid(), 'sympla',
      (select valor from t where nome = 'lote1'))$$,
  '42501', 'permission denied for function registrar_coleta_minima',
  'anon não executa registrar_coleta_minima');
select throws_ok($$select * from public.events$$, '42501', null, 'anon não lê public.events');

set local role authenticated;
set local request.jwt.claims to '{"sub":"63000000-0000-0000-0000-000000000001"}';
select throws_ok(
  $$select public.registrar_coleta_minima(gen_random_uuid(), 'sympla',
      (select valor from t where nome = 'lote1'))$$,
  '42501', 'permission denied for function registrar_coleta_minima',
  'nem curador ativo executa registrar_coleta_minima');
reset role;

-- ============ Primeira gravação ============
set local role service_role;
insert into t select 'r1', public.registrar_coleta_minima(
  '63000000-0000-0000-0000-0000000000a1', 'sympla', (select valor from t where nome = 'lote1'));
reset role;

select is((select valor -> 'inseridos' from t where nome = 'r1'), '2'::jsonb, 'r1: dois inseridos');
select is((select valor -> 'recebidos' from t where nome = 'r1'), '2'::jsonb, 'r1: dois recebidos');
select is((select count(*) from public.sources where slug = 'sympla'), 1::bigint,
  'fonte sympla criada ou reutilizada');
select results_eq(
  $$select e.external_id, e.version, e.curation_status, e.export_status,
           e.space_match_status, e.mapas_import_status
    from public.events e join public.sources s on s.id = e.source_id
    where s.slug = 'sympla' and e.external_id like 'pgtap-%' order by 1$$,
  $$values ('pgtap-1', 1, 'pending', 'not_exported', 'unmatched', 'not_reported'),
           ('pgtap-2', 1, 'pending', 'not_exported', 'unmatched', 'not_reported')$$,
  'linhas novas entram pendentes, version 1, ciclo de vida no padrão');
select is((select starts_at from public.events where external_id = 'pgtap-1'),
  '2030-01-10T22:00:00Z'::timestamptz, 'starts_at respeita o fuso explícito do lote');
select ok((select starts_at is null and city is null and collection_status = 'incomplete'
           from public.events where external_id = 'pgtap-2'),
  'campo ausente fica nulo e o evento entra incomplete');
select ok((select is_free = false and price_min is null and price_max is null
           from public.events where external_id = 'pgtap-2'),
  'gratuidade e preços não são escritos (default da tabela)');
select ok((select last_collected_at is not null from public.events where external_id = 'pgtap-1'),
  'last_collected_at registrado');
select is((select status || '/' || owner from public.job_runs
           where id = (select (valor ->> 'job_run_id')::int from t where nome = 'r1')),
  'succeeded/registrar_coleta_minima', 'job_run da gravação registrado');
select is((select job_run_id from private.recibos_idempotencia
           where chave = '63000000-0000-0000-0000-0000000000a1'),
  (select (valor ->> 'job_run_id')::int from t where nome = 'r1'),
  'recibo do run key aponta para o job_run');

-- ctid muda a cada UPDATE, inclusive dentro da mesma transação.
insert into t
select 'evento1', jsonb_build_object('linha', to_jsonb(e), 'ctid', e.ctid::text)
from public.events e where e.external_id = 'pgtap-1';

-- ============ Replay do mesmo run key ============
set local role service_role;
insert into t select 'r2', public.registrar_coleta_minima(
  '63000000-0000-0000-0000-0000000000a1', 'sympla', (select valor from t where nome = 'lote1'));
reset role;

select is((select valor from t where nome = 'r2'), (select valor from t where nome = 'r1'),
  'replay devolve exatamente o mesmo resultado');
select is((select count(*) from public.events where external_id like 'pgtap-%'), 2::bigint,
  'replay não duplica linhas');
select is((select sum(version) from public.events where external_id like 'pgtap-%'), 2::bigint,
  'replay não incrementa version');
select is((select jsonb_build_object('linha', to_jsonb(e), 'ctid', e.ctid::text)
           from public.events e where e.external_id = 'pgtap-1'),
  (select valor from t where nome = 'evento1'), 'replay não reescreve a linha');
select is((select count(*) from public.job_runs where owner = 'registrar_coleta_minima'
           and details ->> 'run_key' = '63000000-0000-0000-0000-0000000000a1'), 1::bigint,
  'replay não cria outro job_run');

set local role service_role;
select throws_ok(
  $$select public.registrar_coleta_minima('63000000-0000-0000-0000-0000000000a1', 'sympla',
      (select valor from t where nome = 'lote2'))$$,
  '23505', 'registrar_coleta_minima: run key já usado com outro lote',
  'mesmo run key com outro lote é recusado');
reset role;

-- ============ Recoleta preserva curadoria e demais ciclos ============
update public.events
set curation_status = 'approved', curation_at = '2030-01-01T12:00:00Z',
    curation_error = '{"nota": "teste"}', export_status = 'exported',
    export_at = '2030-01-02T12:00:00Z', space_match_status = 'matched',
    space_match_at = '2030-01-03T12:00:00Z', mapas_import_status = 'confirmed',
    mapas_import_at = '2030-01-04T12:00:00Z'
where external_id = 'pgtap-1';

insert into t
select 'ciclo1', jsonb_build_object('id', id, 'curation_status', curation_status,
  'curation_at', curation_at, 'curation_error', curation_error, 'export_status', export_status,
  'export_at', export_at, 'export_error', export_error, 'space_match_status', space_match_status,
  'space_match_at', space_match_at, 'space_match_error', space_match_error,
  'mapas_import_status', mapas_import_status, 'mapas_import_at', mapas_import_at,
  'mapas_import_error', mapas_import_error)
from public.events where external_id = 'pgtap-1';

set local role service_role;
insert into t select 'r3', public.registrar_coleta_minima(
  '63000000-0000-0000-0000-0000000000a2', 'sympla', (select valor from t where nome = 'lote2'));
reset role;

select is((select jsonb_build_object('inseridos', valor -> 'inseridos',
             'atualizados', valor -> 'atualizados', 'inalterados', valor -> 'inalterados')
           from t where nome = 'r3'),
  '{"inseridos": 0, "atualizados": 1, "inalterados": 1}'::jsonb,
  'recoleta: um atualizado, um inalterado');
select results_eq(
  $$select external_id, version, title from public.events
    where external_id like 'pgtap-%' order by 1$$,
  $$values ('pgtap-1', 2, 'Show de teste (nova data)'), ('pgtap-2', 1, 'Oficina sem data')$$,
  'version sobe só onde o conteúdo da fonte mudou');
select is(
  (select jsonb_build_object('id', id, 'curation_status', curation_status,
     'curation_at', curation_at, 'curation_error', curation_error, 'export_status', export_status,
     'export_at', export_at, 'export_error', export_error, 'space_match_status', space_match_status,
     'space_match_at', space_match_at, 'space_match_error', space_match_error,
     'mapas_import_status', mapas_import_status, 'mapas_import_at', mapas_import_at,
     'mapas_import_error', mapas_import_error)
   from public.events where external_id = 'pgtap-1'),
  (select valor from t where nome = 'ciclo1'),
  'recoleta preserva id, curation_*, export_*, space_match_* e mapas_import_*');

-- ============ Lotes inválidos ============
set local role service_role;
select throws_ok(
  $$select public.registrar_coleta_minima(gen_random_uuid(), 'sympla',
      '[{"external_id": "pgtap-1", "title": "X", "raw_json": {}, "curation_status": "approved"}]')$$,
  '22023', 'registrar_coleta_minima: item 1 tem campo não aceito: curation_status',
  'campo de ciclo de vida no lote é recusado');
select throws_ok(
  $$select public.registrar_coleta_minima(gen_random_uuid(), 'sympla',
      '[{"external_id": "a", "title": "X", "raw_json": {}},
        {"external_id": "a", "title": "Y", "raw_json": {}}]')$$,
  '22023', 'registrar_coleta_minima: item 2 repete external_id do lote',
  'external_id repetido no lote é recusado');
select throws_ok(
  $$select public.registrar_coleta_minima(gen_random_uuid(), 'sympla',
      '[{"external_id": "a", "title": "X", "raw_json": {}, "starts_at": "2030-01-10T19:00:00"}]')$$,
  '22007', 'registrar_coleta_minima: item 1 com instante sem fuso explícito',
  'instante sem fuso é recusado');
select throws_ok(
  $$select public.registrar_coleta_minima(gen_random_uuid(), 'sympla',
      '[{"external_id": "a", "raw_json": {}}]')$$,
  '22023', 'registrar_coleta_minima: item 1 sem external_id, title ou raw_json',
  'item sem título é recusado');
select throws_ok(
  $$select public.registrar_coleta_minima(gen_random_uuid(), 'mapa-cultural-ce',
      '[{"external_id": "a", "title": "X", "raw_json": {}}]')$$,
  '22023', 'registrar_coleta_minima: fonte não habilitada para coleta mínima',
  'outra fonte é recusada');
select throws_ok(
  $$select public.registrar_coleta_minima(gen_random_uuid(), 'sympla', '[]')$$,
  '22023', 'registrar_coleta_minima: eventos deve ser uma lista de 1 a 500 itens',
  'lote vazio é recusado');
reset role;

update public.sources set is_active = false where slug = 'sympla';
set local role service_role;
select throws_ok(
  $$select public.registrar_coleta_minima(gen_random_uuid(), 'sympla',
      '[{"external_id": "a", "title": "X", "raw_json": {}}]')$$,
  '55000', 'registrar_coleta_minima: fonte inativa', 'fonte inativa não grava');
reset role;

-- ============ Agenda pública intocada ============
select is(jsonb_build_object(
    'eventos', (select count(*) from public.eventos),
    'datas', (select count(*) from public.eventos_datas),
    'espacos', (select count(*) from public.espacos)),
  (select valor from t where nome = 'agenda_antes'),
  'nada novo em public.eventos, eventos_datas ou espacos');
select is((select count(*) from public.eventos where nome like 'Show de teste%'
           or nome = 'Oficina sem data'), 0::bigint, 'evento coletado não aparece em public.eventos');

set local role anon;
select throws_ok($$select count(*) from public.events$$, '42501', null,
  'anon continua sem ler public.events depois da coleta');
reset role;

select * from finish();
rollback;
