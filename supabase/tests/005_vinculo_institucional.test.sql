-- S0.2 — Vínculo coletado ↔ institucional: tabela privada, view de leitura
-- (security_invoker), registrar_incorporacao (curador ativo) e
-- confirmar_incorporacao (só service_role). Ver docs/ONTOLOGIA-E-FLUXO.md §4/§5.

begin;
select plan(45);

-- ============ Fixtures (transação com rollback) ============
insert into auth.users (id, aud, role, email, created_at, updated_at)
values ('a5020000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
        's02-curador@teste.local', now(), now()),
       ('a5020000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
        's02-semvinculo@teste.local', now(), now()),
       ('a5020000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
        's02-inativo@teste.local', now(), now());

insert into public.users (id, email, is_active, role)
values (9501, 's02-curador@teste.local', true, 'curator'),
       (9502, 's02-inativo@teste.local', false, 'curator');

insert into private.curator_identities (auth_user_id, user_id)
values ('a5020000-0000-4000-8000-000000000001', 9501),
       ('a5020000-0000-4000-8000-000000000003', 9502);

insert into public.sources (id, slug, name)
values (9501, 's02-fonte-teste', 'Fonte Teste S0.2');

insert into public.events (id, source_id, external_id, title, raw_json, curation_status)
values (9501, 9501, 's02-aprovado', 'Evento aprovado S0.2', '{}'::jsonb, 'approved'),
       (9502, 9501, 's02-pendente', 'Evento pendente S0.2', '{}'::jsonb, 'pending'),
       (9503, 9501, 's02-rejeitado', 'Evento rejeitado S0.2', '{}'::jsonb, 'rejected'),
       (9504, 9501, 's02-aprovado-2', 'Segundo aprovado S0.2', '{}'::jsonb, 'approved');

-- Agenda publicada de referência: o retrato do anon não pode ficar vazio.
insert into public.eventos (id, fonte, id_externo, nome, publicado)
overriding system value
values (9951, 'mapa-cultural-ce', 's02-evento-publico', 'Evento Público S0.2', true);

-- Retrato do que o anon vê em public.eventos antes de qualquer RPC.
set local role anon;
do $$
begin
  perform set_config(
    'farol.s02_agenda_antes',
    (select count(*) || ':' || coalesce(md5(string_agg(e.id::text, ',' order by e.id)), '')
     from public.eventos e),
    true
  );
end;
$$;
reset role;

-- ============ Estrutura e privilégios ============
select is(
  (select c.relrowsecurity from pg_class c
   where c.oid = 'private.vinculos_institucionais'::regclass),
  true, 'RLS habilitado na tabela privada de vínculos');

select ok(
  (select c.reloptions @> array['security_invoker=true'] from pg_class c
   where c.oid = 'public.vinculos_institucionais'::regclass),
  'view pública de leitura é security_invoker');

select is(
  array[
    has_function_privilege('anon',
      'public.registrar_incorporacao(integer, text, text, text)', 'execute'),
    has_function_privilege('authenticated',
      'public.registrar_incorporacao(integer, text, text, text)', 'execute'),
    has_function_privilege('service_role',
      'public.registrar_incorporacao(integer, text, text, text)', 'execute'),
    has_function_privilege('anon',
      'public.confirmar_incorporacao(integer, boolean)', 'execute'),
    has_function_privilege('authenticated',
      'public.confirmar_incorporacao(integer, boolean)', 'execute'),
    has_function_privilege('service_role',
      'public.confirmar_incorporacao(integer, boolean)', 'execute')
  ],
  array[false, true, false, false, false, true],
  'EXECUTE: registrar só authenticated; confirmar só service_role');

select is(
  (select array_agg(p.prosecdef and p.proconfig @> array['search_path=""'])
   from pg_proc p
   where p.oid in (
     'public.registrar_incorporacao(integer, text, text, text)'::regprocedure,
     'public.confirmar_incorporacao(integer, boolean)'::regprocedure)),
  array[true, true], 'RPCs são security definer com search_path vazio');

