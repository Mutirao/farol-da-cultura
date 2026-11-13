-- M7: privilégios e comportamento de public.importar_agenda.
-- Usa fontes 'pgtap-*' e uma janela em 2030 para não depender do seed.sql.
begin;
select plan(30);

-- Privilégios (8 testes): só o servidor executa, e só com o que a importação usa.
select function_privs_are(
  'public', 'importar_agenda', array['text', 'jsonb'], 'service_role', array['EXECUTE'],
  'service_role executa importar_agenda'
);

select function_privs_are(
  'public', 'importar_agenda', array['text', 'jsonb'], r, '{}'::text[],
  format('%s não executa importar_agenda', r)
)
from unnest(array['anon', 'authenticated']) as r
order by r;

select table_privs_are(
  'public', t, 'service_role', array['SELECT', 'INSERT', 'UPDATE'],
  format('service_role lê e grava public.%s, sem apagar', t)
)
from unnest(array['categorias', 'espacos', 'eventos']) as t
order by t;

select table_privs_are(
  'public', t, 'service_role', array['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  format('service_role lê, grava e apaga public.%s', t)
)
from unnest(array['eventos_categorias', 'eventos_datas']) as t
order by t;

-- Lotes de teste, guardados na sessão para qualquer papel ler.
select set_config('pgtap.lote_1', $json${
  "janela": {"de": "2030-01-01T03:00:00Z", "ate": "2030-02-01T03:00:00Z"},
  "espacos": [
    {"id_externo": "e1", "nome": "Espaço Um", "descricao": "Sala", "endereco": "Rua A, 1",
     "municipio": "Fortaleza", "latitude": -3.7, "longitude": -38.5,
     "acessibilidade_fisica": ["Rampa de acesso"]},
    {"id_externo": "e2", "nome": "Espaço Dois", "latitude": null, "longitude": null}
  ],
  "eventos": [
    {"id_externo": "ev1", "nome": "Evento Um", "descricao_curta": "Curta",
     "classificacao_etaria": "Livre", "categorias": ["pgtap-Música", "pgtap-Teatro"],
     "datas": [
       {"id_externo": "o1.2030-01-10", "espaco_id_externo": "e1",
        "inicio": "2030-01-10T22:00:00Z", "fim": "2030-01-10T23:00:00Z",
        "preco": "Gratuito", "gratuito": true},
       {"id_externo": "o1.2030-01-17", "espaco_id_externo": "e1",
        "inicio": "2030-01-17T22:00:00Z", "fim": "2030-01-17T23:00:00Z",
        "preco": "Gratuito", "gratuito": true}
     ]},
    {"id_externo": "ev2", "nome": "Evento Dois", "categorias": ["pgtap-Teatro"],
     "datas": [
       {"id_externo": "o2.2030-01-12", "espaco_id_externo": "nao-existe",
        "inicio": "2030-01-12T20:00:00Z"}
     ]}
  ]
}$json$, true);

-- Muda o endereço de e1, o nome e as categorias de ev1 e o horário de uma data;
-- a data de 17/01 some e entra a de 24/01.
select set_config('pgtap.lote_2', $json${
  "janela": {"de": "2030-01-01T03:00:00Z", "ate": "2030-02-01T03:00:00Z"},
  "espacos": [
    {"id_externo": "e1", "nome": "Espaço Um", "descricao": "Sala", "endereco": "Rua B, 2",
     "municipio": "Fortaleza", "latitude": -3.7, "longitude": -38.5,
     "acessibilidade_fisica": ["Rampa de acesso"]},
    {"id_externo": "e2", "nome": "Espaço Dois", "latitude": null, "longitude": null}
  ],
  "eventos": [
    {"id_externo": "ev1", "nome": "Evento Um (remarcado)", "descricao_curta": "Curta",
     "classificacao_etaria": "Livre", "categorias": ["pgtap-Música"],
     "datas": [
       {"id_externo": "o1.2030-01-10", "espaco_id_externo": "e1",
        "inicio": "2030-01-10T23:30:00Z", "fim": "2030-01-11T00:30:00Z",
        "preco": "Gratuito", "gratuito": true},
       {"id_externo": "o1.2030-01-24", "espaco_id_externo": "e1",
        "inicio": "2030-01-24T22:00:00Z", "fim": "2030-01-24T23:00:00Z",
        "preco": "Gratuito", "gratuito": true}
     ]},
    {"id_externo": "ev2", "nome": "Evento Dois", "categorias": ["pgtap-Teatro"],
     "datas": [
       {"id_externo": "o2.2030-01-12", "espaco_id_externo": "nao-existe",
        "inicio": "2030-01-12T20:00:00Z"}
     ]}
  ]
}$json$, true);

-- Como uma resposta cortada da fonte: só uma das três datas da janela.
select set_config('pgtap.lote_incompleto', $json${
  "janela": {"de": "2030-01-01T03:00:00Z", "ate": "2030-02-01T03:00:00Z"},
  "espacos": [],
  "eventos": [
    {"id_externo": "ev2", "nome": "Evento Dois", "categorias": ["pgtap-Teatro"],
     "datas": [
       {"id_externo": "o2.2030-01-12", "espaco_id_externo": "nao-existe",
        "inicio": "2030-01-12T20:00:00Z"}
     ]}
  ]
}$json$, true);

-- A segunda data termina antes de começar: a restrição da tabela recusa.
select set_config('pgtap.lote_quebrado', $json${
  "janela": {"de": "2030-01-01T03:00:00Z", "ate": "2030-02-01T03:00:00Z"},
  "espacos": [],
  "eventos": [
    {"id_externo": "q1", "nome": "Evento quebrado", "categorias": [],
     "datas": [
       {"id_externo": "q1.a", "inicio": "2030-01-05T20:00:00Z"},
       {"id_externo": "q1.b", "inicio": "2030-01-06T20:00:00Z", "fim": "2030-01-06T19:00:00Z"}
     ]}
  ]
}$json$, true);

set local role service_role;

-- Primeira importação e o estado que ela deixa (4 testes).
select is(
  public.importar_agenda('pgtap-fonte', current_setting('pgtap.lote_1')::jsonb),
  '{"espacos": {"recebidos": 2, "criados": 2, "alterados": 0},
    "eventos": {"recebidos": 2, "criados": 2, "alterados": 0},
    "datas": {"recebidas": 3, "criadas": 3, "alteradas": 0, "removidas": 0}}'::jsonb,
  'primeira importação cria tudo'
);

