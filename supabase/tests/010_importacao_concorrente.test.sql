begin;
select plan(8);

select ok(not has_function_privilege('anon', 'public.versao_agenda_ce()', 'EXECUTE'), 'anon não lê versão');
select ok(not has_function_privilege('authenticated', 'public.versao_agenda_ce()', 'EXECUTE'), 'authenticated não lê versão');
select ok(not has_function_privilege('service_role', 'private.importar_agenda(text,jsonb)', 'EXECUTE'), 'servidor não pula o controle de versão');

set local role service_role;
select set_config('pgtap.versao_anterior', public.versao_agenda_ce()::text, true);
select set_config('pgtap.lote_concorrente', '{
  "janela": {"de": "2030-05-01T03:00:00Z", "ate": "2030-06-01T03:00:00Z"},
  "eventos": [{"id_externo":"concorrencia-ev", "nome":"Título corrigido", "datas":[{"id_externo":"concorrencia-data","inicio":"2030-05-10T22:00:00Z"}]}]
}', true);

select lives_ok(
  $$select public.importar_agenda('mapa-cultural-ce', current_setting('pgtap.lote_concorrente')::jsonb || jsonb_build_object('versao_esperada', current_setting('pgtap.versao_anterior')::bigint))$$,
  'lote com versão atual é importado'
);
select is(public.versao_agenda_ce(), current_setting('pgtap.versao_anterior')::bigint + 1, 'importação avança a versão');
select throws_ok(
  $$select public.importar_agenda('mapa-cultural-ce', jsonb_set(current_setting('pgtap.lote_concorrente')::jsonb, '{eventos,0,nome}', '"Título antigo"') || jsonb_build_object('versao_esperada', current_setting('pgtap.versao_anterior')::bigint))$$,
  'PT409', 'importar_agenda: versão da agenda mudou', 'lote coletado antes da outra escrita não sobrescreve'
);
select is((select nome from public.eventos where fonte = 'mapa-cultural-ce' and id_externo = 'concorrencia-ev'), 'Título corrigido', 'a versão antiga não deixou alterações');
select is(public.versao_agenda_ce(), current_setting('pgtap.versao_anterior')::bigint + 1, 'recusa não avança a versão');

select * from finish();
rollback;
