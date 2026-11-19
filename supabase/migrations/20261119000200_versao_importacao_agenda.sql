-- Preserva a assinatura e a implementação do importador de snapshot.
-- Os importadores novos leem a versão antes de consultar a API externa;
-- a versão é conferida sob bloqueio somente na transação de gravação.
create table private.versao_importacao_agenda (
  fonte text primary key check (fonte = 'mapa-cultural-ce'),
  versao bigint not null default 0
);
alter table private.versao_importacao_agenda enable row level security;
revoke all on private.versao_importacao_agenda from public, anon, authenticated, service_role;
insert into private.versao_importacao_agenda (fonte) values ('mapa-cultural-ce');

create function public.versao_agenda_ce()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select versao from private.versao_importacao_agenda where fonte = 'mapa-cultural-ce'
$$;
revoke all on function public.versao_agenda_ce() from public, anon, authenticated;
grant execute on function public.versao_agenda_ce() to service_role;

alter function public.importar_agenda(text, jsonb) set schema private;
revoke all on function private.importar_agenda(text, jsonb) from public, anon, authenticated, service_role;

create function public.importar_agenda(p_fonte text, p_lote jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
set lock_timeout = '5s'
as $$
declare
  v_versao bigint;
  v_resultado jsonb;
begin
  if p_fonte is distinct from 'mapa-cultural-ce' then
    raise exception using
      errcode = '22023',
      message = 'importar_agenda: fonte não autorizada para snapshot por janela';
  end if;

  select versao into strict v_versao
  from private.versao_importacao_agenda where fonte = p_fonte
  for update;

  -- A ausência da chave mantém compatibilidade com a chamada histórica.
  -- Mesmo esse caminho avança a versão na mesma transação.
  if p_lote ? 'versao_esperada'
    and (p_lote ->> 'versao_esperada')::bigint is distinct from v_versao then
    raise exception using errcode = 'PT409', message = 'importar_agenda: versão da agenda mudou';
  end if;

  v_resultado := private.importar_agenda(p_fonte, p_lote);
  update private.versao_importacao_agenda set versao = v_versao + 1 where fonte = p_fonte;
  return v_resultado;
end;
$$;
revoke all on function public.importar_agenda(text, jsonb) from public, anon, authenticated;
grant execute on function public.importar_agenda(text, jsonb) to service_role;