-- ============ 1. anon não executa nem lê ============
set local role anon;
select throws_ok(
  $$select public.registrar_incorporacao(9501, 'instancia-teste', 'mapa-cultural-ce', '4242')$$,
  '42501', null, 'anon não executa registrar_incorporacao');
select throws_ok(
  $$select public.confirmar_incorporacao(9501, true)$$,
  '42501', null, 'anon não executa confirmar_incorporacao');
select throws_ok(
  $$select * from public.vinculos_institucionais$$,
  '42501', null, 'anon não lê a view de vínculos');
select throws_ok(
  $$select * from private.vinculos_institucionais$$,
  '42501', null, 'anon não lê a tabela privada');

-- ============ 2. authenticated sem vínculo de curador é negado ============
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"a5020000-0000-4000-8000-000000000002"}';
select throws_ok(
  $$select public.registrar_incorporacao(9501, 'instancia-teste', 'mapa-cultural-ce', '4242')$$,
  '42501', 'registrar_incorporacao: operador sem vínculo de curador ativo',
  'authenticated sem vínculo de curador não registra');

set local request.jwt.claims to '{"sub":"a5020000-0000-4000-8000-000000000003"}';
select throws_ok(
  $$select public.registrar_incorporacao(9501, 'instancia-teste', 'mapa-cultural-ce', '4242')$$,
  '42501', 'registrar_incorporacao: operador sem vínculo de curador ativo',
  'curador inativo não registra');

-- ============ 3. curador ativo registra evento aprovado ============
set local request.jwt.claims to '{"sub":"a5020000-0000-4000-8000-000000000001"}';
select is(
  public.registrar_incorporacao(9501, ' instancia-teste ', ' mapa-cultural-ce ', ' 4242 ')
    - 'id' - 'registrado_em',
  '{"event_id": 9501, "instancia": "instancia-teste", "base": "mapa-cultural-ce",
    "tipo_entidade": "event", "mapas_id": "4242", "estado": "registrado",
    "registrado_por": 9501, "verificado_em": null}'::jsonb,
  'curador registra evento aprovado: estado registrado, autor vindo da sessão');

select results_eq(
  $$select event_id, instancia, base, tipo_entidade, mapas_id, estado, registrado_por,
           registrado_em is not null, verificado_em
    from public.vinculos_institucionais where event_id = 9501$$,
  $$values (9501, 'instancia-teste', 'mapa-cultural-ce', 'event', '4242', 'registrado',
            9501, true, null::timestamptz)$$,
  'curador lê o estado do vínculo pela view');

-- ============ 4. evento não aprovado é recusado ============
select throws_ok(
  $$select public.registrar_incorporacao(9502, 'instancia-teste', 'mapa-cultural-ce', '4300')$$,
  '23514', 'registrar_incorporacao: evento não aprovado na curadoria',
  'evento pendente é recusado');
select throws_ok(
  $$select public.registrar_incorporacao(9503, 'instancia-teste', 'mapa-cultural-ce', '4300')$$,
  '23514', 'registrar_incorporacao: evento não aprovado na curadoria',
  'evento rejeitado é recusado');
select throws_ok(
  $$select public.registrar_incorporacao(-1, 'instancia-teste', 'mapa-cultural-ce', '4300')$$,
  '23503', 'registrar_incorporacao: evento coletado não encontrado',
  'evento inexistente é recusado');
select throws_ok(
  $$select public.registrar_incorporacao(9504, 'instancia-teste', 'mapa-cultural-ce', '   ')$$,
  '22023', 'registrar_incorporacao: evento, instância, base e ID no Mapas são obrigatórios',
  'ID no Mapas em branco é recusado');
select throws_ok(
  $$select public.registrar_incorporacao(9504, 'instancia-teste', null, '4300')$$,
  '22023', 'registrar_incorporacao: evento, instância, base e ID no Mapas são obrigatórios',
  'base nula é recusada');
