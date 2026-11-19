-- U3.1 — decisão em lote; aprovação nunca publica na agenda.
-- version representa o conteúdo coletado: curadoria não a incrementa.
-- A regra unitária mantém assinatura/retorno/erros e passa a registrar o
-- autor interno (não e-mail/metadata do cliente) em curation_error.
create or replace function public.curar_evento(
  p_event_id integer,
  p_version integer,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_curador integer;
  v_status text := btrim(p_status);
  v_evento public.events;
begin
  -- Autor vem da sessão; desativação do curador vale mesmo com JWT vigente.
  v_curador := public.current_curator();
  if v_curador is null then
    raise exception using
      errcode = '42501',
      message = 'curar_evento: operador sem vínculo de curador ativo';
  end if;

  if p_event_id is null or p_version is null then
    raise exception using
      errcode = '22023',
      message = 'curar_evento: evento e version são obrigatórios';
  end if;

  if v_status is null or v_status not in ('approved', 'rejected') then
    raise exception using
      errcode = '22023',
      message = 'curar_evento: status deve ser approved ou rejected';
  end if;

  -- Trava a linha: serializa curadoria do mesmo evento e impede recoleta
  -- concorrente de mudar version embaixo da checagem.
  select e.* into v_evento
  from public.events e
  where e.id = p_event_id
  for no key update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'curar_evento: evento coletado não encontrado';
  end if;

  -- Concorrência otimista: o painel leu uma version e manda de volta a mesma;
  -- recoleta (S0.3) ou outro curador tendo alterado, a chamada é recusada em
  -- vez de sobrescrever uma decisão sobre um conteúdo que já mudou.
  if v_evento.version <> p_version then
    raise exception using
      errcode = '23505',
      message = 'curar_evento: version divergente, recarregue o evento';
  end if;

  update public.events e
  set
    curation_status = v_status,
    curation_at = now(),
    curation_error = jsonb_build_object(
      'decidedBy', v_curador, 'decidedAt', now()
    )
  where e.id = p_event_id
  returning * into v_evento;

  return to_jsonb(v_evento);
end;
$$;


create function public.curar_eventos(p_itens jsonb, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_id integer;
  v_version integer;
  v_atual integer;
  v_alterados jsonb := '[]'::jsonb;
  v_conflitos jsonb := '[]'::jsonb;
  v_ausentes jsonb := '[]'::jsonb;
begin
  if public.current_curator() is null then
    raise exception using errcode = '42501',
      message = 'curar_eventos: operador sem vínculo de curador ativo';
  end if;
  if p_status is null or p_status not in ('approved', 'rejected') then
    raise exception using errcode = '22023',
      message = 'curar_eventos: status deve ser approved ou rejected';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then
    raise exception using errcode = '22023',
      message = 'curar_eventos: informe uma lista de 1 a 100 itens';
  end if;
  if jsonb_array_length(p_itens) not between 1 and 100 then
    raise exception using errcode = '22023',
      message = 'curar_eventos: informe uma lista de 1 a 100 itens';
  end if;
  -- Valida tudo antes de qualquer escrita; chaves extras (inclusive autor)
  -- não são aceitas. Casts inválidos/overflow também usam o erro do contrato.
  for v_item in select value from jsonb_array_elements(p_itens) loop
    if jsonb_typeof(v_item) <> 'object'
      or not (v_item ? 'id' and v_item ? 'version')
      or v_item - 'id' - 'version' <> '{}'::jsonb
      or jsonb_typeof(v_item->'id') <> 'number'
      or jsonb_typeof(v_item->'version') <> 'number'
      or (v_item->>'id') !~ '^-?[0-9]+$'
      or (v_item->>'version') !~ '^-?[0-9]+$' then
      raise exception using errcode = '22023',
        message = 'curar_eventos: cada item deve conter somente id e version inteiros';
    end if;
    begin
      v_id := (v_item->>'id')::integer;
      v_version := (v_item->>'version')::integer;
    exception when numeric_value_out_of_range or invalid_text_representation then
      raise exception using errcode = '22023',
        message = 'curar_eventos: cada item deve conter somente id e version inteiros';
    end;
  end loop;
  if exists (
    select 1 from jsonb_to_recordset(p_itens) as i(id integer, version integer)
    group by i.id having count(distinct i.version) > 1
  ) then
    raise exception using errcode = '22023',
      message = 'curar_eventos: versões divergentes para o mesmo id';
  end if;
  -- Ordem global de locks, inclusive entre dois lotes com ordem inversa.
  -- Cada chamada unitária ocorre com a linha já travada na mesma transação.
  for v_id, v_version in
    select distinct i.id, i.version
    from jsonb_to_recordset(p_itens) as i(id integer, version integer)
    order by i.id
  loop
    select e.version into v_atual from public.events e
    where e.id = v_id for update;
    if not found then
      v_ausentes := v_ausentes || jsonb_build_array(v_id);
    elsif v_atual <> v_version then
      v_conflitos := v_conflitos || jsonb_build_array(v_id);
    else
      perform public.curar_evento(v_id, v_version, p_status);
      v_alterados := v_alterados || jsonb_build_array(v_id);
    end if;
  end loop;
  return jsonb_build_object('alterados', v_alterados,
    'conflitos', v_conflitos, 'ausentes', v_ausentes);
end;
$$;

revoke all on function public.curar_eventos(jsonb, text)
from public, anon, authenticated, service_role;
grant execute on function public.curar_eventos(jsonb, text) to authenticated;
