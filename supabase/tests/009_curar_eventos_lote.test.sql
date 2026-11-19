-- U3.1 — contratos de lote, autorização real e preservação da agenda.
begin;
select plan(38);
create temp table t (nome text primary key, valor jsonb);
grant all on t to authenticated;
grant select on t to anon;
insert into auth.users (id, aud, role, email, created_at, updated_at)
values ('91000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
 'lote-curador@teste.local', now(), now()),
 ('91000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
 'lote-sem-vinculo@teste.local', now(), now());
insert into public.users (id, email, is_active, role)
values (9941, 'lote-curador@teste.local', true, 'curator');
insert into private.curator_identities (auth_user_id, user_id)
values ('91000000-0000-0000-0000-000000000001', 9941);
insert into public.sources (slug, name, kind)
values ('lote-teste', 'Lote teste', 'ticket_platform');
insert into public.events (source_id, external_id, title, raw_json,
 export_status, export_at, export_error, space_match_status, space_match_at,
 space_match_error, mapas_import_status, mapas_import_at, mapas_import_error)
select s.id, 'lote-' || n, 'Evento lote ' || n, '{}'::jsonb,
 'exported', now(), '{"export":true}', 'matched', now(), '{"match":true}',
 'confirmed', now(), '{"mapas":true}'
from public.sources s cross join generate_series(1,100) n where s.slug = 'lote-teste';
insert into t select 'itens', jsonb_agg(jsonb_build_object('id', id, 'version', version) order by id)
from public.events where external_id like 'lote-%';
insert into t select 'protegidos', jsonb_agg(to_jsonb(e) - 'curation_status' - 'curation_at' - 'curation_error' order by id)
from public.events e where external_id like 'lote-%';
-- Conteúdo completo, não apenas contagens: detecta alterações de agenda.
insert into t values ('agenda', jsonb_build_object(
 'eventos', (select coalesce(jsonb_agg(to_jsonb(e) order by id), '[]') from public.eventos e),
 'datas', (select coalesce(jsonb_agg(to_jsonb(e) order by id), '[]') from public.eventos_datas e),
 'espacos', (select coalesce(jsonb_agg(to_jsonb(e) order by id), '[]') from public.espacos e)));
select has_function('public', 'curar_eventos', array['jsonb','text'], 'RPC existe');
select is_definer('public', 'curar_eventos', array['jsonb','text'], 'definer necessário para escrita sem grant de tabela');
select ok((select 'search_path=""' = any(proconfig) from pg_proc
 where oid = 'public.curar_eventos(jsonb,text)'::regprocedure), 'search_path vazio');
select ok(has_function_privilege('authenticated','public.curar_eventos(jsonb,text)','execute'), 'authenticated executa');
select ok(not has_function_privilege('anon','public.curar_eventos(jsonb,text)','execute'), 'anon sem execute');
select ok(not has_function_privilege('service_role','public.curar_eventos(jsonb,text)','execute'), 'service_role sem execute');
select ok(not exists (select 1 from pg_proc p, aclexplode(p.proacl) a
 where p.oid = 'public.curar_eventos(jsonb,text)'::regprocedure and a.grantee = 0), 'PUBLIC sem execute');
set local role anon;
select throws_ok($$select public.curar_eventos((select valor from t where nome='itens'), 'approved')$$,
 '42501', 'permission denied for function curar_eventos', 'anon não executa');
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"91000000-0000-0000-0000-000000000002","user_metadata":{"role":"curator","decidedBy":9941}}';
select throws_ok($$select public.curar_eventos((select valor from t where nome='itens'), 'approved')$$,
 '42501', 'curar_eventos: operador sem vínculo de curador ativo', 'sem vínculo nega mesmo com metadata forjada');
reset role;
select is((select count(*) from public.events where external_id like 'lote-%' and curation_status <> 'pending'),
 0::bigint, 'tentativas não autorizadas não gravam');
set local role authenticated;
set local request.jwt.claims to '{"sub":"91000000-0000-0000-0000-000000000001","user_metadata":{"decidedBy":123}}';
select throws_ok($$select public.curar_eventos('[]', 'approved')$$,
 '22023', 'curar_eventos: informe uma lista de 1 a 100 itens', 'zero itens recusa');
select throws_ok($$select public.curar_eventos((select valor || jsonb_build_array(valor->0) from t where nome='itens'), 'approved')$$,
 '22023', 'curar_eventos: informe uma lista de 1 a 100 itens', '101 itens recusa');
select throws_ok($$select public.curar_eventos('{}', 'approved')$$,
 '22023', 'curar_eventos: informe uma lista de 1 a 100 itens', 'objeto não é lista');
select throws_ok($$select public.curar_eventos(null, 'approved')$$,
 '22023', 'curar_eventos: informe uma lista de 1 a 100 itens', 'lista nula recusa');
select throws_ok($$select public.curar_eventos((select valor from t where nome='itens'), 'pending')$$,
 '22023', 'curar_eventos: status deve ser approved ou rejected', 'status inválido recusa');
select throws_ok($$select public.curar_eventos((select jsonb_build_array(valor->0, (valor->0) || '{"version":99}') from t where nome='itens'), 'approved')$$,
 '22023', 'curar_eventos: versões divergentes para o mesmo id', 'duplicata divergente recusa');