select is(
  (select count(*) from public.vinculos_institucionais where event_id in (9502, 9503, 9504)),
  0::bigint, 'recusas não gravam vínculo');

-- Replay e correção enquanto o vínculo não foi confirmado.
select is(
  public.registrar_incorporacao(9501, 'instancia-teste', 'mapa-cultural-ce', '4242')
    - 'id' - 'registrado_em',
  '{"event_id": 9501, "instancia": "instancia-teste", "base": "mapa-cultural-ce",
    "tipo_entidade": "event", "mapas_id": "4242", "estado": "registrado",
    "registrado_por": 9501, "verificado_em": null}'::jsonb,
  'replay com o mesmo destino devolve o mesmo vínculo');
select is(
  (select count(*) from public.vinculos_institucionais where event_id = 9501),
  1::bigint, 'replay não duplica o vínculo');
select is(
  public.registrar_incorporacao(9501, 'instancia-teste', 'mapa-cultural-ce', '4243')
    - 'id' - 'registrado_em',
  '{"event_id": 9501, "instancia": "instancia-teste", "base": "mapa-cultural-ce",
    "tipo_entidade": "event", "mapas_id": "4243", "estado": "registrado",
    "registrado_por": 9501, "verificado_em": null}'::jsonb,
  'curador corrige o destino de um vínculo ainda não confirmado');
select is(
  public.registrar_incorporacao(9504, 'instancia-teste', 'mapa-cultural-ce', '5000')
    ->> 'estado',
  'registrado', 'curador registra um segundo evento aprovado');

-- ============ 5. authenticated não confirma nem escreve direto ============
select throws_ok(
  $$select public.confirmar_incorporacao(9501, true)$$,
  '42501', null, 'curador (authenticated) não executa confirmar_incorporacao');
select throws_ok(
  $$insert into public.vinculos_institucionais
      (event_id, instancia, base, mapas_id, registrado_por)
    values (9502, 'instancia-teste', 'mapa-cultural-ce', '1', 9501)$$,
  '42501', null, 'curador não insere vínculo pela view');
select throws_ok(
  $$update public.vinculos_institucionais
    set estado = 'confirmado', verificado_em = now() where event_id = 9501$$,
  '42501', null, 'curador não confirma por update direto');
select throws_ok(
  $$delete from public.vinculos_institucionais where event_id = 9501$$,
  '42501', null, 'curador não remove vínculo pela view');
select throws_ok(
  $$select * from private.vinculos_institucionais$$,
  '42501', null, 'curador não acessa a tabela privada diretamente');

-- Com vínculos gravados, quem não é curador ativo continua sem ler nada.
set local request.jwt.claims to '{"sub":"a5020000-0000-4000-8000-000000000002"}';
select is((select count(*) from public.vinculos_institucionais), 0::bigint,
  'authenticated sem vínculo de curador não lê vínculos');
set local request.jwt.claims to '{"sub":"a5020000-0000-4000-8000-000000000003"}';
select is((select count(*) from public.vinculos_institucionais), 0::bigint,
  'curador inativo não lê vínculos');

-- ============ 6. service_role confirma e marca divergente ============
reset role;
set local role service_role;
set local request.jwt.claims to '{"role":"service_role"}';
select throws_ok(
  $$select public.registrar_incorporacao(9504, 'instancia-teste', 'mapa-cultural-ce', '5000')$$,
  '42501', null, 'service_role não registra: autoria exige curador');
select results_eq(
  $$select event_id, base, mapas_id from public.vinculos_institucionais
    where estado = 'registrado' and event_id in (9501, 9504) order by event_id$$,
  $$values (9501, 'mapa-cultural-ce', '4243'), (9504, 'mapa-cultural-ce', '5000')$$,
  'service_role lista os vínculos registrados pela view');
