-- M7 (docs/PLANO-APP-MOBILE.md): entrada de dados reais.
-- O importador (workers/coleta) busca a fonte, valida e entrega um lote. Esta função grava o
-- lote inteiro numa transação só: ou entra tudo, ou não entra nada. Só o servidor a chama.

-- O padrão do projeto deixa TRUNCATE, REFERENCES e TRIGGER com service_role em tabela nova.
-- Aqui ele fica só com o que a importação usa; nada apaga evento nem espaço.
revoke all on table
  public.espacos,
  public.eventos,
  public.eventos_datas,
  public.categorias,
  public.eventos_categorias
from service_role;

grant select, insert, update on table public.espacos, public.eventos, public.categorias to service_role;
grant select, insert, update, delete on table public.eventos_datas, public.eventos_categorias to service_role;

-- Lote (jsonb), já validado e normalizado por quem coleta:
--   janela: { de, ate }  intervalo [de, ate) que a coleta cobriu por inteiro
--   espacos: [{ id_externo, nome, descricao, endereco, municipio, latitude, longitude,
--               acessibilidade_fisica[] }]
--   eventos: [{ id_externo, nome, descricao_curta, descricao_longa, classificacao_etaria,
--               imagem_url, categorias[],
--               datas: [{ id_externo, espaco_id_externo, inicio, fim, preco, gratuito }] }]
--   permitir_remocao_em_massa: true só quando uma pessoa conferiu que o sumiço é real
create function public.importar_agenda(p_fonte text, p_lote jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_de timestamptz := (p_lote #>> '{janela,de}')::timestamptz;
  v_ate timestamptz := (p_lote #>> '{janela,ate}')::timestamptz;
  v_espacos_recebidos int;
  v_espacos_criados int;
  v_espacos_alterados int;
  v_eventos_recebidos int;
  v_eventos_criados int;
  v_eventos_alterados int;
  v_datas_recebidas int;
  v_datas_criadas int;
  v_datas_alteradas int;
  v_datas_na_janela int;
  v_datas_removidas int;
begin
  if coalesce(p_fonte, '') = '' then
    raise exception 'importar_agenda: fonte obrigatória';
  end if;

  if v_de is null or v_ate is null or v_ate <= v_de then
    raise exception 'importar_agenda: janela inválida';
  end if;

  -- Lote sem data não prova que a agenda esvaziou; quase sempre é falha na coleta.
  if not exists (
    select 1
    from jsonb_array_elements(coalesce(p_lote -> 'eventos', '[]'::jsonb)) as e
    cross join lateral jsonb_array_elements(coalesce(e -> 'datas', '[]'::jsonb))
  ) then
    raise exception 'importar_agenda: lote sem datas, recusado';
  end if;

  -- Espaços. "publicado" só é decidido na criação: se alguém despublicar um registro à mão,
  -- a coleta seguinte não desfaz. O "where" evita regravar linha que não mudou.
  with entrada as (
    select *
    from jsonb_to_recordset(coalesce(p_lote -> 'espacos', '[]'::jsonb)) as x (
      id_externo text, nome text, descricao text, endereco text, municipio text,
      latitude double precision, longitude double precision, acessibilidade_fisica text[]
    )
  ),
  gravados as (
    insert into public.espacos as atual
      (fonte, id_externo, nome, descricao, endereco, municipio, latitude, longitude,
       acessibilidade_fisica, publicado)
    select p_fonte, id_externo, nome, descricao, endereco, municipio, latitude, longitude,
      coalesce(acessibilidade_fisica, '{}'), true
    from entrada
    on conflict (fonte, id_externo) do update set
      nome = excluded.nome,
      descricao = excluded.descricao,
      endereco = excluded.endereco,
      municipio = excluded.municipio,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      acessibilidade_fisica = excluded.acessibilidade_fisica
    where (atual.nome, atual.descricao, atual.endereco, atual.municipio, atual.latitude,
           atual.longitude, atual.acessibilidade_fisica)
      is distinct from
          (excluded.nome, excluded.descricao, excluded.endereco, excluded.municipio,
           excluded.latitude, excluded.longitude, excluded.acessibilidade_fisica)
    returning (atual.xmax = 0) as criado
  )
  select
    (select count(*) from entrada),
    count(*) filter (where criado),
    count(*) filter (where not criado)
  into v_espacos_recebidos, v_espacos_criados, v_espacos_alterados
  from gravados;

  -- Eventos, com a mesma regra de "publicado".
  with entrada as (
    select *
    from jsonb_to_recordset(p_lote -> 'eventos') as x (
      id_externo text, nome text, descricao_curta text, descricao_longa text,
      classificacao_etaria text, imagem_url text
    )
  ),
  gravados as (
    insert into public.eventos as atual
      (fonte, id_externo, nome, descricao_curta, descricao_longa, classificacao_etaria,
       imagem_url, publicado)
    select p_fonte, id_externo, nome, descricao_curta, descricao_longa, classificacao_etaria,
      imagem_url, true
    from entrada
    on conflict (fonte, id_externo) do update set
      nome = excluded.nome,
      descricao_curta = excluded.descricao_curta,
      descricao_longa = excluded.descricao_longa,
      classificacao_etaria = excluded.classificacao_etaria,
      imagem_url = excluded.imagem_url
    where (atual.nome, atual.descricao_curta, atual.descricao_longa,
           atual.classificacao_etaria, atual.imagem_url)
      is distinct from
          (excluded.nome, excluded.descricao_curta, excluded.descricao_longa,
           excluded.classificacao_etaria, excluded.imagem_url)
    returning (atual.xmax = 0) as criado
  )
  select
    (select count(*) from entrada),
    count(*) filter (where criado),
    count(*) filter (where not criado)
  into v_eventos_recebidos, v_eventos_criados, v_eventos_alterados
  from gravados;

  -- Categorias: o vocabulário só cresce.
  insert into public.categorias (nome)
  select distinct c.nome
  from jsonb_array_elements(p_lote -> 'eventos') as e
  cross join lateral jsonb_array_elements_text(coalesce(e -> 'categorias', '[]'::jsonb)) as c (nome)
  on conflict (nome) do nothing;

  -- As categorias de um evento são da fonte: o vínculo fica igual ao do lote.
  with entrada as (
    select ev.id as evento_id, cat.id as categoria_id
    from jsonb_array_elements(p_lote -> 'eventos') as e
    join public.eventos ev on ev.fonte = p_fonte and ev.id_externo = e ->> 'id_externo'
    cross join lateral jsonb_array_elements_text(coalesce(e -> 'categorias', '[]'::jsonb)) as c (nome)
    join public.categorias cat on cat.nome = c.nome
  ),
  removidos as (
    delete from public.eventos_categorias ec
    using public.eventos ev
    where ev.id = ec.evento_id
      and ev.fonte = p_fonte
      and ev.id_externo in (
        select e ->> 'id_externo' from jsonb_array_elements(p_lote -> 'eventos') as e
      )
      and not exists (
        select 1 from entrada i
        where i.evento_id = ec.evento_id and i.categoria_id = ec.categoria_id
      )
  )
  insert into public.eventos_categorias (evento_id, categoria_id)
  select distinct evento_id, categoria_id from entrada
  on conflict do nothing;

  -- Datas. Espaço que o lote não trouxe fica nulo, em vez de derrubar a data.
  with entrada as (
    select ev.id as evento_id, esp.id as espaco_id, d.id_externo, d.inicio, d.fim, d.preco,
      d.gratuito
    from jsonb_array_elements(p_lote -> 'eventos') as e
    join public.eventos ev on ev.fonte = p_fonte and ev.id_externo = e ->> 'id_externo'
    cross join lateral jsonb_to_recordset(coalesce(e -> 'datas', '[]'::jsonb)) as d (
      id_externo text, espaco_id_externo text, inicio timestamptz, fim timestamptz,
      preco text, gratuito boolean
    )
    left join public.espacos esp
      on esp.fonte = p_fonte and esp.id_externo = d.espaco_id_externo
  ),
  gravadas as (
    insert into public.eventos_datas as atual
      (evento_id, espaco_id, id_externo, inicio, fim, preco, gratuito)
    select evento_id, espaco_id, id_externo, inicio, fim, preco, gratuito
    from entrada
    on conflict (evento_id, id_externo) do update set
      espaco_id = excluded.espaco_id,
      inicio = excluded.inicio,
      fim = excluded.fim,
      preco = excluded.preco,
      gratuito = excluded.gratuito
    where (atual.espaco_id, atual.inicio, atual.fim, atual.preco, atual.gratuito)
      is distinct from
          (excluded.espaco_id, excluded.inicio, excluded.fim, excluded.preco, excluded.gratuito)
    returning (atual.xmax = 0) as criada
  )
  select
    (select count(*) from entrada),
    count(*) filter (where criada),
    count(*) filter (where not criada)
  into v_datas_recebidas, v_datas_criadas, v_datas_alteradas
  from gravadas;

  select count(*) into v_datas_na_janela
  from public.eventos_datas d
  join public.eventos ev on ev.id = d.evento_id
  where ev.fonte = p_fonte and d.inicio >= v_de and d.inicio < v_ate;

  -- A coleta cobriu a janela inteira, então data desta fonte que está na janela e não veio
  -- no lote foi cancelada ou remarcada: sai. Fora da janela e de outras fontes, nada muda.
  with lote as (
    select e ->> 'id_externo' as evento, d ->> 'id_externo' as data
    from jsonb_array_elements(p_lote -> 'eventos') as e
    cross join lateral jsonb_array_elements(coalesce(e -> 'datas', '[]'::jsonb)) as d
  ),
  removidas as (
    delete from public.eventos_datas d
    using public.eventos ev
    where ev.id = d.evento_id
      and ev.fonte = p_fonte
      and d.inicio >= v_de
      and d.inicio < v_ate
      and not exists (
        select 1 from lote l where l.evento = ev.id_externo and l.data = d.id_externo
      )
    returning 1
  )
  select count(*) into v_datas_removidas from removidas;

  -- Sumir mais da metade da janela de uma vez parece resposta incompleta da fonte, não
  -- cancelamento. A exceção desfaz tudo o que esta chamada gravou.
  if v_datas_removidas * 2 > v_datas_na_janela
    and not coalesce((p_lote ->> 'permitir_remocao_em_massa')::boolean, false)
  then
    raise exception 'importar_agenda: remoção em massa recusada (% de % datas da janela)',
      v_datas_removidas, v_datas_na_janela
      using hint = 'Confira a fonte. Se o sumiço for real, repita com permitir_remocao_em_massa.';
  end if;

  return jsonb_build_object(
    'espacos', jsonb_build_object(
      'recebidos', v_espacos_recebidos,
      'criados', v_espacos_criados,
      'alterados', v_espacos_alterados
    ),
    'eventos', jsonb_build_object(
      'recebidos', v_eventos_recebidos,
      'criados', v_eventos_criados,
      'alterados', v_eventos_alterados
    ),
    'datas', jsonb_build_object(
      'recebidas', v_datas_recebidas,
      'criadas', v_datas_criadas,
      'alteradas', v_datas_alteradas,
      'removidas', v_datas_removidas
    )
  );
end;
$$;

-- Função em schema exposto é endpoint: só o servidor executa.
revoke execute on function public.importar_agenda(text, jsonb) from public, anon, authenticated;
grant execute on function public.importar_agenda(text, jsonb) to service_role;
