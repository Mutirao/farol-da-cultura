-- S0.6: service_role lê id, title e starts_at de public.events para a
-- confirmação da incorporação; nada além disso, e anon/authenticated comum não.

begin;
select plan(9);

insert into auth.users (id, aud, role, email, created_at, updated_at)
values ('a5080000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
        's06-semvinculo@teste.local', now(), now());

insert into public.sources (id, slug, name)
values (9801, 's06-fonte-teste', 'Fonte Teste S0.6');

insert into public.events (id, source_id, external_id, title, starts_at, raw_json)
values (9801, 9801, 's06-evento', 'Evento S0.6', '2030-01-10 19:00+00', '{}'::jsonb);

select ok(
  has_column_privilege('service_role', 'public.events', 'id', 'SELECT')
  and has_column_privilege('service_role', 'public.events', 'title', 'SELECT')
  and has_column_privilege('service_role', 'public.events', 'starts_at', 'SELECT'),
  'service_role tem SELECT em id, title e starts_at');

select ok(
  not has_column_privilege('service_role', 'public.events', 'raw_json', 'SELECT')
  and not has_column_privilege('service_role', 'public.events', 'curation_status', 'SELECT'),
  'service_role não lê outras colunas de public.events');

select ok(
  not has_table_privilege('service_role', 'public.events', 'INSERT')
  and not has_table_privilege('service_role', 'public.events', 'UPDATE'),
  'service_role continua sem escrita direta em public.events');

select ok(
  not has_table_privilege('anon', 'public.events', 'SELECT')
  and not has_column_privilege('anon', 'public.events', 'title', 'SELECT'),
  'anon sem SELECT em public.events');

set local role service_role;
select results_eq(
  $$ select id, title, starts_at from public.events where id = 9801 $$,
  $$ values (9801, 'Evento S0.6'::text, '2030-01-10 19:00+00'::timestamptz) $$,
  'service_role lê título e início do evento coletado');

select throws_ok(
  $$ select raw_json from public.events where id = 9801 $$,
  '42501', null,
  'service_role não lê raw_json');
reset role;

set local role anon;
select throws_ok(
  $$ select id, title, starts_at from public.events $$,
  '42501', null,
  'anon não lê public.events');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"a5080000-0000-4000-8000-000000000001"}';
select is(
  (select count(*) from public.events where id = 9801)::int,
  0,
  'authenticated sem vínculo de curador não vê o evento');
select is(
  public.current_curator(),
  null,
  'authenticated de teste não é curador');
reset role;

select * from finish();
rollback;
