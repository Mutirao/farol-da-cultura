-- S0.3 (U2.3/U2.4 mínimos) — gravação restrita da coleta Sympla em
-- public.events. Ver docs/PLANO-UNIFICADO-2026-11-16.md (U2) e
-- docs/ONTOLOGIA-E-FLUXO.md: o registro coletado fica restrito à operação;
-- a agenda pública (public.eventos, eventos_datas, espacos) só recebe dados
-- pela sincronização com a API de uma instância, nunca por aqui.
--
-- Contrato:
--   public.registrar_coleta_minima(p_run_key uuid, p_source_slug text, p_eventos jsonb)
--   returns jsonb — só service_role executa.
--
-- * Idempotente por run key: o recibo em private.recibos_idempotencia aponta
--   para o job_run cujo details guarda o resultado. Replay com o mesmo lote
--   devolve esse resultado sem gravar; com outro lote, 23505.
-- * Upsert por (source_id, external_id): events.id é preservado (o vínculo
--   institucional da 0500 cai em cascata se a linha for apagada).
-- * Recoleta só escreve colunas da fonte. curation_*, export_*,
--   space_match_*, mapas_import_*, is_free e price_min/max nunca são escritos.
-- * version sobe apenas quando o conteúdo da fonte muda; recoleta idêntica
--   só renova last_collected_at.

