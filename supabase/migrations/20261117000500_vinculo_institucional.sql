-- S0.2 — Vínculo entre o evento coletado e o registro institucional no Mapas.
-- Ver docs/ONTOLOGIA-E-FLUXO.md §4/§5, docs/ROADMAP.md §1 e ADR-0009.
--
-- A identidade institucional é base + tipo de entidade + ID. O vínculo só
-- acompanha a incorporação: não escreve em public.events nem na agenda
-- (public.eventos, public.eventos_datas, public.espacos). A agenda continua
-- recebendo dados apenas pela sincronização com a API da instância.
--
-- Fase 0: um vínculo por evento coletado. Vários destinos por evento e o
-- catálogo de instâncias/bases ficam para U1.5/U3.5.

create table private.vinculos_institucionais (
  id bigint generated always as identity primary key,
  event_id integer not null unique references public.events (id) on delete cascade,
  instancia text not null check (instancia <> ''),
  base text not null check (base <> ''),
  tipo_entidade text not null default 'event' check (tipo_entidade = 'event'),
  mapas_id text not null check (mapas_id <> ''),
  estado text not null default 'registrado'
    check (estado in ('registrado', 'confirmado', 'divergente')),
  -- public.users.id inteiro, nunca auth.users.id. Sem cascade: apagar o
  -- operador não apaga a autoria do vínculo.
  registrado_por integer not null references public.users (id),
  registrado_em timestamp with time zone not null default now(),
  verificado_em timestamp with time zone,
  -- 'registrado' ainda não foi conferido; os outros dois têm instante.
  constraint vinculos_institucionais_verificacao_check
    check ((estado = 'registrado') = (verificado_em is null))
);

-- Schema private não é exposto pelo PostgREST e ninguém além do dono tem
-- USAGE nele. O SELECT abaixo existe só para a view security_invoker; a
-- escrita acontece exclusivamente pelas duas RPCs.
revoke all on private.vinculos_institucionais
from public, anon, authenticated, service_role;

grant select on private.vinculos_institucionais to authenticated, service_role;

alter table private.vinculos_institucionais enable row level security;

create policy ler_curador on private.vinculos_institucionais
  for select to authenticated
  using (public.current_curator() is not null);

-- Leitura do estado por evento: curador ativo pelo painel (RLS da tabela,
-- avaliada como quem consulta) e worker de confirmação com service_role.
create view public.vinculos_institucionais
with (security_invoker = true) as
select
  v.id,
  v.event_id,
  v.instancia,
  v.base,
  v.tipo_entidade,
  v.mapas_id,
  v.estado,
  v.registrado_por,
  v.registrado_em,
  v.verificado_em
from private.vinculos_institucionais v;

revoke all on public.vinculos_institucionais
from public, anon, authenticated, service_role;

grant select on public.vinculos_institucionais to authenticated, service_role;

-- O curador informa onde o evento aprovado foi incorporado. Registrar não
-- comprova incorporação: o estado fica 'registrado' até a conferência na API.
--   sem vínculo                      → cria 'registrado'
--   mesmo destino, 'registrado' ou
--     'confirmado'                   → devolve o vínculo sem alterar (replay)
--   'divergente' (qualquer destino)
--     ou 'registrado' com outro
--     destino                        → grava o destino e volta a 'registrado'
--   'confirmado' com outro destino   → recusa
create function public.registrar_incorporacao(
  p_event_id integer,
  p_instancia text,
  p_base text,
  p_mapas_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_curador integer;
  v_instancia text;
  v_base text;
  v_mapas_id text;
  v_curadoria text;
  v_vinculo private.vinculos_institucionais;
begin
  -- Autor vem da sessão; desativação vale mesmo com JWT vigente.
  v_curador := public.current_curator();
  if v_curador is null then
    raise exception using
      errcode = '42501',
      message = 'registrar_incorporacao: operador sem vínculo de curador ativo';
  end if;

  v_instancia := btrim(p_instancia);
  v_base := btrim(p_base);
  v_mapas_id := btrim(p_mapas_id);

  if p_event_id is null
    or coalesce(v_instancia, '') = ''
    or coalesce(v_base, '') = ''
    or coalesce(v_mapas_id, '') = ''
  then
    raise exception using
      errcode = '22023',
      message = 'registrar_incorporacao: evento, instância, base e ID no Mapas são obrigatórios';
  end if;

  -- Trava a linha do evento: serializa registros do mesmo evento e impede
  -- que a curadoria mude durante a checagem. Ordem de locks: evento, vínculo.
  select e.curation_status
  into v_curadoria
  from public.events e
  where e.id = p_event_id
  for no key update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'registrar_incorporacao: evento coletado não encontrado';
  end if;

  if v_curadoria <> 'approved' then
    raise exception using
      errcode = '23514',
      message = 'registrar_incorporacao: evento não aprovado na curadoria';
  end if;

  select v.*
  into v_vinculo
  from private.vinculos_institucionais v
  where v.event_id = p_event_id
  for update;

  if not found then
    insert into private.vinculos_institucionais
      (event_id, instancia, base, mapas_id, registrado_por)
    values (p_event_id, v_instancia, v_base, v_mapas_id, v_curador)
    returning * into v_vinculo;
  elsif v_vinculo.estado = 'divergente'
    or (v_vinculo.instancia, v_vinculo.base, v_vinculo.mapas_id)
      is distinct from (v_instancia, v_base, v_mapas_id)
  then
    if v_vinculo.estado = 'confirmado' then
      raise exception using
        errcode = '23505',
        message = 'registrar_incorporacao: vínculo já confirmado não pode ser alterado';
    end if;

    update private.vinculos_institucionais v
    set
      instancia = v_instancia,
      base = v_base,
      mapas_id = v_mapas_id,
      estado = 'registrado',
      registrado_por = v_curador,
      registrado_em = now(),
      verificado_em = null
    where v.id = v_vinculo.id
    returning * into v_vinculo;
  end if;

  return to_jsonb(v_vinculo);
end;
$$;

revoke all on function public.registrar_incorporacao(integer, text, text, text)
from public, anon, authenticated, service_role;

grant execute on function public.registrar_incorporacao(integer, text, text, text)
to authenticated;

-- Resultado da conferência na API da instância, feita pelo worker. Só o
-- servidor chama. Aceita qualquer estado atual: uma nova conferência
-- regrava o resultado e o instante.
create function public.confirmar_incorporacao(p_event_id integer, p_confere boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vinculo private.vinculos_institucionais;
begin
  if p_event_id is null or p_confere is null then
    raise exception using
      errcode = '22023',
      message = 'confirmar_incorporacao: evento e resultado da conferência são obrigatórios';
  end if;

  update private.vinculos_institucionais v
  set
    estado = case when p_confere then 'confirmado' else 'divergente' end,
    verificado_em = now()
  where v.event_id = p_event_id
  returning * into v_vinculo;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'confirmar_incorporacao: evento sem vínculo registrado';
  end if;

  return to_jsonb(v_vinculo);
end;
$$;

revoke all on function public.confirmar_incorporacao(integer, boolean)
from public, anon, authenticated, service_role;

grant execute on function public.confirmar_incorporacao(integer, boolean)
to service_role;