select results_eq(
  $$select nome, publicado from public.eventos where fonte = 'pgtap-fonte' order by id_externo$$,
  $$values ('Evento Um', true), ('Evento Dois', true)$$,
  'evento importado entra publicado'
);

select results_eq(
  $$select d.id_externo, s.id_externo
    from public.eventos_datas d
    join public.eventos e on e.id = d.evento_id
    left join public.espacos s on s.id = d.espaco_id
    where e.fonte = 'pgtap-fonte'
    order by d.id_externo$$,
  $$values ('o1.2030-01-10', 'e1'), ('o1.2030-01-17', 'e1'), ('o2.2030-01-12', null)$$,
  'data fica ligada ao espaço; espaço que o lote não trouxe fica nulo'
);

select results_eq(
  $$select e.id_externo, c.nome
    from public.eventos_categorias ec
    join public.eventos e on e.id = ec.evento_id
    join public.categorias c on c.id = ec.categoria_id
    where e.fonte = 'pgtap-fonte'
    order by 1, 2$$,
  $$values ('ev1', 'pgtap-Música'), ('ev1', 'pgtap-Teatro'), ('ev2', 'pgtap-Teatro')$$,
  'categorias do lote ficam vinculadas ao evento'
);

-- Repetir o mesmo lote (2 testes).
select is(
  public.importar_agenda('pgtap-fonte', current_setting('pgtap.lote_1')::jsonb),
  '{"espacos": {"recebidos": 2, "criados": 0, "alterados": 0},
    "eventos": {"recebidos": 2, "criados": 0, "alterados": 0},
    "datas": {"recebidas": 3, "criadas": 0, "alteradas": 0, "removidas": 0}}'::jsonb,
  'repetir o mesmo lote não cria, não altera e não remove'
);

select results_eq(
  $$select
      (select count(*)::int from public.eventos where fonte = 'pgtap-fonte'),
      (select count(*)::int from public.espacos where fonte = 'pgtap-fonte'),
      (select count(*)::int from public.eventos_datas d
        join public.eventos e on e.id = d.evento_id where e.fonte = 'pgtap-fonte')$$,
  $$values (2, 2, 3)$$,
  'repetir o mesmo lote não duplica'
);

reset role;

-- Como dono: despublica um evento à mão e cria o que a importação não pode tocar,
-- uma data fora da janela e uma data de outra fonte.
update public.eventos set publicado = false where fonte = 'pgtap-fonte' and id_externo = 'ev2';

insert into public.eventos_datas (evento_id, id_externo, inicio)
select id, 'o1.2029-12-20', '2029-12-20T20:00:00Z'
from public.eventos where fonte = 'pgtap-fonte' and id_externo = 'ev1';

insert into public.eventos (fonte, id_externo, nome, publicado)
values ('pgtap-outra', 'x1', 'De outra fonte', true);

insert into public.eventos_datas (evento_id, id_externo, inicio)
select id, 'x1.2030-01-15', '2030-01-15T20:00:00Z'
from public.eventos where fonte = 'pgtap-outra';

set local role service_role;