select throws_ok($$select public.curar_eventos('[{}]', 'approved')$$,
 '22023', 'curar_eventos: cada item deve conter somente id e version inteiros', 'campos ausentes recusa');
select throws_ok($$select public.curar_eventos('[ {"id":1,"version":1,"decidedBy":123} ]', 'approved')$$,
 '22023', 'curar_eventos: cada item deve conter somente id e version inteiros', 'autor forjado no item recusa');
select throws_ok($$select public.curar_eventos('[{"id":1.5,"version":1}]', 'approved')$$,
 '22023', 'curar_eventos: cada item deve conter somente id e version inteiros', 'id fracionário recusa');
select throws_ok($$select public.curar_eventos('[{"id":2147483648,"version":1}]', 'approved')$$,
 '22023', 'curar_eventos: cada item deve conter somente id e version inteiros', 'overflow recusa');
insert into t select 'r100', public.curar_eventos((select valor from t where nome='itens'), 'approved');
reset role;
select is((select jsonb_array_length(valor->'alterados') from t where nome='r100'), 100, '100 itens aprovados');
select is((select count(*) from public.events where external_id like 'lote-%' and curation_status='approved'), 100::bigint, 'aprovação persistida');
select ok((select bool_and(curation_error->>'decidedBy' = '9941' and curation_error->>'decidedAt' is not null and curation_at is not null)
 from public.events where external_id like 'lote-%'), 'auditoria deriva do curador e não da metadata');
select is((select count(*) from public.events where external_id like 'lote-%' and version=1), 100::bigint, 'version preservada como na RPC unitária');
set local role authenticated;
insert into t select 'duplicados', public.curar_eventos(
 (select jsonb_build_array(valor->0,valor->0) from t where nome='itens'), 'rejected');
reset role;
select is((select jsonb_array_length(valor->'alterados') from t where nome='duplicados'), 1, 'id repetido deduplicado');
insert into t select 'conflitado_antes', to_jsonb(e) from public.events e
where id=(select (valor->0->>'id')::int from t where nome='itens');
set local role authenticated;
insert into t select 'misto', public.curar_eventos(
 (select jsonb_build_array((valor->0)||'{"version":999}', valor->1, '{"id":-1,"version":1}'::jsonb)
 from t where nome='itens'), 'rejected');
reset role;
select is((select valor->'conflitos' from t where nome='misto'),
 (select jsonb_build_array(valor->0->'id') from t where nome='itens'), 'conflito listado por id');
select is((select valor->'ausentes' from t where nome='misto'), '[-1]'::jsonb, 'ausente listado');
select is((select valor->'alterados' from t where nome='misto'),
 (select jsonb_build_array(valor->1->'id') from t where nome='itens'), 'demais itens alterados');
select is((select to_jsonb(e) from public.events e where id=(select (valor->0->>'id')::int from t where nome='itens')),
 (select valor from t where nome='conflitado_antes'), 'conflitado não sofre nenhuma escrita');
select is((select curation_status from public.events where id=(select (valor->1->>'id')::int from t where nome='itens')),
 'rejected', 'lote misto rejeita o item sem conflito');
set local role authenticated;
insert into t select 'unitario', public.curar_evento(
 (select (valor->2->>'id')::int from t where nome='itens'), 1, 'rejected');
reset role;
select is((select valor->'curation_error'->>'decidedBy' from t where nome='unitario'), '9941', 'unitário compartilha auditoria');
update public.users set is_active=false where id=9941;
set local role authenticated;
select throws_ok($$select public.curar_eventos((select valor from t where nome='itens'), 'rejected')$$,
 '42501', 'curar_eventos: operador sem vínculo de curador ativo', 'mesmo sub inativo perde acesso ao lote inteiro');
reset role;
select is((select count(*) from public.events where external_id like 'lote-%' and curation_status='rejected'), 3::bigint, 'inativo não altera os demais itens');
select is((select jsonb_agg(to_jsonb(e) - 'curation_status' - 'curation_at' - 'curation_error' order by id)
 from public.events e where external_id like 'lote-%'),
 (select valor from t where nome='protegidos'), 'todos os outros campos intactos: export/matching/confirmação/version');
select is(jsonb_build_object(
 'eventos', (select coalesce(jsonb_agg(to_jsonb(e) order by id), '[]') from public.eventos e),
 'datas', (select coalesce(jsonb_agg(to_jsonb(e) order by id), '[]') from public.eventos_datas e),
 'espacos', (select coalesce(jsonb_agg(to_jsonb(e) order by id), '[]') from public.espacos e)),
 (select valor from t where nome='agenda'), 'agenda pública integralmente inalterada');
select is((select count(*) from public.eventos where nome like 'Evento lote %'), 0::bigint, 'aprovação não publica coleta');
select is((select valor->'conflitos' from t where nome='r100'), '[]'::jsonb, 'sem conflitos no lote válido');
select is((select valor->'ausentes' from t where nome='r100'), '[]'::jsonb, 'sem ausentes no lote válido');
select * from finish();
rollback;
