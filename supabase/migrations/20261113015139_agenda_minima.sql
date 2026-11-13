-- M1 (docs/PLANO-APP-MOBILE.md): dados mínimos da agenda.
-- Espaços, eventos, datas do evento em espaços e categorias, com leitura pública
-- só do que está publicado. Ninguém escreve pela API: a escrita é do servidor (M7).

create table public.espacos (
  id bigint generated always as identity primary key,
  -- Proveniência: de onde o registro veio e o id estável dele lá.
  fonte text not null,
  id_externo text not null,
  nome text not null,
  descricao text,
  endereco text,
  municipio text,
  latitude double precision,
  longitude double precision,
  -- Recursos de acessibilidade física do espaço, um por item (filtro da agenda).
  acessibilidade_fisica text[] not null default '{}',
  publicado boolean not null default false,
  constraint espacos_fonte_id_externo_key unique (fonte, id_externo),
  -- Coordenada só vale inteira e dentro da faixa; sem localização, as duas ficam nulas.
  -- Os "is not null" são necessários: um CHECK que dá NULL passa, e "between" com nulo dá NULL.
  constraint espacos_coordenadas_check check (
    (latitude is null and longitude is null)
    or (
      latitude is not null and longitude is not null
      and latitude between -90 and 90 and longitude between -180 and 180
    )
  )
);

create table public.eventos (
  id bigint generated always as identity primary key,
  fonte text not null,
  id_externo text not null,
  nome text not null,
  descricao_curta text,
  descricao_longa text,
  classificacao_etaria text,
  imagem_url text,
  publicado boolean not null default false,
  constraint eventos_fonte_id_externo_key unique (fonte, id_externo)
);

-- Uma linha por data em que o evento acontece, no espaço em que acontece.
create table public.eventos_datas (
  id bigint generated always as identity primary key,
  evento_id bigint not null references public.eventos (id) on delete cascade,
  espaco_id bigint references public.espacos (id),
  id_externo text not null,
  inicio timestamptz not null,
  fim timestamptz,
  -- Preço como a fonte escreve ("Gratuito", "R$ 20"); gratuito é nulo quando não dá para saber.
  preco text,
  gratuito boolean,
  constraint eventos_datas_evento_id_externo_key unique (evento_id, id_externo),
  constraint eventos_datas_fim_check check (fim is null or fim >= inicio)
);

-- A agenda filtra e ordena por início; evento_id já é coberto pelo índice único acima.
create index eventos_datas_inicio_idx on public.eventos_datas (inicio);
create index eventos_datas_espaco_id_idx on public.eventos_datas (espaco_id);

create table public.categorias (
  id bigint generated always as identity primary key,
  nome text not null,
  constraint categorias_nome_key unique (nome)
);

create table public.eventos_categorias (
  evento_id bigint not null references public.eventos (id) on delete cascade,
  categoria_id bigint not null references public.categorias (id) on delete cascade,
  primary key (evento_id, categoria_id)
);

create index eventos_categorias_categoria_id_idx on public.eventos_categorias (categoria_id);

-- Privilégios: auto_expose_new_tables = false, então o acesso é dado papel por papel.
revoke all on table
  public.espacos,
  public.eventos,
  public.eventos_datas,
  public.categorias,
  public.eventos_categorias
from anon, authenticated;

grant select on table
  public.espacos,
  public.eventos,
  public.eventos_datas,
  public.categorias,
  public.eventos_categorias
to anon, authenticated;

alter table public.espacos enable row level security;
alter table public.eventos enable row level security;
alter table public.eventos_datas enable row level security;
alter table public.categorias enable row level security;
alter table public.eventos_categorias enable row level security;

create policy espacos_leitura_publica on public.espacos
  for select to anon, authenticated
  using (publicado);

create policy eventos_leitura_publica on public.eventos
  for select to anon, authenticated
  using (publicado);

-- Datas e categorias de um evento aparecem quando o evento está publicado.
create policy eventos_datas_leitura_publica on public.eventos_datas
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.eventos
      where eventos.id = eventos_datas.evento_id and eventos.publicado
    )
  );

create policy eventos_categorias_leitura_publica on public.eventos_categorias
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.eventos
      where eventos.id = eventos_categorias.evento_id and eventos.publicado
    )
  );

-- A lista de categorias é só um vocabulário: pública inteira.
create policy categorias_leitura_publica on public.categorias
  for select to anon, authenticated
  using (true);