create function public.registrar_coleta_minima(
  p_run_key uuid,
  p_source_slug text,
  p_eventos jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_origem constant text := 'registrar_coleta_minima';
  c_campos constant text[] := array[
    'external_id', 'source_url', 'title', 'description', 'normalized_title',
    'starts_at', 'ends_at', 'venue_name', 'venue_address', 'venue_raw', 'city',
    'modality', 'collection_status', 'collection_reason', 'price_raw',
    'avatar_url', 'raw_json'
  ];
  -- Instante com fuso explícito: sem ele o cast usaria o fuso da sessão.
  c_instante constant text := '^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)$';
  v_slug text := btrim(p_source_slug);
  v_hash text;
  v_recibo private.recibos_idempotencia;
  v_job public.job_runs;
  v_fonte public.sources;
  v_item jsonb;
  v_pos bigint;
  v_campo text;
  v_ext text;
  v_vistos text[] := '{}';
  v_linha record;
  v_eventos jsonb := '[]'::jsonb;
  v_inseridos integer := 0;
  v_atualizados integer := 0;
  v_inalterados integer := 0;
  v_resultado jsonb;
begin
  if p_run_key is null or v_slug is null or v_slug = '' or p_eventos is null then
    raise exception using
      errcode = '22023',
      message = 'registrar_coleta_minima: run key, fonte e eventos são obrigatórios';
  end if;

  -- Única fonte com contrato de coleta mínima (piloto). Outra fonte exige
  -- conector, fixture e testes próprios (U2.7).
  if v_slug <> 'sympla' then
    raise exception using
      errcode = '22023',
      message = 'registrar_coleta_minima: fonte não habilitada para coleta mínima';
  end if;

  if jsonb_typeof(p_eventos) <> 'array'
     or jsonb_array_length(p_eventos) not between 1 and 500 then
    raise exception using
      errcode = '22023',
      message = 'registrar_coleta_minima: eventos deve ser uma lista de 1 a 500 itens';
  end if;

  -- jsonb tem forma textual canônica: o mesmo lote dá o mesmo hash.
  v_hash := encode(sha256(convert_to(p_eventos::text, 'UTF8')), 'hex');

  -- O recibo vem antes de qualquer escrita. Sessão concorrente com o mesmo
  -- run key espera aqui e, depois do commit da primeira, cai no replay.
  insert into private.recibos_idempotencia (chave, origem)
  values (p_run_key, c_origem)
  on conflict (chave) do nothing;

  if not found then
    select * into v_recibo
    from private.recibos_idempotencia r
    where r.chave = p_run_key;

    if v_recibo.origem <> c_origem then
      raise exception using
        errcode = '23505',
        message = 'registrar_coleta_minima: run key já usado por outra operação';
    end if;

    select * into v_job from public.job_runs j where j.id = v_recibo.job_run_id;
    if v_job.id is null then
      raise exception using
        errcode = 'P0002',
        message = 'registrar_coleta_minima: recibo sem resultado gravado';
    end if;

    if v_job.details ->> 'source_slug' is distinct from v_slug
       or v_job.details ->> 'lote_sha256' is distinct from v_hash then
      raise exception using
        errcode = '23505',
        message = 'registrar_coleta_minima: run key já usado com outro lote';
    end if;

    return v_job.details -> 'resultado';
  end if;

  insert into public.sources (slug, name, kind)
  values ('sympla', 'Sympla', 'ticket_platform')
  on conflict (slug) do nothing;

  select * into v_fonte from public.sources s where s.slug = v_slug;
  if not v_fonte.is_active then
    raise exception using
      errcode = '55000',
      message = 'registrar_coleta_minima: fonte inativa';
  end if;

  for v_item, v_pos in
    select t.item, t.pos
    from jsonb_array_elements(p_eventos) with ordinality as t (item, pos)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception using
        errcode = '22023',
        message = format('registrar_coleta_minima: item %s não é objeto', v_pos);
    end if;

    -- Campo fora do contrato (ex.: curation_status) recusa o lote inteiro.
    select k into v_campo
    from jsonb_object_keys(v_item) as k
    where k <> all (c_campos)
    limit 1;
    if v_campo is not null then
      raise exception using
        errcode = '22023',
        message = format('registrar_coleta_minima: item %s tem campo não aceito: %s', v_pos, v_campo);
    end if;

    v_ext := btrim(v_item ->> 'external_id');
    if v_ext is null or v_ext = ''
       or coalesce(btrim(v_item ->> 'title'), '') = ''
       or jsonb_typeof(v_item -> 'raw_json') is distinct from 'object' then
      raise exception using
        errcode = '22023',
        message = format('registrar_coleta_minima: item %s sem external_id, title ou raw_json', v_pos);
    end if;

    if v_ext = any (v_vistos) then
      raise exception using
        errcode = '22023',
        message = format('registrar_coleta_minima: item %s repete external_id do lote', v_pos);
    end if;
    v_vistos := v_vistos || v_ext;

    if (v_item ->> 'starts_at') !~ c_instante or (v_item ->> 'ends_at') !~ c_instante then
      raise exception using
        errcode = '22007',
        message = format('registrar_coleta_minima: item %s com instante sem fuso explícito', v_pos);
    end if;

    with antes as (
      select e.id, e.version
      from public.events e
      where e.source_id = v_fonte.id and e.external_id = v_ext
    ),
    gravado as (
      insert into public.events as e (
        source_id, external_id, source_url, title, description, normalized_title,
        starts_at, ends_at, venue_name, venue_address, venue_raw, city, modality,
        collection_status, collection_reason, price_raw, avatar_url, raw_json,
        last_collected_at
      )
      values (
        v_fonte.id,
        v_ext,
        v_item ->> 'source_url',
        btrim(v_item ->> 'title'),
        v_item ->> 'description',
        v_item ->> 'normalized_title',
        (v_item ->> 'starts_at')::timestamptz,
        (v_item ->> 'ends_at')::timestamptz,
        v_item ->> 'venue_name',
        v_item ->> 'venue_address',
        nullif(v_item -> 'venue_raw', 'null'::jsonb),
        v_item ->> 'city',
        v_item ->> 'modality',
        v_item ->> 'collection_status',
        v_item ->> 'collection_reason',
        nullif(v_item -> 'price_raw', 'null'::jsonb),
        v_item ->> 'avatar_url',
        v_item -> 'raw_json',
        now()
      )
      on conflict (source_id, external_id) do update set
        source_url = excluded.source_url,
        title = excluded.title,
        description = excluded.description,
        normalized_title = excluded.normalized_title,
        starts_at = excluded.starts_at,
        ends_at = excluded.ends_at,
        venue_name = excluded.venue_name,
        venue_address = excluded.venue_address,
        venue_raw = excluded.venue_raw,
        city = excluded.city,
        modality = excluded.modality,
        collection_status = excluded.collection_status,
        collection_reason = excluded.collection_reason,
        price_raw = excluded.price_raw,
        avatar_url = excluded.avatar_url,
        raw_json = excluded.raw_json,
        last_collected_at = excluded.last_collected_at,
        version = case
          when (
            e.source_url, e.title, e.description, e.normalized_title, e.starts_at,
            e.ends_at, e.venue_name, e.venue_address, e.venue_raw, e.city,
            e.modality, e.collection_status, e.collection_reason, e.price_raw,
            e.avatar_url, e.raw_json
          ) is distinct from (
            excluded.source_url, excluded.title, excluded.description,
            excluded.normalized_title, excluded.starts_at, excluded.ends_at,
            excluded.venue_name, excluded.venue_address, excluded.venue_raw,
            excluded.city, excluded.modality, excluded.collection_status,
            excluded.collection_reason, excluded.price_raw, excluded.avatar_url,
            excluded.raw_json
          ) then e.version + 1
          else e.version
        end,
        updated_at = case
          when (
            e.source_url, e.title, e.description, e.normalized_title, e.starts_at,
            e.ends_at, e.venue_name, e.venue_address, e.venue_raw, e.city,
            e.modality, e.collection_status, e.collection_reason, e.price_raw,
            e.avatar_url, e.raw_json
          ) is distinct from (
            excluded.source_url, excluded.title, excluded.description,
            excluded.normalized_title, excluded.starts_at, excluded.ends_at,
            excluded.venue_name, excluded.venue_address, excluded.venue_raw,
            excluded.city, excluded.modality, excluded.collection_status,
            excluded.collection_reason, excluded.price_raw, excluded.avatar_url,
            excluded.raw_json
          ) then now()
          else e.updated_at
        end
      returning e.id, e.version
    )
    select
      g.id,
      g.version,
      case
        when a.id is null then 'inserido'
        when g.version > a.version then 'atualizado'
        else 'inalterado'
      end as acao
    into v_linha
    from gravado g
    left join antes a on a.id = g.id;

    case v_linha.acao
      when 'inserido' then v_inseridos := v_inseridos + 1;
      when 'atualizado' then v_atualizados := v_atualizados + 1;
      else v_inalterados := v_inalterados + 1;
    end case;

    v_eventos := v_eventos || jsonb_build_object(
      'external_id', v_ext,
      'event_id', v_linha.id,
      'acao', v_linha.acao,
      'version', v_linha.version
    );
  end loop;

  insert into public.job_runs (job_type, source_id, status, owner, finished_at, counters)
  values (
    'collect', v_fonte.id, 'succeeded', c_origem, now(),
    jsonb_build_object(
      'recebidos', jsonb_array_length(p_eventos),
      'inseridos', v_inseridos,
      'atualizados', v_atualizados,
      'inalterados', v_inalterados
    )
  )
  returning * into v_job;

  v_resultado := jsonb_build_object(
    'run_key', p_run_key,
    'source_slug', v_slug,
    'job_run_id', v_job.id,
    'recebidos', jsonb_array_length(p_eventos),
    'inseridos', v_inseridos,
    'atualizados', v_atualizados,
    'inalterados', v_inalterados,
    'eventos', v_eventos
  );

  update public.job_runs j
  set details = jsonb_build_object(
    'run_key', p_run_key,
    'source_slug', v_slug,
    'lote_sha256', v_hash,
    'resultado', v_resultado
  )
  where j.id = v_job.id;

  update private.recibos_idempotencia r
  set job_run_id = v_job.id
  where r.chave = p_run_key;

  return v_resultado;
end;
$$;

revoke all on function public.registrar_coleta_minima(uuid, text, jsonb)
from public, anon, authenticated, service_role;

grant execute on function public.registrar_coleta_minima(uuid, text, jsonb)
to service_role;
