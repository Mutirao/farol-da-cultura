-- U1.4 — importar_agenda é snapshot por janela e só serve à fonte
-- mapa-cultural-ce. Sympla (coleta parcial) e qualquer outra fonte têm RPCs
-- próprias; ausência nessas fontes nunca vira delete. Ver plano unificado §5.2.

begin;
select plan(6);

set local role service_role;

-- A checagem de fonte acontece antes da checagem de lote: um lote vazio com
-- fonte não autorizada falha pela fonte, não pelo lote.
select throws_ok(
  $$select public.importar_agenda('sympla', '{}'::jsonb)$$,
  '22023',
  'importar_agenda: fonte não autorizada para snapshot por janela',
  'Sympla não usa snapshot destrutivo da fonte Mapa Cultural'
);

select throws_ok(
  $$select public.importar_agenda(null, '{}'::jsonb)$$,
  '22023',
  'importar_agenda: fonte não autorizada para snapshot por janela',
  'fonte nula também é recusada pelo guard'
);

-- Mesmo uma janela malformada deve falhar pela fonte, não pelo timestamp.
select throws_ok(
  $$select public.importar_agenda('sympla', '{"janela":{"de":"not-a-date"}}'::jsonb)$$,
  '22023',
  'importar_agenda: fonte não autorizada para snapshot por janela',
  'guard precede a conversão do início da janela'
);

select throws_ok(
  $$select public.importar_agenda(null, '{"janela":{"ate":"not-a-date"}}'::jsonb)$$,
  '22023',
  'importar_agenda: fonte não autorizada para snapshot por janela',
  'guard precede a conversão do fim da janela'
);

-- A recusa não grava nem remove nada.
select is(
  (select count(*) from public.eventos where fonte = 'sympla'),
  0::bigint,
  'tentativa com fonte não autorizada não grava nada'
);

-- A fonte autorizada continua importando normalmente (lote mínimo válido).
select is(
  public.importar_agenda('mapa-cultural-ce', '{
    "janela": {"de": "2030-03-01T03:00:00Z", "ate": "2030-04-01T03:00:00Z"},
    "espacos": [],
    "eventos": [
      {"id_externo": "u14-ev1", "nome": "Evento U1.4", "categorias": [],
       "datas": [{"id_externo": "u14-o1", "inicio": "2030-03-10T22:00:00Z"}]}
    ]
  }'::jsonb),
  '{"espacos": {"recebidos": 0, "criados": 0, "alterados": 0},
    "eventos": {"recebidos": 1, "criados": 1, "alterados": 0},
    "datas": {"recebidas": 1, "criadas": 1, "alteradas": 0, "removidas": 0}}'::jsonb,
  'mapa-cultural-ce continua importando com o guard ativo'
);

select * from finish();
rollback;
