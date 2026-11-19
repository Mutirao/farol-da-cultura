-- S0.4 — curadoria mínima do painel operacional. Ver
-- docs/PLANO-UNIFICADO-2026-11-16.md (U3) e docs/ONTOLOGIA-E-FLUXO.md: aprovar
-- não envia, exportar não comprova incorporação. O curador decide
-- approved/rejected sobre o evento coletado (public.events); a RPC confere o
-- version lido pelo painel (concorrência otimista), nunca toca
-- export_*/space_match_*/mapas_import_* e nunca escreve na agenda pública
-- (public.eventos, eventos_datas, espacos).
--
-- Contrato:
--   public.curar_evento(p_event_id int, p_version int, p_status text)
--   returns jsonb — só authenticated, autorização interna por curador ativo
--   (public.current_curator(), de 20261117000200_curadoria_acesso.sql).

create function public.curar_evento(
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
    curation_at = now()
  where e.id = p_event_id
  returning * into v_evento;

  return to_jsonb(v_evento);
end;
$$;

revoke all on function public.curar_evento(integer, integer, text)
from public, anon, authenticated, service_role;

grant execute on function public.curar_evento(integer, integer, text)
to authenticated;
