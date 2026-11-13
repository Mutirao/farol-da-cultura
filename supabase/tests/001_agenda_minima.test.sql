-- M1: privilégios efetivos, RLS e restrições das tabelas da agenda.
-- Os dados de teste usam fonte 'pgtap' para não depender do que o seed.sql trouxer.
begin;
select plan(30);

-- RLS ligado nas cinco tabelas (5 testes; tabela faltando quebra o plano).
select ok(c.relrowsecurity, format('RLS ligado em public.%s', c.relname))
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relname in ('espacos', 'eventos', 'eventos_datas', 'categorias', 'eventos_categorias')
order by c.relname;

-- Privilégio efetivo: anon e authenticated só leem (10 testes).
select table_privs_are(
  'public', t, r, array['SELECT'],
  format('%s só tem SELECT em public.%s', r, t)
)
from unnest(array['espacos', 'eventos', 'eventos_datas', 'categorias', 'eventos_categorias']) as t
cross join unnest(array['anon', 'authenticated']) as r
order by t, r;

-- Dados de teste, gravados como dono das tabelas.
insert into public.espacos (fonte, id_externo, nome, publicado) values
  ('pgtap', 'espaco-publicado', 'Espaço publicado', true),
  ('pgtap', 'espaco-oculto', 'Espaço oculto', false);

insert into public.eventos (fonte, id_externo, nome, publicado) values
  ('pgtap', 'evento-publicado', 'Evento publicado', true),
  ('pgtap', 'evento-oculto', 'Evento oculto', false);

insert into public.categorias (nome) values ('pgtap-categoria');

insert into public.eventos_categorias (evento_id, categoria_id)
select e.id, c.id
from public.eventos e
cross join public.categorias c
where e.fonte = 'pgtap' and c.nome = 'pgtap-categoria';

insert into public.eventos_datas (evento_id, espaco_id, id_externo, inicio)
select e.id, s.id, 'pgtap-data-' || e.id_externo, now()
from public.eventos e
join public.espacos s on s.fonte = 'pgtap' and s.id_externo = 'espaco-publicado'
where e.fonte = 'pgtap';

-- Visitante sem sessão (anon): lê só o publicado e não escreve (8 testes).
set local role anon;

select results_eq(
  $$select nome from public.eventos where fonte = 'pgtap'$$,
  array['Evento publicado'],
  'anon só lê evento publicado'
);

select results_eq(
  $$select nome from public.espacos where fonte = 'pgtap'$$,
  array['Espaço publicado'],
  'anon só lê espaço publicado'
);

select results_eq(
  $$select id_externo from public.eventos_datas where id_externo like 'pgtap-data-%'$$,
  array['pgtap-data-evento-publicado'],
  'anon só lê data de evento publicado'
);

select results_eq(
  $$select count(*)::int from public.eventos_categorias ec
    join public.categorias c on c.id = ec.categoria_id
    where c.nome = 'pgtap-categoria'$$,
  array[1],
  'anon só lê categoria de evento publicado'
);

select results_eq(
  $$select nome from public.categorias where nome = 'pgtap-categoria'$$,
  array['pgtap-categoria'],
  'anon lê a lista de categorias'
);

select throws_ok(
  $$insert into public.eventos (fonte, id_externo, nome, publicado) values ('pgtap', 'invasor', 'x', true)$$,
  '42501', null, 'anon não insere evento'
);

select throws_ok(
  $$update public.eventos set publicado = true where fonte = 'pgtap'$$,
  '42501', null, 'anon não altera evento'
);

select throws_ok(
  $$delete from public.eventos where fonte = 'pgtap'$$,
  '42501', null, 'anon não apaga evento'
);

reset role;

-- Usuário com sessão (authenticated): mesma leitura pública (2 testes).
set local role authenticated;

select results_eq(
  $$select nome from public.eventos where fonte = 'pgtap'$$,
  array['Evento publicado'],
  'authenticated só lê evento publicado'
);

select results_eq(
  $$select id_externo from public.eventos_datas where id_externo like 'pgtap-data-%'$$,
  array['pgtap-data-evento-publicado'],
  'authenticated só lê data de evento publicado'
);

reset role;

-- Restrições que seguram erro de importação (5 testes).
select throws_ok(
  $$insert into public.eventos (fonte, id_externo, nome) values ('pgtap', 'evento-publicado', 'repetido')$$,
  '23505', null, 'mesma fonte e id externo não entra duas vezes em eventos'
);

select throws_ok(
  $$insert into public.eventos_datas (evento_id, id_externo, inicio)
    select id, 'pgtap-data-evento-publicado', now() from public.eventos
    where fonte = 'pgtap' and id_externo = 'evento-publicado'$$,
  '23505', null, 'mesma data não entra duas vezes no mesmo evento'
);

select throws_ok(
  $$insert into public.espacos (fonte, id_externo, nome, latitude) values ('pgtap', 'meia-coordenada', 'x', -3.7)$$,
  '23514', null, 'latitude sem longitude é recusada'
);

select throws_ok(
  $$insert into public.espacos (fonte, id_externo, nome, latitude, longitude)
    values ('pgtap', 'fora-da-faixa', 'x', -91, -38.5)$$,
  '23514', null, 'coordenada fora da faixa é recusada'
);

select throws_ok(
  $$insert into public.eventos_datas (evento_id, id_externo, inicio, fim)
    select id, 'pgtap-fim-antes', now(), now() - interval '1 hour' from public.eventos
    where fonte = 'pgtap' and id_externo = 'evento-publicado'$$,
  '23514', null, 'fim antes do início é recusado'
);

select * from finish();
rollback;