-- Lote alterado (6 testes).
select is(
  public.importar_agenda('pgtap-fonte', current_setting('pgtap.lote_2')::jsonb),
  '{"espacos": {"recebidos": 2, "criados": 0, "alterados": 1},
    "eventos": {"recebidos": 2, "criados": 0, "alterados": 1},
    "datas": {"recebidas": 3, "criadas": 1, "alteradas": 1, "removidas": 1}}'::jsonb,
  'lote alterado conta o que entrou, o que mudou e o que saiu'
);

select results_eq(
  $$select d.id_externo
    from public.eventos_datas d
    join public.eventos e on e.id = d.evento_id
    where e.fonte = 'pgtap-fonte'
    order by 1$$,
  array['o1.2029-12-20', 'o1.2030-01-10', 'o1.2030-01-24', 'o2.2030-01-12'],
  'data que sumiu da fonte sai; data fora da janela fica'
);

select results_eq(
  $$select d.id_externo
    from public.eventos_datas d
    join public.eventos e on e.id = d.evento_id
    where e.fonte = 'pgtap-outra'$$,
  array['x1.2030-01-15'],
  'data de outra fonte não é tocada'
);

select is(
  (select publicado from public.eventos where fonte = 'pgtap-fonte' and id_externo = 'ev2'),
  false,
  'despublicação feita à mão sobrevive à importação'
);

select results_eq(
  $$select c.nome
    from public.eventos_categorias ec
    join public.eventos e on e.id = ec.evento_id
    join public.categorias c on c.id = ec.categoria_id
    where e.fonte = 'pgtap-fonte' and e.id_externo = 'ev1'$$,
  array['pgtap-Música'],
  'categoria que saiu da fonte sai do evento'
);

select is(
  (select nome from public.eventos where fonte = 'pgtap-fonte' and id_externo = 'ev1'),
  'Evento Um (remarcado)',
  'campo que mudou na fonte é atualizado'
);

-- Recusas: a chamada inteira falha e nada fica gravado (8 testes).
select throws_ok(
  $$select public.importar_agenda('pgtap-fonte', current_setting('pgtap.lote_incompleto')::jsonb)$$,
  'P0001',
  'importar_agenda: remoção em massa recusada (2 de 3 datas da janela)',
  'lote que apagaria mais da metade da janela é recusado'
);

select results_eq(
  $$select count(*)::int
    from public.eventos_datas d
    join public.eventos e on e.id = d.evento_id
    where e.fonte = 'pgtap-fonte'$$,
  array[4],
  'a recusa não apaga nada'
);

select is(
  public.importar_agenda(
    'pgtap-fonte',
    current_setting('pgtap.lote_incompleto')::jsonb || '{"permitir_remocao_em_massa": true}'::jsonb
  ),
  '{"espacos": {"recebidos": 0, "criados": 0, "alterados": 0},
    "eventos": {"recebidos": 1, "criados": 0, "alterados": 0},
    "datas": {"recebidas": 1, "criadas": 0, "alteradas": 0, "removidas": 2}}'::jsonb,
  'com a permissão explícita, a remoção em massa acontece'
);

select throws_ok(
  $$select public.importar_agenda('pgtap-fonte',
    '{"janela": {"de": "2030-01-01T03:00:00Z", "ate": "2030-02-01T03:00:00Z"},
      "espacos": [], "eventos": []}'::jsonb)$$,
  'P0001', 'importar_agenda: lote sem datas, recusado',
  'lote vazio é recusado'
);

select throws_ok(
  $$select public.importar_agenda('pgtap-fonte',
    current_setting('pgtap.lote_1')::jsonb
      || '{"janela": {"de": "2030-02-01T03:00:00Z", "ate": "2030-01-01T03:00:00Z"}}'::jsonb)$$,
  'P0001', 'importar_agenda: janela inválida',
  'janela invertida é recusada'
);

select throws_ok(
  $$select public.importar_agenda('', current_setting('pgtap.lote_1')::jsonb)$$,
  'P0001', 'importar_agenda: fonte obrigatória',
  'fonte vazia é recusada'
);

select throws_ok(
  $$select public.importar_agenda('pgtap-atomica', current_setting('pgtap.lote_quebrado')::jsonb)$$,
  '23514', null,
  'data inválida derruba o lote'
);

select results_eq(
  $$select count(*)::int from public.eventos where fonte = 'pgtap-atomica'$$,
  array[0],
  'lote derrubado não deixa evento gravado pela metade'
);

reset role;

-- Quem não é o servidor não chama a função (2 testes).
set local role anon;

select throws_ok(
  $$select public.importar_agenda('x', '{}'::jsonb)$$,
  '42501', null, 'anon não chama importar_agenda'
);

reset role;
set local role authenticated;

select throws_ok(
  $$select public.importar_agenda('x', '{}'::jsonb)$$,
  '42501', null, 'authenticated não chama importar_agenda'
);

reset role;

select * from finish();
rollback;