select is(
  public.confirmar_incorporacao(9501, true) - 'id' - 'registrado_em' - 'verificado_em',
  '{"event_id": 9501, "instancia": "instancia-teste", "base": "mapa-cultural-ce",
    "tipo_entidade": "event", "mapas_id": "4243", "estado": "confirmado",
    "registrado_por": 9501}'::jsonb,
  'service_role confirma: estado confirmado');
select ok(
  (select estado = 'confirmado' and verificado_em is not null
   from public.vinculos_institucionais where event_id = 9501),
  'confirmação grava o instante da verificação');
select is(
  public.confirmar_incorporacao(9504, false) ->> 'estado',
  'divergente', 'service_role marca divergente');
select ok(
  (select estado = 'divergente' and verificado_em is not null
   from public.vinculos_institucionais where event_id = 9504),
  'divergência grava estado e instante da verificação');
select throws_ok(
  $$select public.confirmar_incorporacao(9502, true)$$,
  '23503', 'confirmar_incorporacao: evento sem vínculo registrado',
  'confirmar evento sem vínculo é recusado');
select throws_ok(
  $$select public.confirmar_incorporacao(9501, null)$$,
  '22023', 'confirmar_incorporacao: evento e resultado da conferência são obrigatórios',
  'resultado nulo da conferência é recusado');

-- ============ 7. vínculo confirmado não coloca nada na agenda ============
reset role;
set local role anon;
select is(
  (select count(*) from public.eventos
   where nome in ('Evento aprovado S0.2', 'Segundo aprovado S0.2')),
  0::bigint, 'evento coletado com vínculo confirmado não aparece em public.eventos');

-- ============ Transições depois da conferência ============
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"a5020000-0000-4000-8000-000000000001"}';
select is(
  public.registrar_incorporacao(9501, 'instancia-teste', 'mapa-cultural-ce', '4243')
    ->> 'estado',
  'confirmado', 'replay sobre vínculo confirmado não desfaz a confirmação');
select throws_ok(
  $$select public.registrar_incorporacao(9501, 'instancia-teste', 'mapa-cultural-ce', '9999')$$,
  '23505', 'registrar_incorporacao: vínculo já confirmado não pode ser alterado',
  'vínculo confirmado não muda de destino');
select is(
  public.registrar_incorporacao(9504, 'instancia-teste', 'mapa-cultural-ce', '5000')
    - 'id' - 'registrado_em',
  '{"event_id": 9504, "instancia": "instancia-teste", "base": "mapa-cultural-ce",
    "tipo_entidade": "event", "mapas_id": "5000", "estado": "registrado",
    "registrado_por": 9501, "verificado_em": null}'::jsonb,
  'registrar de novo um vínculo divergente pede nova conferência');

reset role;
set local role service_role;
set local request.jwt.claims to '{"role":"service_role"}';
select is(
  public.confirmar_incorporacao(9501, false) ->> 'estado',
  'divergente', 'nova conferência pode marcar divergente um vínculo confirmado');

-- ============ Fronteira: nada além do vínculo é escrito ============
reset role;
select results_eq(
  $$select id, curation_status, export_status, mapas_import_status, version
    from public.events where id in (9501, 9504) order by id$$,
  $$values (9501, 'approved', 'not_exported', 'not_reported', 1),
           (9504, 'approved', 'not_exported', 'not_reported', 1)$$,
  'RPCs não escrevem em public.events');

delete from public.events where id = 9504;
select is(
  (select count(*) from private.vinculos_institucionais where event_id = 9504),
  0::bigint, 'remover o evento coletado remove o vínculo');

set local role anon;
select is(
  (select count(*) || ':' || coalesce(md5(string_agg(e.id::text, ',' order by e.id)), '')
   from public.eventos e),
  current_setting('farol.s02_agenda_antes'),
  'anon vê exatamente a mesma agenda em public.eventos: nada novo');

select * from finish();
rollback;
